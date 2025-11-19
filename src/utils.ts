import { FieldType, getDisplayProcessor, Labels, MutableField, TIME_SERIES_TIME_FIELD_NAME, TIME_SERIES_VALUE_FIELD_NAME, toDataFrame } from "@grafana/data";
import { GCPoint } from "./types";

export const getTimeField = (data: GCPoint[], isMs = true): MutableField => ({
  name: TIME_SERIES_TIME_FIELD_NAME,
  type: FieldType.time,
  config: {},
  values: data.map((val) => (isMs ? val[0] : val[0] * 1000)),
});

export const getEmptyDataFrame = () =>
  toDataFrame({
    name: "empty",
    fields: [],
  });

export type ValueFieldOptions = {
  data?: GCPoint[];
  valueName?: string;
  labels?: Labels;
  unit?: string;
  decimals?: number;
  displayNameFromDS?: string;
  transform?: (value: number) => number;
};

export const getValueField = ({
  data = [],
  valueName = TIME_SERIES_VALUE_FIELD_NAME,
  decimals = 2,
  labels,
  unit,
  displayNameFromDS,
  transform,
}: ValueFieldOptions): MutableField => ({
  labels,
  name: valueName,
  type: FieldType.number,
  display: getDisplayProcessor(),
  config: {
    unit,
    decimals,
    displayNameFromDS,
    displayName: displayNameFromDS,
  },
  values: data.map((val) => (transform ? transform(val[1]) : val[1])),
});

export interface LabelInfo {
  name: string;
  labels: Labels;
}

export const createLabelInfo = (labels: Labels): LabelInfo => {
  const { metric, ...labelsWithoutMetric } = labels;
  const labelPart = Object.keys(labelsWithoutMetric)
    .map((k) => `${k}=${labelsWithoutMetric[k]}`)
    .join(", ");
  const title = metric ? `${metric} ${labelPart}` : labelPart;
  return { name: title, labels: labelsWithoutMetric };
};

export const getValueVariable = (target: Array<string | number>) =>
  Array.from(new Set(target)).map((text) => ({ text: `${text}` }));
