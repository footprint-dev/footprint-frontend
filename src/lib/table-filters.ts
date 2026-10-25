import type { LocationPoint, Project } from "./model";

export interface ProjectTableFilters {
  id?: number;
  name?: string;
}

export const PROJECT_FILTER_FIELDS = [
  { key: "id", label: "编号" },
  { key: "name", label: "名称" },
] as const;

export type ProjectFilterField = (typeof PROJECT_FILTER_FIELDS)[number];

export function filterTableProjects(
  projects: Project[],
  filters: ProjectTableFilters,
) {
  const name = filters.name?.trim().toLowerCase();
  return projects.filter(
    (project) =>
      (filters.id === undefined || project.id === filters.id) &&
      (!name || project.name.toLowerCase().includes(name)),
  );
}

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

export const TABLE_FILTER_FIELDS = [
  { key: "city", label: "城市" },
  { key: "device", label: "设备" },
  { key: "id", label: "编号" },
  ...RANGE_FILTERS,
] as const;

export type TableFilterField = (typeof TABLE_FILTER_FIELDS)[number];

export function tableFilterSummary(
  filters: PointTableFilters,
  field: TableFilterField,
): string | undefined {
  if (field.key === "city" || field.key === "device") {
    const value = filters[field.key];
    return value === null
      ? field.key === "city"
        ? "未记录城市"
        : "未知设备"
      : value;
  }
  if (field.key === "id") return filters.id?.toString();
  const range = filters[field.key];
  if (!range || (range.min === undefined && range.max === undefined))
    return undefined;
  const value =
    range.min === undefined
      ? `<= ${range.max}`
      : range.max === undefined
        ? `>= ${range.min}`
        : `${range.min} - ${range.max}`;
  return `${value}${field.unit === "m" ? " m" : field.unit}`;
}

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
