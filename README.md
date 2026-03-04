# ⚡ Grafana Data Source Plugin for Gcore FastEdge Statistics

[![Build](https://github.com/G-Core/fastedge-datasource-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/G-Core/fastedge-datasource-plugin/actions/workflows/ci.yml)

The **Gcore FastEdge Data Source Plugin** allows you to connect **Grafana** directly to **Gcore's FastEdge Statistics API** — giving you deep insights into edge application performance, latency, and network usage in real time.

---

## 🧠 What is the Gcore FastEdge Grafana Plugin?

**Grafana** provides a powerful way to visualize metrics from multiple data sources such as Prometheus, MySQL, and Datadog.  
The **FastEdge Plugin** extends Grafana to pull performance data directly from the **Gcore FastEdge Statistics API**, enabling you to monitor your edge services with **live charts and dynamic dashboards**.

It's designed for **developers**, **DevOps teams**, and **network engineers** who need **real-time visibility** into edge workloads across global regions.

---

##  Key Features

-  **Real-time performance & usage stats** from Gcore's FastEdge platform  
-  **Filter by App Name** — view specific (optional)
-  **Network-aware insights** — supports multiple networks (optional) 
-  **Flexible granularity (step)** — select any interval for time-series data  
-  **Full Grafana variable support** — build dynamic dashboards easily  
-  **Interactive charts** — instant updates with Grafana's time picker  
-  **Secure API token authentication** — no plain text credentials  

---


## Default parameters

The plugin uses the following defaults when they are not set in the datasource config or panel query:

| Parameter | Default | Source |
|-----------|---------|--------|
| Query **step** (granularity, seconds) | `60` | Query editor / `defaultQuery` |
| Query **metric** | `"avg"` | Query editor / `defaultQuery` |
| API base URL | `https://api.gcore.com` | Datasource config (used when **API URL** is left empty in plugin routes) |
| Variable query step (selector) | `60` | Variable query editor |

Config comes from the datasource instance settings (API URL, API Key) and from `defaultQuery` merged at panel render time for each target. The backend also applies step=60 and metric=avg when values are missing or invalid.

### Multi-datasource panels

Panels can use multiple targets with different datasource instances (e.g. two FastEdge instances or FastEdge and another plugin). A common failure was **query format mismatch**: if one target had `metric` sent as an object (e.g. `{ "value": "avg", "label": "avg" }`) instead of a string, the backend returned `json: cannot unmarshal object into Go struct field GCQueryModel.metric of type string`. The backend now normalizes query JSON (metric as string or object, step as number or string) so mixed-format panels work. If a panel still fails with both datasources, check browser console and Grafana backend logs for the failing RefID and ensure both targets use valid query shapes; the backend accepts and normalizes legacy or hand-edited dashboard JSON.

---

## ⚙️ Configuration

### Add the Data Source

1. In **Grafana**, go to **Connections → Data Sources → Add data source**
2. Search for **FastEdge Stats**  
3. Fill in the configuration fields:
   - **API URL:** `Example.url`
   - **API Key:** your personal or permanent token  
4. Click **Save & Test** to verify the connection

### Example Provisioning (YAML)

If you manage multiple Grafana environments or want to automate provisioning, use this example configuration:

```yaml
apiVersion: 1

datasources:
  - name: FastEdge Stats
    orgId: 1
    type: gcorelabs-fastedge-datasource
    access: proxy
    isDefault: true
    editable: true
    version: 1
    jsonData:
      apiUrl: api.gcore.com
    secureJsonData:
      apiKey: 'apikey 1234$abcdef'
```
---

## 📝 License

This project is licensed under the terms specified in the repository.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

