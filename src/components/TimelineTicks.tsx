import { useLayoutEffect, useRef } from "react";
import { dayDate } from "../lib/timeline";

export function TimelineTicks({
  minimum,
  maximum,
  hasData,
}: {
  minimum: number;
  maximum: number;
  hasData: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = container.current!;
    const labels = [...element.querySelectorAll<HTMLElement>("b")];
    const layout = () => {
      const bounds = element.getBoundingClientRect();
      const measured = labels.map((label) => {
        const tick = label.parentElement!;
        const anchor = tick.getBoundingClientRect().left;
        const width = label.getBoundingClientRect().width;
        const left = Math.max(
          bounds.left,
          Math.min(bounds.right - width, anchor - width / 2),
        );
        return {
          label,
          anchor,
          left,
          right: left + width,
          priority: tick.classList.contains("tick-month")
            ? 0
            : tick.classList.contains("tick-middle")
              ? 1
              : 2,
        };
      });
      // Keep month boundaries and mid-month labels before filling smaller gaps.
      const occupied: { left: number; right: number }[] = [];
      for (const item of measured.sort((a, b) => a.priority - b.priority)) {
        const visible =
          item.right <= bounds.right &&
          !occupied.some(
            (other) =>
              item.left < other.right + 8 && item.right > other.left - 8,
          );
        item.label.style.transform = `translateX(${item.left - item.anchor}px)`;
        item.label.style.visibility = visible ? "visible" : "hidden";
        if (visible) occupied.push(item);
      }
    };
    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(element);
    for (const label of labels) observer.observe(label);
    return () => observer.disconnect();
  }, [minimum, maximum, hasData]);

  const days = Array.from(
    {
      length: hasData ? Math.floor(maximum) - Math.ceil(minimum) + 1 : 0,
    },
    (_, i) => Math.ceil(minimum) + i,
  );
  return (
    <div ref={container} className="timeline-ticks" aria-hidden="true">
      {days.map((day) => {
        const date = dayDate(day),
          number = Number(date.slice(8)),
          monthStart = number === 1,
          major = monthStart || number % 5 === 0;
        return (
          <span
            key={day}
            className={`timeline-tick ${major ? "tick-major" : ""} ${monthStart ? "tick-month" : ""} ${number === 15 ? "tick-middle" : ""}`}
            style={{
              left: `${((day - minimum) / Math.max(1, maximum - minimum)) * 100}%`,
            }}
          >
            <i />
            {major && <b>{date.slice(5).replace("-", ".")}</b>}
          </span>
        );
      })}
    </div>
  );
}
