import { GCQuery, GCResponseStats } from "./types";

type Transform = (value: number) => number;
const noop: Transform = (v) => v;

export const getUnit = (query: GCQuery, data: GCResponseStats[]): [string, Transform] => {
  return ["ms", noop];
};
