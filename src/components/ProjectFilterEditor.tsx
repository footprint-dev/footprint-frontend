import { useId, useState } from "react";
import { Button } from "./ui";
import type {
  ProjectFilterField,
  ProjectTableFilters,
} from "../lib/table-filters";

export function ProjectFilterEditor({
  field,
  filters,
  onApply,
  onRemove,
  onClose,
}: {
  field: ProjectFilterField;
  filters: ProjectTableFilters;
  onApply: (value: ProjectTableFilters[ProjectFilterField["key"]]) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => String(filters[field.key] ?? ""));
  const [error, setError] = useState("");
  const errorId = useId();
  return (
    <form
      className="point-filter-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const value = draft.trim();
        if (!value) return onApply(undefined);
        if (field.key === "id") {
          const id = Number(value);
          if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) {
            setError("编号必须为正整数");
            event.currentTarget.querySelector("input")?.focus();
            return;
          }
          onApply(id);
        } else onApply(value);
      }}
    >
      <div className="point-filter-body">
        <label className="field">
          <span>{field.label}</span>
          <input
            aria-label={`项目${field.label}`}
            inputMode={field.key === "id" ? "numeric" : "text"}
            placeholder={field.key === "id" ? "精确编号" : "输入名称关键词"}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
          />
        </label>
        <p className="point-filter-hint">留空表示不限</p>
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
          <Button type="submit" className="button-primary">
            应用
          </Button>
        </div>
      </div>
    </form>
  );
}
