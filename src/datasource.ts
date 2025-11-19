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
    if (!data || data.length === 0) {
      return getEmptyDataFrame();
    }

    const validData = data.filter((d) => d.time != null);
    if (validData.length === 0) {
      return getEmptyDataFrame();
    }

    const timePoints = validData.map((d) => new Date(d.time).getTime());
    const fields: Field[] = [];

    fields.push({
      name: "Time",
      type: FieldType.time,
      values: timePoints,
      config: {},
    });

    const stats = ["avg", "min", "max", "median", "perc75", "perc90"];
    for (const stat of stats) {
      const values = validData.map((d) => d[stat as keyof GCAppDuration] ?? null);
      fields.push({
        name: stat,
        type: FieldType.number,
        values,
        config: {
          custom: {
            drawStyle: "lines+points", // ensures both lines and points appear
          },
        },
      });
    }

    return toDataFrame({ fields, refId: query.refId });
  }

  private toRFC3339WithMs(date: Date): string {
    return date.toISOString();
  }

  private async doRequest(
    query: GCQuery,
    options: DataQueryRequest<GCQuery>
  ): Promise<{ data: GCResponseStats }> {
    const { range } = options;
    const id = query.id;
    const from = this.toRFC3339WithMs(new Date(query.from ?? range.from));
    const to = this.toRFC3339WithMs(new Date(query.to ?? range.to));

    const params: Record<string, any> = { from, to, step: query.step ?? 60 };

    if (id !== undefined) {
      params.id = id;
    }

    if (query.network && query.network.trim() !== "") {
      params.network = query.network;
    }

    const apiKey = this.instanceSettings.secureJsonData?.apiKey ?? "";

    return getBackendSrv().datasourceRequest({
      method: "GET",
      url: `${this.url}/fastedge/v1/stats/app_duration`,
      responseType: "json",
      params,
      headers: {
        Authorization: `apikey ${apiKey}`,
      },
    });
  }

  async query(options: DataQueryRequest<GCQuery>): Promise<DataQueryResponse> {
    const targets = this.prepareTargets(options.targets.filter((t) => !t.hide));

    const frames: DataFrame[] = await Promise.all(
      targets.map(async (query) => {
        try {
          const resp = await this.doRequest(query, options);
          const data: GCAppDuration[] = resp?.data?.stats ?? [];
          if (!data || data.length === 0) {
            return getEmptyDataFrame();
          }
          return this.transform(data, query);
        } catch (e) {
          console.error("Query error:", e);
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

  async testDatasource(): Promise<{ status: string; message: string }> {
    try {
      const now = new Date();
      const from = this.toRFC3339WithMs(new Date(now.getTime() - 12 * 3600 * 1000));
      const to = this.toRFC3339WithMs(now);
      const apiKey = this.instanceSettings.secureJsonData?.apiKey ?? "";

      const resp = await getBackendSrv().datasourceRequest({
        method: "GET",
        url: `${this.url}/fastedge/v1/stats/app_duration`,
        responseType: "json",
        params: { from, to, step: 60 },
        headers: { Authorization: `apikey ${apiKey}` },
      });

      return resp?.status === 200
        ? { status: "success", message: "Successfully connected to FastEdge API." }
        : { status: "error", message: `Connection failed: ${resp.status} ${resp.statusText}` };
    } catch (e: any) {
      const message = e?.data?.message || e?.statusText || "Connection failed.";
      return { status: "error", message };
    }
  }
}
