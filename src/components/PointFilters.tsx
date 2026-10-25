import { useId, useMemo, useState, type RefObject } from "react";
import * as Popover from "@radix-ui/react-popover";
import { SlidersHorizontal, X } from "lucide-react";
import { Button, IconButton } from "./ui";
import type { LocationPoint } from "../lib/model";
import {
  RANGE_FILTERS,
  parseTableFilters,
  tableFilterDraft,
  type PointTableFilters,
  type TableFilterErrors,
} from "../lib/table-filters";

function CategoryFilter({
  field,
  points,
  value,
  onChange,
  focusRef,
}: {
  field: "city" | "device";
  points: LocationPoint[];
  value: string | null | undefined;
  onChange: (value: string | null | undefined) => void;
  focusRef?: RefObject<HTMLElement | null>;
}) {
  const label = field === "city" ? "城市" : "设备";
  const missing = field === "city" ? "未记录城市" : "未知设备";
  const options = useMemo(() => {
    const values = new Set(points.map((point) => point[field] || null));
    if (value !== undefined) values.add(value);
    return [...values].sort((a, b) =>
      (a ?? "").localeCompare(b ?? "", "zh-CN"),
    );
  }, [points, field, value]);
  return (
    <label className="field point-category-filter">
      <span>{label}</span>
      <select
        ref={(element) => {
          if (focusRef) focusRef.current = element;
        }}
        value={value === undefined ? "" : JSON.stringify(value)}
        title={value === undefined ? `全部${label}` : (value ?? missing)}
        onChange={(event) =>
          onChange(
            event.target.value === ""
              ? undefined
              : JSON.parse(event.target.value),
          )
        }
      >
        <option value="">全部{label}</option>
        {options.map((option) => (
          <option key={JSON.stringify(option)} value={JSON.stringify(option)}>
            {option ?? missing}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PointFilters({
  points,
  filters,
  onChange,
  mobile,
  focusRef,
}: {
  points: LocationPoint[];
  filters: PointTableFilters;
  onChange: (filters: PointTableFilters) => void;
  mobile: boolean;
  focusRef: RefObject<HTMLElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => tableFilterDraft(filters));
  const [errors, setErrors] = useState<TableFilterErrors>({});
  const id = useId();
  const activeCount = Object.values(filters).filter(
    (value) => value !== undefined,
  ).length;
  const changeOpen = (value: boolean) => {
    if (value) {
      setDraft(tableFilterDraft(filters));
      setErrors({});
    }
    setOpen(value);
  };
  const clear = () => {
    onChange({});
    setOpen(false);
  };
  return (
    <div className="point-filters">
      {!mobile &&
        (["city", "device"] as const).map((field) => (
          <CategoryFilter
            key={field}
            field={field}
            points={points}
            value={filters[field]}
            onChange={(value) => onChange({ ...filters, [field]: value })}
            focusRef={field === "city" ? focusRef : undefined}
          />
        ))}
      <Popover.Root open={open} onOpenChange={changeOpen}>
        <Popover.Trigger asChild>
          <Button
            ref={(element) => {
              if (mobile) focusRef.current = element;
            }}
            className="point-filter-trigger"
            aria-label="筛选位置点"
          >
            <SlidersHorizontal size={14} />
            {mobile ? "筛选" : "更多筛选"}
            {activeCount > 0 && (
              <span className="filter-count">{activeCount}</span>
            )}
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="popover point-filter-popover"
            side="top"
            align="start"
            sideOffset={8}
            collisionPadding={12}
            aria-labelledby={`${id}-title`}
          >
            <div className="popover-heading">
              <h3 id={`${id}-title`}>筛选位置点</h3>
              <Popover.Close asChild>
                <IconButton label="关闭筛选">
                  <X size={16} />
                </IconButton>
              </Popover.Close>
            </div>
            <p className="point-filter-hint">
              同时满足所选条件, 仅筛选表格. 留空表示不限.
            </p>
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                const result = parseTableFilters(draft);
                if (result.errors) {
                  setErrors(result.errors);
                  return;
                }
                onChange(
                  mobile
                    ? result.filters
                    : {
                        ...result.filters,
                        city: filters.city,
                        device: filters.device,
                      },
                );
                setOpen(false);
              }}
            >
              {mobile &&
                (["city", "device"] as const).map((field) => (
                  <CategoryFilter
                    key={field}
                    field={field}
                    points={points}
                    value={draft[field]}
                    onChange={(value) =>
                      setDraft((current) => ({ ...current, [field]: value }))
                    }
                  />
                ))}
              <label className="field">
                <span>编号</span>
                <input
                  inputMode="numeric"
                  aria-label="编号"
                  placeholder="精确编号"
                  value={draft.id}
                  onChange={(event) =>
                    setDraft({ ...draft, id: event.target.value })
                  }
                  aria-invalid={!!errors.id}
                  aria-describedby={errors.id ? `${id}-id-error` : undefined}
                />
                {errors.id && (
                  <span
                    className="filter-error"
                    id={`${id}-id-error`}
                    role="alert"
                  >
                    {errors.id}
                  </span>
                )}
              </label>
              {RANGE_FILTERS.map((field) => (
                <fieldset className="point-range-filter" key={field.key}>
                  <legend>
                    {field.label} ({field.unit})
                  </legend>
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
                          aria-invalid={!!errors[field.key]}
                          aria-describedby={
                            errors[field.key]
                              ? `${id}-${field.key}-error`
                              : undefined
                          }
                        />
                      </label>
                    ))}
                  </div>
                  {errors[field.key] && (
                    <p
                      className="filter-error"
                      id={`${id}-${field.key}-error`}
                      role="alert"
                    >
                      {errors[field.key]}
                    </p>
                  )}
                </fieldset>
              ))}
              <div className="point-filter-actions">
                <Button onClick={clear}>清空筛选</Button>
                <Popover.Close asChild>
                  <Button>取消</Button>
                </Popover.Close>
                <Button type="submit" className="filter-apply">
                  应用
                </Button>
              </div>
            </form>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {activeCount > 0 && (
        <IconButton label="清空表格筛选" onClick={clear}>
          <X size={14} />
        </IconButton>
      )}
    </div>
  );
}
