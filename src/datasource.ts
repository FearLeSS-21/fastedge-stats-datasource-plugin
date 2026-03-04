import {
  DataSourceInstanceSettings,
} from "@grafana/data";
import { DataSourceWithBackend, getBackendSrv } from "@grafana/runtime";
import { GCDataSourceOptions, GCQuery } from "./types";

export class DataSource extends DataSourceWithBackend<GCQuery, GCDataSourceOptions> {
  instanceSettings: DataSourceInstanceSettings<GCDataSourceOptions>;

  constructor(instanceSettings: DataSourceInstanceSettings<GCDataSourceOptions>) {
    super(instanceSettings);
    this.instanceSettings = instanceSettings;
  }

  async testDatasource() {
    const auth = async (path: string) =>
      getBackendSrv().datasourceRequest({
        method: "GET",
        url: `/api/datasources/proxy/uid/${this.instanceSettings.uid}/${path}`,
        responseType: "json",
      });

    try {
      const r1 = await auth("iam/users/me");
      return {
        status: "success",
        message: `Auth OK (IAM): ${(r1.data as { name?: string })?.name ?? "OK"}`,
      };
    } catch {
      try {
        const r2 = await auth("users/me");
        return {
          status: "success",
          message: `Auth OK: ${(r2.data as { name?: string })?.name ?? "OK"}`,
        };
      } catch (err: any) {
        const msg =
          err?.data?.message ||
          err?.statusText ||
          "Failed to authenticate. Check URL, API key, or network.";
        return { status: "error", message: msg };
      }
    }
  }
}
