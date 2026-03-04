import React, { PureComponent } from "react";
import { LegacyForms, Select, Spinner } from "@grafana/ui";
import { QueryEditorProps, SelectableValue } from "@grafana/data";
import { defaults } from "lodash";

import { GCInput } from "./GCInput";
import { defaultQuery } from "../defaults";
import { GCDataSourceOptions, GCQuery } from "../types";
import { DataSource } from "../datasource";

const { FormField } = LegacyForms;

/** Normalize metric to a string (handles SelectableValue-style object from mixed panels/import). */
function normalizeMetric(metric: GCQuery["metric"]): string {
  if (metric === undefined || metric === null) return "avg";
  if (typeof metric === "string") return metric;
  if (typeof metric === "object" && metric !== null && ("value" in metric || "label" in metric)) {
    const m = metric as { value?: string; label?: string };
    if (typeof m.value === "string") return m.value;
    if (typeof m.label === "string") return m.label;
  }
  return "avg";
}

/** Normalize step to a number (handles string from dashboard JSON). */
function normalizeStep(step: GCQuery["step"]): number {
  if (step === undefined || step === null) return 60;
  if (typeof step === "number" && step > 0) return step;
  if (typeof step === "string") {
    const n = parseInt(step, 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return 60;
}

/** True when we should persist default/normalized query so saved panel has primitives. */
function needsDefaultPersist(query: GCQuery | undefined): boolean {
  const q: Partial<GCQuery> = query ?? {};
  if (q.step === undefined || q.step === null || q.step === 0) return true;
  if (q.metric === undefined || q.metric === null) return true;
  if (typeof q.metric === "object") return true;
  if (typeof q.step === "string") return true;
  return false;
}

type Props = QueryEditorProps<DataSource, GCQuery, GCDataSourceOptions>;

interface State {
  appOptions: Array<SelectableValue<number>>;
  loadingApps: boolean;
  error?: string;
}

export class GCQueryEditor extends PureComponent<Props, State> {
  state: State = {
    appOptions: [],
    loadingApps: false,
    error: undefined,
  };

  componentDidMount() {
    this.loadApps();
    this.persistDefaultsIfNeeded();
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.query !== prevProps.query) {
      this.persistDefaultsIfNeeded();
    }
  }

  /** Persist default step/metric and normalize metric/step to primitives so saved panel and backend get consistent shape.
   *  Also trigger a single query run when we first normalize defaults, so a new panel shows data without manual interaction.
   */
  persistDefaultsIfNeeded = () => {
    const { query, onChange, onRunQuery } = this.props;
    if (!onChange || !needsDefaultPersist(query)) {
      return;
    }

    const normalized = {
      ...query,
      ...defaultQuery,
      metric: normalizeMetric(query?.metric),
      step: normalizeStep(query?.step),
    };

    onChange(normalized);

    if (onRunQuery) {
      onRunQuery();
    }
  };

  async loadApps() {
    this.setState({ loadingApps: true, error: undefined });

    try {
      const raw = await this.props.datasource.getResource("fastedge/v1/apps");
      let apps: any[] = [];

      if (Array.isArray(raw)) {
        apps = raw;
      } else if (Array.isArray(raw.apps)) {
        apps = raw.apps;
      }

      const appOptions = [
        { label: "All", value: 0 },
        ...apps.map((app: any) => ({
          label: app.name ?? `App ${app.id}`,
          value: app.id,
        })),
      ];

      this.setState({ appOptions, loadingApps: false });
    } catch {
      this.setState({
        loadingApps: false,
        appOptions: [],
        error: "Failed to load apps (FastEdge API unreachable or invalid API key)",
      });
    }
  }

  onAppChange = (option: SelectableValue<number>) => {
    const { onChange, query, onRunQuery } = this.props;

    const selectedName =
      option.value === 0
        ? "All"
        : this.state.appOptions.find((opt) => opt.value === option.value)?.label;

    onChange({ ...query, id: option.value, appName: selectedName });
    onRunQuery();
  };

  onStepChange = (value: number) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, step: value });
    onRunQuery();
  };

  onNetworkChange = (value: string) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, network: value });
    onRunQuery();
  };

  onMetricChange = (option: SelectableValue<string>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, metric: option.value ?? "avg" });
    onRunQuery();
  };

  render() {
    const query: GCQuery = defaults(this.props.query, defaultQuery);
    const { id = 0, network = "" } = query;
    const step = normalizeStep(query.step);
    const metric = normalizeMetric(query.metric);
    const { appOptions, loadingApps, error } = this.state;

    const metricOptions: Array<SelectableValue<string>> = [
      { label: "avg", value: "avg" },
      { label: "min", value: "min" },
      { label: "max", value: "max" },
      { label: "median", value: "median" },
      { label: "perc75", value: "perc75" },
      { label: "perc90", value: "perc90" },
    ];

    const inputStyle: React.CSSProperties = {
      width: "100%",
      height: "38px",
      padding: "6px 10px",
      fontSize: "14px",
      borderRadius: "4px",
      boxSizing: "border-box",
    };

    const selectedApp = appOptions.find((opt) => opt.value === id) || appOptions[0];
    const selectedMetric = metricOptions.find((opt) => opt.value === metric) || metricOptions[0];

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          width: "100%",
          maxWidth: "420px",
          padding: "12px",
        }}
      >
        <FormField
          label="App Name"
          labelWidth={12}
          inputEl={
            loadingApps ? (
              <Spinner />
            ) : (
              <Select
                options={appOptions}
                value={selectedApp}
                onChange={this.onAppChange}
                placeholder="Select an App"
                width={40}
              />
            )
          }
        />
        {error && <div style={{ color: "red", fontSize: "12px", marginTop: "-10px" }}>{error}</div>}

        <FormField
          label="Metric"
          labelWidth={12}
          inputEl={
            <Select
              options={metricOptions}
              value={selectedMetric}
              onChange={this.onMetricChange}
              placeholder="Select a Metric"
              width={40}
            />
          }
        />

        <FormField
          label="Step"
          labelWidth={12}
          inputEl={
            <GCInput
              type="number"
              value={step.toString()}
              onChange={(val) => this.onStepChange(Number(val))}
              placeholder="Enter step in seconds"
              style={inputStyle}
            />
          }
        />
        <FormField
          label="Network"
          labelWidth={12}
          inputEl={
            <GCInput
              type="text"
              value={network}
              onChange={this.onNetworkChange}
              placeholder="Enter network name"
              style={inputStyle}
            />
          }
        />
      </div>
    );
  }
}
