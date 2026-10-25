import { describe, expect, it } from "vitest";
import type { LocationPoint, Project } from "../src/lib/model";
import {
  filterTablePoints,
  filterTableProjects,
  parseTableFilters,
  TABLE_FILTER_FIELDS,
  tableFilterDraft,
  tableFilterSummary,
} from "../src/lib/table-filters";

describe("project table filtering", () => {
  const projects: Project[] = [
    {
      id: 19,
      name: "West Lake",
      startTime: Date.UTC(2026, 9, 19),
      endTime: Date.UTC(2026, 9, 20),
    },
    {
      id: 119,
      name: "West Hill",
      startTime: Date.UTC(2026, 9, 19),
      endTime: Date.UTC(2026, 9, 20),
    },
    {
      id: 20,
      name: "Route 19",
      startTime: Date.UTC(2026, 9, 19),
      endTime: Date.UTC(2026, 9, 20),
    },
  ];

  it("keeps exact IDs and name keywords separate from each other and dates", () => {
    expect(
      filterTableProjects(projects, { id: 19 }).map((project) => project.id),
    ).toEqual([19]);
    expect(
      filterTableProjects(projects, { name: "19" }).map(
        (project) => project.id,
      ),
    ).toEqual([20]);
    expect(filterTableProjects(projects, { name: "2026" })).toEqual([]);
  });

  it("requires the ID and name conditions to match together", () => {
    expect(
      filterTableProjects(projects, { id: 119, name: " west " }).map(
        (project) => project.id,
      ),
    ).toEqual([119]);
    expect(filterTableProjects(projects, { id: 119, name: "lake" })).toEqual(
      [],
    );
  });
});

function point(id: number, values: Partial<LocationPoint> = {}): LocationPoint {
  return {
    id,
    longitude: 120,
    latitude: 30,
    altitude: 0,
    timestamp: 1000,
    city: "杭州",
    device: "phone",
    quality: {
      status: "retained",
      reason: "accepted",
      version: null,
      checkedAt: null,
      evidence: {},
    },
    ...values,
  };
}

describe("point table filtering", () => {
  it("matches the exact ID without matching digits in other fields", () => {
    const rows = [
      point(19),
      point(119),
      point(24, { altitude: 194.6 }),
      point(42, { longitude: 119.1 }),
    ];
    expect(filterTablePoints(rows, { id: 19 }).map((row) => row.id)).toEqual([
      19,
    ]);
  });

  it("requires city, device and numeric conditions to match together", () => {
    const rows = [
      point(1, { altitude: 100 }),
      point(2, { city: "上海", altitude: 100 }),
      point(3, { device: "watch", altitude: 100 }),
      point(4, { altitude: 99 }),
    ];
    expect(
      filterTablePoints(rows, {
        city: "杭州",
        device: "phone",
        altitude: { min: 100 },
      }).map((row) => row.id),
    ).toEqual([1]);
    expect(filterTablePoints(rows, { city: "北京" })).toEqual([]);
  });

  it("distinguishes missing categories from unrestricted categories", () => {
    const rows = [
      point(1, { city: null, device: "" }),
      point(2, { city: "", device: null }),
      point(3),
    ];
    expect(
      filterTablePoints(rows, { city: null, device: null }).map(
        (row) => row.id,
      ),
    ).toEqual([1, 2]);
    expect(filterTablePoints(rows, {})).toEqual(rows);
  });

  it("uses inclusive raw numeric bounds including zero and negative altitude", () => {
    const rows = [
      point(1, { longitude: 120.1234564, latitude: -1, altitude: -5.5 }),
      point(2, { longitude: 120.123456, latitude: 0, altitude: 0 }),
      point(3, { longitude: 120.1234565, latitude: -1, altitude: -5.5 }),
      point(4, { longitude: 120.123456, latitude: 0.1, altitude: 0 }),
      point(5, { longitude: 120.123456, latitude: -1, altitude: -5.6 }),
    ];
    expect(
      filterTablePoints(rows, {
        longitude: { min: 120.123456, max: 120.1234564 },
        latitude: { max: 0 },
        altitude: { min: -5.5, max: 0 },
      }).map((row) => row.id),
    ).toEqual([1, 2]);
  });
});

describe("table filter summaries", () => {
  it("shows units and one-sided bounds without rounding values", () => {
    const filters = {
      longitude: { min: 120.1234564 },
      latitude: { max: 0 },
      altitude: { min: -5.55, max: 0 },
    };
    expect(
      TABLE_FILTER_FIELDS.map((field) =>
        tableFilterSummary(filters, field),
      ).filter((value) => value !== undefined),
    ).toEqual([">= 120.1234564°", "<= 0°", "-5.55 - 0 m"]);
  });

  it("distinguishes missing categories from inactive filters", () => {
    const filters = { city: null, device: null };
    const fields = TABLE_FILTER_FIELDS.filter(
      (field) => field.key === "city" || field.key === "device",
    );
    expect(fields.map((field) => tableFilterSummary({}, field))).toEqual([
      undefined,
      undefined,
    ]);
    expect(fields.map((field) => tableFilterSummary(filters, field))).toEqual([
      "未记录城市",
      "未知设备",
    ]);
  });
});

describe("table filter input", () => {
  it("preserves exact precision and missing categories when editing filters", () => {
    const filters = {
      id: 19,
      city: null,
      device: "phone",
      altitude: { min: -5.55, max: 0 },
    };
    expect(parseTableFilters(tableFilterDraft(filters))).toEqual({ filters });
  });

  it("treats blank bounds as unrestricted and parses one-sided ranges", () => {
    const draft = tableFilterDraft({});
    draft.longitude.min = " ";
    draft.altitude.max = " -1.25 ";
    expect(parseTableFilters(draft)).toEqual({
      filters: { altitude: { max: -1.25 } },
    });
  });

  it.each(["0", "-1", "1.5", "19abc"])(
    "rejects invalid ID %s without producing applied filters",
    (id) => {
      const result = parseTableFilters({ ...tableFilterDraft({}), id });
      expect(result.filters).toBeUndefined();
      expect(result.errors?.id).toBeDefined();
    },
  );

  it("reports invalid numbers, coordinate limits and reversed ranges", () => {
    const draft = tableFilterDraft({});
    draft.longitude.min = "181";
    draft.latitude.max = "abc";
    draft.altitude = { min: "10", max: "-10" };
    const result = parseTableFilters(draft);
    expect(result.filters).toBeUndefined();
    expect(result.errors).toEqual({
      longitude: "经度必须在 -180 到 180 之间",
      latitude: "请输入有效数字",
      altitude: "最小值不能大于最大值",
    });
  });
});
