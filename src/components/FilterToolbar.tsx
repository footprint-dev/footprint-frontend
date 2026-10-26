import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Check, ChevronRight, Plus, X, type LucideIcon } from "lucide-react";
import { Button } from "./ui";
import { FilterSurface } from "./FilterSurface";

interface FilterField {
  key: string;
  label: string;
  unit?: string;
  icon: LucideIcon;
  summary?: string;
  monospace?: boolean;
}

export function FilterToolbar<Field extends FilterField>({
  fields,
  label = "",
  className = "",
  mobile,
  focusRef,
  onRemove,
  onClear,
  renderEditor,
  children,
}: {
  fields: Field[];
  label?: string;
  className?: string;
  mobile: boolean;
  focusRef: RefObject<HTMLElement | null>;
  onRemove: (field: Field) => void;
  onClear: () => void;
  renderEditor: (props: {
    field: Field;
    onClose: () => void;
    onRemove: () => void;
  }) => ReactNode;
  children: ReactNode;
}) {
  const [session, setSession] = useState<{
    field: Field | null;
    anchor: HTMLButtonElement;
    fromPicker: boolean;
  } | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const active = fields.filter((field) => field.summary !== undefined);
  const currentField = session?.field;
  useEffect(() => setSession(null), [mobile]);

  const open = (field: Field | null, anchor: HTMLButtonElement) => {
    returnFocus.current = anchor;
    setSession((current) =>
      current?.anchor === anchor
        ? null
        : { field, anchor, fromPicker: field === null },
    );
  };
  const close = () => setSession(null);
  const remove = (field: Field) => {
    returnFocus.current = addButton.current;
    onRemove(field);
    close();
    addButton.current?.focus();
  };

  return (
    <div className={`table-toolbar filter-toolbar ${className}`}>
      <Button
        size="compact"
        ref={(element) => {
          addButton.current = element;
          focusRef.current = element;
        }}
        className="point-filter-add"
        aria-label={`添加${label}筛选`}
        aria-haspopup="dialog"
        aria-expanded={session?.anchor === addButton.current}
        data-point-filter-trigger
        onClick={(event) => open(null, event.currentTarget)}
      >
        <Plus size={14} />
        筛选
      </Button>
      {active.length > 0 && (
        <>
          <div
            className="point-filter-chips"
            aria-label={`已应用的${label || "表格"}筛选`}
          >
            {active.map((field) => (
              <div className="point-filter-chip" key={field.key}>
                <Button
                  size="compact"
                  className="point-filter-chip-edit"
                  aria-label={`编辑${label}${field.label}筛选: ${field.summary}`}
                  aria-haspopup="dialog"
                  aria-expanded={currentField?.key === field.key}
                  title={`${field.label}: ${field.summary}`}
                  data-point-filter-trigger
                  onClick={(event) => open(field, event.currentTarget)}
                >
                  <span className="point-filter-chip-label">{field.label}</span>
                  <span
                    className={`point-filter-chip-value${field.monospace ? " filter-monospace" : ""}`}
                  >
                    {field.summary}
                  </span>
                </Button>
                <Button
                  size="compact"
                  className="point-filter-chip-remove"
                  aria-label={`移除${label}${field.label}筛选`}
                  onClick={() => remove(field)}
                >
                  <X size={12} />
                </Button>
              </div>
            ))}
          </div>
          <Button
            size="compact"
            className="point-filter-clear"
            aria-label={`清空${label || "表格"}筛选`}
            onClick={() => {
              returnFocus.current = addButton.current;
              onClear();
              close();
              addButton.current?.focus();
            }}
          >
            清空
          </Button>
        </>
      )}
      <div className="filter-toolbar-actions">{children}</div>
      {session && (
        <FilterSurface
          mobile={mobile}
          anchor={session.anchor}
          title={
            currentField
              ? `${label}${currentField.label}${currentField.unit ? "范围" : ""}`
              : `添加${label}筛选`
          }
          unit={currentField?.unit}
          onBack={
            currentField && session.fromPicker
              ? () => setSession({ ...session, field: null })
              : undefined
          }
          onClose={close}
          restoreFocus={() => {
            const target = returnFocus.current?.isConnected
              ? returnFocus.current
              : addButton.current;
            target?.focus({ preventScroll: true });
          }}
        >
          {currentField ? (
            renderEditor({
              field: currentField,
              onClose: close,
              onRemove: () => remove(currentField),
            })
          ) : (
            <div className="point-filter-picker">
              <p className="point-filter-hint">同时满足所选条件, 仅筛选表格</p>
              {fields.map((field) => {
                const Icon = field.icon;
                return (
                  <Button
                    className="point-filter-field"
                    key={field.key}
                    data-filter-field
                    aria-label={`筛选${label}${field.label}`}
                    onClick={() => setSession({ ...session, field })}
                  >
                    <Icon size={15} />
                    <span>{field.label}</span>
                    {field.summary !== undefined ? (
                      <Check
                        size={14}
                        className="point-filter-field-selected"
                      />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </FilterSurface>
      )}
    </div>
  );
}
