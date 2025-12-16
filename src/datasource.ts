import {
  DataFrame,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  Field,
  FieldType,
  LoadingState,
  toDataFrame,
} from "@grafana/data";
import { defaults } from "lodash";
import { getBackendSrv } from "@grafana/runtime";
import { GCDataSourceOptions, GCQuery, GCResponseStats, GCAppDuration } from "./types";
import { getEmptyDataFrame } from "./utils";
import { defaultQuery } from "./defaults";

export interface GCDataSourceSettings extends DataSourceInstanceSettings<GCDataSourceOptions> {
  secureJsonData?: { apiKey?: string };
}

export class DataSource extends DataSourceApi<GCQuery, GCDataSourceOptions> {
  url?: string;
  instanceSettings: GCDataSourceSettings;

  constructor(instanceSettings: GCDataSourceSettings) {
    super(instanceSettings);
    this.instanceSettings = instanceSettings;
    this.url = instanceSettings.url;
  }

  private prepareTargets(targets: GCQuery[]): GCQuery[] {
    if (!targets || targets.length === 0) {
      return [defaults({}, defaultQuery)] as GCQuery[];
    }
    return targets.map((q) => defaults(q, defaultQuery));
  }

  private transform(data: GCAppDuration[], query: GCQuery): DataFrame {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return getEmptyDataFrame();
    }

    const valid = data.filter((d) => d.time != null);
    if (valid.length === 0) {
      return getEmptyDataFrame();
    }

    const fields: Field[] = [];

    fields.push({
      name: "Time",
      type: FieldType.time,
      values: valid.map((d) => new Date(d.time).getTime()),
      config: {},
    });

    const stats = ["avg", "min", "max", "median", "perc75", "perc90"];
    for (const s of stats) {
      fields.push({
        name: s,
        type: FieldType.number,
        values: valid.map((d) => d[s as keyof GCAppDuration] ?? null),
        config: { custom: { drawStyle: "lines+points" } },
      });
    }

    return toDataFrame({ fields, refId: query.refId });
  }

  private toRFC3339WithMs(date: Date): string {
    return date.toISOString();
  }

  private getAuthHeader(): string {
    const apiKey = this.instanceSettings.secureJsonData?.apiKey ?? "";
    return apiKey.startsWith("apikey ") ? apiKey : `apikey ${apiKey}`;
  }

  private async doRequest(query: GCQuery, options: DataQueryRequest<GCQuery>): Promise<{ data: GCResponseStats }> {
    const { range } = options;

    const from = this.toRFC3339WithMs(new Date(query.from ?? range.from));
    const to = this.toRFC3339WithMs(new Date(query.to ?? range.to));
    const params: any = { from, to, step: query.step ?? 60 };

    if (query.id) params.id = query.id;
    if (query.network && query.network.trim() !== "") params.network = query.network;

    const authHeader = this.getAuthHeader();

    try {
      return await getBackendSrv().datasourceRequest({
        method: "GET",
        url: `${this.url}/fastedge/v1/stats/app_duration`,
        params,
        responseType: "json",
        headers: { Authorization: authHeader },
      });
    } catch (err: any) {
      const message =
        err?.data?.message ||
        err?.statusText ||
        "Failed to authenticate. Check URL, API key, or network.";
      throw new Error(message);
    }
  }

  async query(options: DataQueryRequest<GCQuery>): Promise<DataQueryResponse> {
    const targets = this.prepareTargets(options.targets.filter((t) => !t.hide));

    const frames = await Promise.all(
      targets.map(async (q) => {
        try {
          const resp = await this.doRequest(q, options);
          const stats = resp?.data?.stats ?? [];
          return stats.length === 0 ? getEmptyDataFrame() : this.transform(stats, q);
        } catch (e: any) {
          return getEmptyDataFrame(); 
        }
      })
    );

    return {
      data: frames,
      key: options.requestId,
      state: LoadingState.Done,
    };
  }

  async testDatasource() {
    const auth = async (path: string) =>
      getBackendSrv().datasourceRequest({
        method: "GET",
        url: `/api/datasources/proxy/uid/${this.instanceSettings.uid}/${path}`,
        responseType: "json",
        showErrorAlert: true,
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
