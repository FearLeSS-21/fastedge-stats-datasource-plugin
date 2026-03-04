package main

type GCQueryModel struct {
	ID      int64  `json:"id,omitempty"`
	AppName string `json:"appName,omitempty"`
	From    string `json:"from"`
	To      string `json:"to"`
	Step    int64  `json:"step"`
	Network string `json:"network,omitempty"`
	Metric  string `json:"metric,omitempty"`
}

type GCAppDuration struct {
	Time    string  `json:"time"`
	Avg     float64 `json:"avg"`
	Min     float64 `json:"min"`
	Max     float64 `json:"max"`
	Median  float64 `json:"median"`
	Perc75  float64 `json:"perc75"`
	Perc90  float64 `json:"perc90"`
	Network string  `json:"network,omitempty"`
}

type GCResponseStats struct {
	Stats []GCAppDuration `json:"stats"`
}

type IAMUser struct {
	Name string `json:"name"`
}
