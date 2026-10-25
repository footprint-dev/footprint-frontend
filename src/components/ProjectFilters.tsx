import type { ReactNode, RefObject } from "react";
import { Hash, Type } from "lucide-react";
import { FilterToolbar } from "./FilterToolbar";
import { ProjectFilterEditor } from "./ProjectFilterEditor";
import {
  PROJECT_FILTER_FIELDS,
  type ProjectTableFilters,
} from "../lib/table-filters";

export function ProjectFilters({
  filters,
  onChange,
  mobile,
  focusRef,
  children,
}: {
  filters: ProjectTableFilters;
  onChange: (filters: ProjectTableFilters) => void;
  mobile: boolean;
  focusRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <FilterToolbar
      fields={PROJECT_FILTER_FIELDS.map((field) => ({
        ...field,
        icon: field.key === "id" ? Hash : Type,
        summary: filters[field.key]?.toString(),
      }))}
      label="项目"
      className="project-toolbar"
      mobile={mobile}
      focusRef={focusRef}
      onRemove={(field) => {
        const next = { ...filters };
        delete next[field.key];
        onChange(next);
      }}
      onClear={() => onChange({})}
      renderEditor={({ field, onClose, onRemove }) => (
        <ProjectFilterEditor
          key={field.key}
          field={field}
          filters={filters}
          onApply={(value) => {
            if (value === undefined) return onRemove();
            onChange({ ...filters, [field.key]: value });
            onClose();
          }}
          onRemove={onRemove}
          onClose={onClose}
        />
      )}
    >
      {children}
    </FilterToolbar>
  );
}
