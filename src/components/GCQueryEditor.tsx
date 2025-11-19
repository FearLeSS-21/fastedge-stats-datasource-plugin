import React, { PureComponent } from "react";
import { LegacyForms, Select, Spinner } from "@grafana/ui";
import { QueryEditorProps, SelectableValue } from "@grafana/data";
import { defaults } from "lodash";

import { GCInput } from "./GCInput";
import { defaultQuery } from "../defaults";
import { GCDataSourceOptions, GCQuery } from "../types";
import { DataSource } from "../datasource";
import { getBackendSrv } from "@grafana/runtime";

const { FormField } = LegacyForms;

type Props = QueryEditorProps<DataSource, GCQuery, GCDataSourceOptions>;

interface State {
  appOptions: Array<SelectableValue<number>>;
  loadingApps: boolean;
  networkOptions: Array<SelectableValue<string>>;
}

export class GCQueryEditor extends PureComponent<Props, State> {
  state: State = {
    appOptions: [],
    loadingApps: false,
    networkOptions: [],
  };

  componentDidMount() {
    this.loadApps();
    this.loadNetworks(); // optional network dropdown
  }

  async loadApps() {
    this.setState({ loadingApps: true });
    try {
      const url = `${this.props.datasource.url}/fastedge/v1/apps`;
      const apiKey = this.props.datasource.instanceSettings.secureJsonData?.apiKey ?? "";

      const response = await getBackendSrv().datasourceRequest({
        method: "GET",
        url,
        headers: { Authorization: `apikey ${apiKey}` },
      });

      const rawData = response?.data;
      const apps: any[] = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as any)?.apps)
        ? (rawData as any).apps
        : [];

      const appOptions = apps.map((app: any) => ({
        label: app.name ?? `App ${app.id}`,
        value: app.id,
      }));

      this.setState({ appOptions, loadingApps: false });
    } catch (error) {
      console.error("Failed to load apps:", error);
      this.setState({ appOptions: [], loadingApps: false });
    }
  }

  async loadNetworks() {
    try {
      const url = `${this.props.datasource.url}/fastedge/v1/networks`;
      const apiKey = this.props.datasource.instanceSettings.secureJsonData?.apiKey ?? "";

      const response = await getBackendSrv().datasourceRequest({
        method: "GET",
        url,
        headers: { Authorization: `apikey ${apiKey}` },
      });

      const rawData = response?.data;
      const networks: any[] = Array.isArray(rawData) ? rawData : [];

      const networkOptions = networks.map((n: string) => ({ label: n, value: n }));
      this.setState({ networkOptions });
    } catch (error) {
      console.error("Failed to load networks:", error);
      this.setState({ networkOptions: [] });
    }
  }

  onAppChange = (option: SelectableValue<number>) => {
    const { onChange, query, onRunQuery } = this.props;
    const selectedName = this.state.appOptions.find((opt) => opt.value === option.value)?.label;
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
    const { appOptions, loadingApps, networkOptions } = this.state;

    const inputStyle: React.CSSProperties = {
      width: "100%",
      height: "38px",
      padding: "6px 10px",
      fontSize: "14px",
      borderRadius: "4px",
      boxSizing: "border-box",
    };

    const selectedApp = appOptions.find((opt) => opt.value === id);
    const selectedNetwork = networkOptions.find((opt) => opt.value === network);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", maxWidth: "420px", padding: "12px" }}>
        {/* App Name */}
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

        {/* Step */}
        <FormField
          label="Step"
          tooltip="Time series step in seconds"
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

        {/* Network */}
        <FormField
          label="Network"
          tooltip="Optional network filter"
          labelWidth={12}
          inputEl={
            networkOptions.length > 0 ? (
              <Select
                options={networkOptions}
                value={selectedNetwork}
                onChange={(opt) => this.onNetworkChange(opt.value ?? "")}
                placeholder="Select network"
                width={40}
              />
            ) : (
              <GCInput
                type="text"
                value={network}
                onChange={this.onNetworkChange}
                placeholder="Enter network name"
                style={inputStyle}
              />
            )
          }
        />
      </div>
    );
  }
}
