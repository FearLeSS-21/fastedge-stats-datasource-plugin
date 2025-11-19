import { DataQuery, DataSourceJsonData, SelectableValue } from "@grafana/data";

export { SelectableValue };

type RFC3339String = string;

export interface GCDataSourceOptions extends DataSourceJsonData {
  apiKey?: string;
  apiUrl?: string;
}

export interface GCSecureJsonData {
  apiKey?: string;
}

export interface GCQuery extends DataQuery {
  id?: number;              
  appName?: string;         
  from: RFC3339String;
  to: RFC3339String;
  step: number;
  network?: string;
}

export interface GCAppDuration {
  time: string;
  avg: number;
  min: number;
  max: number;
  median: number;
  perc75: number;
  perc90: number;
  network?: string;
}

export interface GCResponseStats {
  stats: GCAppDuration[];
}

export interface GCVariableQuery {
  selector?: number;
}

export type GCPoint = [number, number];
