# ⚡ Grafana Data Source Plugin for Gcore FastEdge Statistics

[![Build](https://github.com/G-Core/fastedge-datasource-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/G-Core/fastedge-datasource-plugin/actions/workflows/ci.yml)

The **Gcore FastEdge Data Source Plugin** allows you to connect **Grafana** directly to **Gcore's FastEdge Statistics API** — giving you deep insights into edge application performance, latency, and network usage in real time.

---

## 🧠 What is the Gcore FastEdge Grafana Plugin?

**Grafana** provides a powerful way to visualize metrics from multiple data sources such as Prometheus, MySQL, and Datadog.  
The **FastEdge Plugin** extends Grafana to pull performance data directly from the **Gcore FastEdge Statistics API**, enabling you to monitor your edge services with **live charts and dynamic dashboards**.

It's designed for **developers**, **DevOps teams**, and **network engineers** who need **real-time visibility** into edge workloads across global regions.

---

## 🚀 Key Features

- ⚡ **Real-time performance & usage stats** from Gcore's FastEdge platform  
- 🔍 **Filter by App Name** — view specific (optional)
- 🌍 **Network-aware insights** — supports multiple networks (optional) 
- ⏱️ **Flexible granularity (step)** — select any interval for time-series data  
- 🧩 **Full Grafana variable support** — build dynamic dashboards easily  
- 📈 **Interactive charts** — instant updates with Grafana's time picker  
- 🔒 **Secure API token authentication** — no plain text credentials  

---

## 🛠️ Getting Started

### Prerequisites

- Node.js >= 22
- Docker and Docker Compose

### Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the plugin in watch mode:**
   ```bash
   npm run dev
   ```

3. **Start Grafana with the plugin** (in another terminal):
   ```bash
   npm run server
   ```

4. **Access Grafana** at [http://localhost:3000](http://localhost:3000)

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

## 🧪 Testing

- **Unit tests:**
  ```bash
  npm test
  ```

- **End-to-end tests:**
  ```bash
  npm run e2e
  ```

- **Type checking:**
  ```bash
  npm run typecheck
  ```

- **Linting:**
  ```bash
  npm run lint
  ```

---

## 📝 License

This project is licensed under the terms specified in the repository.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please visit the [GitHub Issues](https://github.com/G-Core/fastedge-datasource-plugin/issues) page.