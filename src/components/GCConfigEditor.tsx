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
      apiKey: secureJsonData?.apiKey ? secureJsonData.apiKey.replace(/^apikey\s*/, "") : "",
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
  };

  onApiKeyBlur = () => {
    const { onOptionsChange, options } = this.props;
    const rawKey = this.state.apiKey.trim();
    const apiKey = rawKey.startsWith("apikey ") ? rawKey : `apikey ${rawKey}`;
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
        <Legend>HTTP</Legend>
        <div className="gf-form-group">
          <FormField
            label="URL"
            labelWidth={8}
            inputWidth={20}
            placeholder="API base URL"
            value={apiUrl}
            onChange={this.onApiUrlChange}
            required
          />
        </div>
        <div className="gf-form-group">
          <SecretFormField
            isConfigured={!!isConfigured}
            label="API Key"
            placeholder="Secure field"
            labelWidth={8}
            inputWidth={20}
            value={apiKey}
            onChange={this.onApiKeyChange}
            onBlur={this.onApiKeyBlur}
            onReset={this.onResetApiKey}
          />
        </div>
        <div className="gf-form-group">
          <Alert severity={"info"} title="How to create an API token?">
            <a
              href="https://gcore.com/docs/account-settings/create-use-or-delete-a-permanent-api-token"
              target="_blank"
              rel="noreferrer"
            >
              https://gcore.com/docs/account-settings/create-use-or-delete-a-permanent-api-token
            </a>
          </Alert>
        </div>
      </>
    );
  }
}
