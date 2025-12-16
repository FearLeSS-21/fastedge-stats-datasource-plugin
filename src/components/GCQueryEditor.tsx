import React, { PureComponent } from "react";
import { LegacyForms, Select, Spinner } from "@grafana/ui";
import { QueryEditorProps, SelectableValue } from "@grafana/data";
import { defaults } from "lodash";

import { GCInput } from "./GCInput";
import { defaultQuery } from "../defaults";
import { GCDataSourceOptions, GCQuery } from "../types";
import { DataSource } from "../datasource";

const { FormField } = LegacyForms;

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
  }

  async loadApps() {
    this.setState({ loadingApps: true, error: undefined });

    try {
      const url = `${this.props.datasource.url}/fastedge/v1/apps`;
      let apiKey = this.props.datasource.instanceSettings.secureJsonData?.apiKey ?? "";
      apiKey = apiKey.startsWith("apikey ") ? apiKey : `apikey ${apiKey}`;
      const { getBackendSrv } = await import("@grafana/runtime");

      const response = await getBackendSrv().datasourceRequest({
        method: "GET",
        url,
        headers: { Authorization: apiKey },
      });

      const raw: any = response?.data ?? {};
      let apps: any[] = [];

      if (Array.isArray(raw)) {
        apps = raw;
      } else if (Array.isArray(raw.apps)) {
        apps = raw.apps;
      }

      // Add "All" option at the top
      const appOptions = [
        { label: "All", value: 0 }, // value 0 represents "All apps"
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

  render() {
    const query: GCQuery = defaults(this.props.query, defaultQuery);
    const { id = 0, step = 60, network = "" } = query;
    const { appOptions, loadingApps, error } = this.state;

    const inputStyle: React.CSSProperties = {
      width: "100%",
      height: "38px",
      padding: "6px 10px",
      fontSize: "14px",
      borderRadius: "4px",
      boxSizing: "border-box",
    };

    const selectedApp = appOptions.find((opt) => opt.value === id) || appOptions[0];

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
