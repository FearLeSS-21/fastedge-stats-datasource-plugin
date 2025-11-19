import React, { PureComponent, ChangeEvent } from "react";
import { Legend, LegacyForms, Alert } from "@grafana/ui";
import { DataSourcePluginOptionsEditorProps } from "@grafana/data";
import { GCDataSourceOptions, GCSecureJsonData } from "../types";

const { FormField, SecretFormField } = LegacyForms;

interface Props extends DataSourcePluginOptionsEditorProps<GCDataSourceOptions> {}
interface State {
  apiKey: string;
  apiUrl: string;
}

export class GCConfigEditor extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    const secureJsonData = props.options.secureJsonData as GCSecureJsonData;
    const jsonData = props.options.jsonData as GCDataSourceOptions;
    this.state = {
      apiKey: secureJsonData?.apiKey || "",
      apiUrl: jsonData?.apiUrl || "",
    };
  }

  onApiUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    const apiUrl = e.target.value;
    this.setState({ apiUrl });
    const { onOptionsChange, options } = this.props;
    onOptionsChange({ ...options, jsonData: { ...options.jsonData, apiUrl } });
  };

  onApiKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    const apiKey = e.target.value;
    this.setState({ apiKey });
    const { onOptionsChange, options } = this.props;
    onOptionsChange({ ...options, secureJsonData: { ...options.secureJsonData, apiKey } });
  };

  onResetApiKey = () => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonFields: { ...options.secureJsonFields, apiKey: false },
      secureJsonData: { ...options.secureJsonData, apiKey: "" },
    });
    this.setState({ apiKey: "" });
  };

  render() {
    const { options } = this.props;
    const { apiKey, apiUrl } = this.state;
    const isConfigured = options.secureJsonFields?.apiKey;

    return (
      <>
        <Legend>FastEdge API Settings</Legend>
        <div className="gf-form-group">
          <FormField
            label="API URL"
            labelWidth={8}
            inputWidth={20}
            placeholder="https://api.gcore.com"
            value={apiUrl}
            onChange={this.onApiUrlChange}
            required
          />
        </div>
        <div className="gf-form-group">
          <SecretFormField
            isConfigured={!!isConfigured}
            label="API Key"
            placeholder="Enter your permanent API token"
            labelWidth={8}
            inputWidth={20}
            value={apiKey}
            onChange={this.onApiKeyChange}
            onReset={this.onResetApiKey}
          />
        </div>
        <Alert severity="info" title="FastEdge GET API Reference">
          <p>
            You can find more details about the FastEdge Execution Duration Statistics endpoint here:
          </p>
          <a
            href="https://gcore.com/docs/api-reference/fastedge/stats/execution-duration-statistics"
            target="_blank"
            rel="noreferrer"
          >
            https://gcore.com/docs/api-reference/fastedge/stats/execution-duration-statistics
          </a>
        </Alert>
      </>
    );
  }
}
