import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LocationPoint } from "../lib/model";
import {
  parseTableFilters,
  tableFilterDraft,
  type PointTableFilters,
  type TableFilterField,
} from "../lib/table-filters";
import { Button } from "./ui";

function CategoryOptions({
  field,
  points,
  applied,
  value,
  onChange,
}: {
  field: "city" | "device";
  points: LocationPoint[];
  applied: string | null | undefined;
  value: string | null | undefined;
  onChange: (value: string | null | undefined) => void;
}) {
  const name = useId();
  const optionsRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => {
    const values = new Set(points.map((point) => point[field] || null));
    if (applied !== undefined) values.add(applied);
    if (value !== undefined) values.add(value);
    return [
      undefined,
      ...[...values].sort((a, b) => (a ?? "").localeCompare(b ?? "", "zh-CN")),
    ];
  }, [points, field, applied, value]);
  useLayoutEffect(() => {
    const list = optionsRef.current;
    const scrollArea = list?.closest<HTMLElement>(".point-filter-body");
    const selected = list
      ?.querySelector("input:checked")
      ?.closest<HTMLElement>("label");
    if (!list || !scrollArea || !selected) return;

    // Popover placement can resize the editor after focus has been assigned.
    // Scroll only its body, keeping the page and outer dialog in place.
    const observer = new ResizeObserver(() => {
      const optionBounds = selected.getBoundingClientRect();
      const scrollBounds = scrollArea.getBoundingClientRect();
      if (optionBounds.top < scrollBounds.top)
        scrollArea.scrollTop += optionBounds.top - scrollBounds.top;
      else if (optionBounds.bottom > scrollBounds.bottom)
        scrollArea.scrollTop += optionBounds.bottom - scrollBounds.bottom;
    });
    observer.observe(scrollArea);
    observer.observe(list);
    return () => observer.disconnect();
  }, [value]);
  const missing = field === "city" ? "未记录城市" : "未知设备";
  return (
    <div
      ref={optionsRef}
      className="point-filter-options"
      role="radiogroup"
      aria-label={field === "city" ? "城市" : "设备"}
    >
      {options.map((option) => (
        <label
          className="point-filter-option"
          key={option === undefined ? "all" : JSON.stringify(option)}
        >
          <input
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span
            className={field === "device" ? "filter-device-name" : undefined}
          >
            {option === undefined ? "不限" : (option ?? missing)}
          </span>
        </label>
      ))}
    </div>
  );
}

export function PointFilterEditor({
  field,
  filters,
  points,
  onApply,
  onRemove,
  onClose,
}: {
  field: TableFilterField;
  filters: PointTableFilters;
  points: LocationPoint[];
  onApply: (value: PointTableFilters[TableFilterField["key"]]) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => tableFilterDraft(filters));
  const [error, setError] = useState("");
  const errorId = useId();
  const category = field.key === "city" || field.key === "device";
  return (
    <form
      className="point-filter-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const result = parseTableFilters({
          ...tableFilterDraft({}),
          [field.key]: draft[field.key],
        });
        if (result.errors) {
          setError(Object.values(result.errors)[0]);
          event.currentTarget.querySelector("input")?.focus();
          return;
        }
        onApply(result.filters[field.key]);
      }}
    >
      <div className="point-filter-body">
        {field.key === "city" || field.key === "device" ? (
          <CategoryOptions
            field={field.key}
            points={points}
            applied={filters[field.key]}
            value={draft[field.key]}
            onChange={(value) => setDraft({ ...draft, [field.key]: value })}
          />
        ) : field.key === "id" ? (
          <label className="field">
            <span>编号</span>
            <input
              inputMode="numeric"
              placeholder="精确编号"
              value={draft.id}
              onChange={(event) =>
                setDraft({ ...draft, id: event.target.value })
              }
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
            />
          </label>
        ) : (
          <div className="point-range-inputs">
            {(["min", "max"] as const).map((bound) => (
              <label className="field" key={bound}>
                <span>{bound === "min" ? "最小值" : "最大值"}</span>
                <input
                  aria-label={`${field.label}${bound === "min" ? "最小值" : "最大值"}`}
                  placeholder="不限"
                  value={draft[field.key][bound]}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      [field.key]: {
                        ...draft[field.key],
                        [bound]: event.target.value,
                      },
                    })
                  }
                  aria-invalid={!!error}
                  aria-describedby={error ? errorId : undefined}
                />
              </label>
            ))}
          </div>
        )}
        {!category && (
          <p className="point-filter-hint">
            {field.key === "id" ? "留空表示不限" : "任意一侧留空表示不限"}
          </p>
        )}
        {error && (
          <p className="filter-error" id={errorId} role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="point-filter-actions">
        {filters[field.key] !== undefined && (
          <Button className="point-filter-remove" onClick={onRemove}>
            移除条件
          </Button>
        )}
        <div className="point-filter-submit">
          <Button onClick={onClose}>取消</Button>
          <Button type="submit" className="filter-apply">
            应用
          </Button>
        </div>
      </div>
    </form>
  );
}
