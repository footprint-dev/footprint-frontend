import type { ReactNode, RefObject } from "react";
import {
  Hash,
  MapPin,
  Mountain,
  MoveHorizontal,
  MoveVertical,
  Smartphone,
} from "lucide-react";
import { FilterToolbar } from "./FilterToolbar";
import { PointFilterEditor } from "./PointFilterEditor";
import type { LocationPoint } from "../lib/model";
import {
  TABLE_FILTER_FIELDS,
  tableFilterSummary,
  type PointTableFilters,
} from "../lib/table-filters";

const fieldIcons = {
  city: MapPin,
  device: Smartphone,
  id: Hash,
  longitude: MoveHorizontal,
  latitude: MoveVertical,
  altitude: Mountain,
};

export function PointFilters({
  points,
  filters,
  onChange,
  mobile,
  focusRef,
  children,
}: {
  points: LocationPoint[];
  filters: PointTableFilters;
  onChange: (filters: PointTableFilters) => void;
  mobile: boolean;
  focusRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <FilterToolbar
      fields={TABLE_FILTER_FIELDS.map((field) => ({
        ...field,
        icon: fieldIcons[field.key],
        summary: tableFilterSummary(filters, field),
      }))}
      mobile={mobile}
      focusRef={focusRef}
      onRemove={(field) => {
        const next = { ...filters };
        delete next[field.key];
        onChange(next);
      }}
      onClear={() => onChange({})}
      renderEditor={({ field, onClose, onRemove }) => (
        <PointFilterEditor
          key={field.key}
          field={field}
          filters={filters}
          points={points}
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
