import type { LocationPoint } from "./model";

interface NumberRange {
  min?: number;
  max?: number;
}

export interface PointTableFilters {
  id?: number;
  city?: string | null;
  device?: string | null;
  longitude?: NumberRange;
  latitude?: NumberRange;
  altitude?: NumberRange;
}

export const RANGE_FILTERS = [
  { key: "longitude", label: "经度", unit: "°", min: -180, max: 180 },
  { key: "latitude", label: "纬度", unit: "°", min: -90, max: 90 },
  { key: "altitude", label: "海拔", unit: "m", min: -Infinity, max: Infinity },
] as const;

type RangeField = (typeof RANGE_FILTERS)[number]["key"];
export type TableFilterErrors = Partial<Record<"id" | RangeField, string>>;
export interface TableFilterDraft {
  id: string;
  city?: string | null;
  device?: string | null;
  longitude: { min: string; max: string };
  latitude: { min: string; max: string };
  altitude: { min: string; max: string };
}

export function tableFilterDraft(filters: PointTableFilters): TableFilterDraft {
  const range = (value?: NumberRange) => ({
    min: value?.min === undefined ? "" : String(value.min),
    max: value?.max === undefined ? "" : String(value.max),
  });
  return {
    id: filters.id === undefined ? "" : String(filters.id),
    city: filters.city,
    device: filters.device,
    longitude: range(filters.longitude),
    latitude: range(filters.latitude),
    altitude: range(filters.altitude),
  };
}

export function parseTableFilters(
  draft: TableFilterDraft,
):
  | { filters: PointTableFilters; errors?: never }
  | { filters?: never; errors: TableFilterErrors } {
  const filters: PointTableFilters = { city: draft.city, device: draft.device };
  const errors: TableFilterErrors = {};
  const id = draft.id.trim();
  if (id) {
    const value = Number(id);
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(value) || value <= 0)
      errors.id = "编号必须为正整数";
    else filters.id = value;
  }
  for (const field of RANGE_FILTERS) {
    const lower = draft[field.key].min.trim();
    const upper = draft[field.key].max.trim();
    if (!lower && !upper) continue;
    const min = lower ? Number(lower) : undefined;
    const max = upper ? Number(upper) : undefined;
    const values = [min, max].filter((value) => value !== undefined);
    if (values.some((value) => !Number.isFinite(value)))
      errors[field.key] = "请输入有效数字";
    else if (values.some((value) => value < field.min || value > field.max))
      errors[field.key] =
        `${field.label}必须在 ${field.min} 到 ${field.max} 之间`;
    else if (min !== undefined && max !== undefined && min > max)
      errors[field.key] = "最小值不能大于最大值";
    else filters[field.key] = { min, max };
  }
  return Object.keys(errors).length ? { errors } : { filters };
}

export function filterTablePoints(
  points: LocationPoint[],
  filters: PointTableFilters,
) {
  return points.filter(
    (point) =>
      (filters.id === undefined || point.id === filters.id) &&
      (filters.city === undefined || (point.city || null) === filters.city) &&
      (filters.device === undefined ||
        (point.device || null) === filters.device) &&
      RANGE_FILTERS.every(({ key }) => {
        const range = filters[key];
        return (
          !range ||
          ((range.min === undefined || point[key] >= range.min) &&
            (range.max === undefined || point[key] <= range.max))
        );
      }),
  );
}
