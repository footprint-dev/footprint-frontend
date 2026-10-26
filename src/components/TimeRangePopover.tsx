import { useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "./ui";
import { Timeline } from "./Timeline";
import { drawableRange } from "../lib/timeline";
import { overlayBoundary } from "../lib/map-layout";
import type { Filters, LocationPoint } from "../lib/model";

export function TimeRangePopover({
  filters,
  range,
  points,
  disabled,
  onSelectRange,
  onClearRange,
}: {
  filters: Filters;
  range: string;
  points: LocationPoint[];
  disabled: boolean;
  onSelectRange: (
    since: string,
    until: string,
    timeWindow?: Filters["timeWindow"],
  ) => void;
  onClearRange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const active = !!drawableRange(filters);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          ref={triggerRef}
          className={`range-button ${active ? "range-filtered" : ""}`}
          aria-label={`选择轨迹时间：${range}`}
        >
          <CalendarDays size={16} />
          <span>{range}</span>
          <ChevronDown size={14} />
          {active && <span className="filter-dot" />}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={contentRef}
          className="popover timeline-popover"
          align="center"
          sideOffset={12}
          collisionPadding={12}
          collisionBoundary={overlayBoundary(triggerRef.current)}
          aria-label="选择轨迹时间"
          onOpenAutoFocus={(event) => {
            // Focusing the native select opens its picker on iOS.
            event.preventDefault();
            contentRef.current?.focus({ preventScroll: true });
          }}
        >
          <Timeline
            points={points}
            filters={filters}
            disabled={disabled}
            onSelect={onSelectRange}
            onClear={onClearRange}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
