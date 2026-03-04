package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

var allowedMetrics = map[string]bool{
	"avg": true, "min": true, "max": true, "median": true, "perc75": true, "perc90": true,
}

type GCDataSource struct {
	URL    string
	APIKey string
	Client *http.Client
}

func NewDataSource(url, apiKey string) *GCDataSource {
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		url = "https://" + url
	}
	url = strings.TrimSuffix(url, "/")

	return &GCDataSource{
		URL:    url,
		APIKey: apiKey,
		Client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (ds *GCDataSource) setHeaders(req *http.Request) {
	req.Header.Set("Content-Type", "application/json")
	if ds.APIKey != "" {
		if strings.HasPrefix(ds.APIKey, "apikey ") || strings.HasPrefix(ds.APIKey, "Bearer ") {
			req.Header.Set("Authorization", ds.APIKey)
		} else {
			req.Header.Set("Authorization", "apikey "+ds.APIKey)
		}
	}
}

func (ds *GCDataSource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	resp := backend.NewQueryDataResponse()
	for _, q := range req.Queries {
		resp.Responses[q.RefID] = ds.query(ctx, q)
	}
	return resp, nil
}

func normalizeQuery(raw []byte) (*GCQueryModel, error) {
	var rawMap map[string]interface{}
	if err := json.Unmarshal(raw, &rawMap); err != nil {
		return nil, err
	}
	qm := &GCQueryModel{}
	if v, ok := rawMap["id"]; ok && v != nil {
		switch n := v.(type) {
		case float64:
			qm.ID = int64(n)
		case int:
			qm.ID = int64(n)
		}
	}
	if v, ok := rawMap["appName"]; ok && v != nil {
		if s, ok := v.(string); ok {
			qm.AppName = s
		}
	}
	if v, ok := rawMap["from"]; ok && v != nil {
		if s, ok := v.(string); ok {
			qm.From = s
		}
	}
	if v, ok := rawMap["to"]; ok && v != nil {
		if s, ok := v.(string); ok {
			qm.To = s
		}
	}
	if v, ok := rawMap["network"]; ok && v != nil {
		if s, ok := v.(string); ok {
			qm.Network = s
		}
	}
	if v, ok := rawMap["step"]; ok && v != nil {
		switch n := v.(type) {
		case float64:
			qm.Step = int64(n)
		case int:
			qm.Step = int64(n)
		case string:
			if parsed, err := strconv.ParseInt(n, 10, 64); err == nil {
				qm.Step = parsed
			}
		}
	}
	if qm.Step == 0 {
		qm.Step = 60
	}
	if v, ok := rawMap["metric"]; ok && v != nil {
		switch m := v.(type) {
		case string:
			qm.Metric = m
		case map[string]interface{}:
			if val, ok := m["value"]; ok && val != nil {
				if s, ok := val.(string); ok {
					qm.Metric = s
				}
			}
			if qm.Metric == "" {
				if label, ok := m["label"]; ok && label != nil {
					if s, ok := label.(string); ok {
						qm.Metric = s
					}
				}
			}
		default:
			qm.Metric = "avg"
		}
	}
	if !allowedMetrics[qm.Metric] {
		qm.Metric = "avg"
	}
	return qm, nil
}

func (ds *GCDataSource) query(ctx context.Context, query backend.DataQuery) backend.DataResponse {
	response := backend.DataResponse{}

	qm, err := normalizeQuery(query.JSON)
	if err != nil {
		response.Error = err
		return response
	}

	stats, err := ds.fetchStats(ctx, query, qm)
	if err != nil {
		response.Error = err
		return response
	}

	response.Frames = transformStatsToFrames(stats, query.RefID, qm)
	return response
}

func (ds *GCDataSource) fetchStats(ctx context.Context, query backend.DataQuery, qm *GCQueryModel) (*GCResponseStats, error) {

	baseURL := strings.TrimSuffix(ds.URL, "/")
	reqURL := baseURL + "/fastedge/v1/stats/app_duration"

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}

	q := req.URL.Query()
	q.Add("from", query.TimeRange.From.UTC().Format(time.RFC3339))
	q.Add("to", query.TimeRange.To.UTC().Format(time.RFC3339))

	step := qm.Step
	if step == 0 {
		step = 60
	}
	q.Add("step", fmt.Sprintf("%d", step))

	if qm.ID != 0 {
		q.Add("id", fmt.Sprintf("%d", qm.ID))
	}
	if qm.Network != "" {
		q.Add("network", qm.Network)
	}

	req.URL.RawQuery = q.Encode()

	ds.setHeaders(req)

	resp, err := ds.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if err := handleAPIError(resp.StatusCode, raw); err != nil {
		return nil, err
	}

	var out GCResponseStats
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}

	return &out, nil
}

func handleAPIError(statusCode int, body []byte) error {
	if statusCode == http.StatusOK {
		return nil
	}

	errorMsg := strings.TrimSpace(string(body))

	switch statusCode {
	case http.StatusBadRequest:
		return fmt.Errorf("bad request (400): %s", errorMsg)
	case http.StatusUnauthorized:
		return fmt.Errorf("datasource authentication error: invalid API key. Please verify your credentials in the datasource settings")
	case http.StatusForbidden:
		return fmt.Errorf("forbidden (403): access denied")
	case http.StatusNotFound:
		return fmt.Errorf("not found (404): resource not found")
	case http.StatusTooManyRequests:
		return fmt.Errorf("too many requests (429): rate limit exceeded")
	}

	if statusCode >= 500 {
		return fmt.Errorf("server error (%d): %s", statusCode, errorMsg)
	}

	return fmt.Errorf("gcore api error (%d): %s", statusCode, errorMsg)
}

func (ds *GCDataSource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	reqHTTP, err := http.NewRequestWithContext(ctx, http.MethodGet, ds.URL+"/iam/users/me", nil)
	if err != nil {
		return &backend.CheckHealthResult{Status: backend.HealthStatusError, Message: err.Error()}, nil
	}

	ds.setHeaders(reqHTTP)

	resp, err := ds.Client.Do(reqHTTP)
	if err != nil {
		return &backend.CheckHealthResult{Status: backend.HealthStatusError, Message: err.Error()}, nil
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return &backend.CheckHealthResult{Status: backend.HealthStatusError, Message: err.Error()}, nil
	}

	if err := handleAPIError(resp.StatusCode, raw); err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: err.Error(),
		}, nil
	}

	var user IAMUser
	if err := json.Unmarshal(raw, &user); err != nil {
		return &backend.CheckHealthResult{Status: backend.HealthStatusError, Message: err.Error()}, nil
	}

	name := "Unknown"
	if user.Name != "" {
		name = user.Name
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: fmt.Sprintf("Auth OK (IAM): %s", name),
	}, nil
}

func (ds *GCDataSource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	if req.Path == "fastedge/v1/apps" {
		reqURL := ds.URL + "/fastedge/v1/apps"
		httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
		if err != nil {
			return err
		}

		ds.setHeaders(httpReq)

		resp, err := ds.Client.Do(httpReq)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return err
		}

		return sender.Send(&backend.CallResourceResponse{
			Status: resp.StatusCode,
			Body:   body,
		})
	}

	return sender.Send(&backend.CallResourceResponse{
		Status: http.StatusNotFound,
	})
}

func transformStatsToFrames(response *GCResponseStats, refID string, qm *GCQueryModel) []*data.Frame {
	if response == nil || len(response.Stats) == 0 {
		return nil
	}

	n := len(response.Stats)
	times := make([]time.Time, n)
	avgs := make([]*float64, n)
	mins := make([]*float64, n)
	maxs := make([]*float64, n)
	medians := make([]*float64, n)
	perc75s := make([]*float64, n)
	perc90s := make([]*float64, n)

	for i, s := range response.Stats {
		t, err := time.Parse(time.RFC3339, s.Time)
		if err == nil {
			times[i] = t
		}
		vAvg := s.Avg
		avgs[i] = &vAvg
		vMin := s.Min
		mins[i] = &vMin
		vMax := s.Max
		maxs[i] = &vMax
		vMed := s.Median
		medians[i] = &vMed
		v75 := s.Perc75
		perc75s[i] = &v75
		v90 := s.Perc90
		perc90s[i] = &v90
	}

	baseLabels := data.Labels{}
	if qm != nil {
		if qm.AppName != "" {
			baseLabels["app"] = qm.AppName
		}
		if qm.ID != 0 {
			baseLabels["id"] = fmt.Sprintf("%d", qm.ID)
		}
		if qm.Network != "" {
			baseLabels["network"] = qm.Network
		}
	}

	metricName := qm.Metric
	if metricName == "" {
		metricName = "avg"
	}

	var values interface{}
	switch metricName {
	case "min":
		values = mins
	case "max":
		values = maxs
	case "median":
		values = medians
	case "perc75":
		values = perc75s
	case "perc90":
		values = perc90s
	default:
		values = avgs
	}

	lbls := baseLabels.Copy()
	lbls["metric"] = metricName

	legendName := metricName
	if qm != nil && qm.AppName != "" {
		if qm.AppName == "All" {
			legendName = qm.AppName
		} else {
			legendName = fmt.Sprintf("%s %s", qm.AppName, metricName)
		}
	}

	frame := data.NewFrame(refID,
		data.NewField("Time", nil, times),
		data.NewField(legendName, lbls, values),
	)
	frame.Name = legendName
	frame.SetMeta(&data.FrameMeta{Type: data.FrameTypeTimeSeriesMulti})

	if len(frame.Fields) > 1 {
		frame.Fields[1].SetConfig(&data.FieldConfig{Unit: "none"})
	}
	

	return []*data.Frame{frame}
}
