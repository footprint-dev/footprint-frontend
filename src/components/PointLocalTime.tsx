import { getPointLocalTime } from "../lib/local-time";
import type { LocationPoint } from "../lib/model";

export function PointLocalTime({
  point,
  compact = false,
}: {
  point: LocationPoint;
  compact?: boolean;
}) {
  const time = getPointLocalTime(point);
  if (!time)
    return (
      <div className="point-local-time">
        <p className="point-observed">时间未记录</p>
      </div>
    );
  const recorded = time.timezone !== null;
  return (
    <div className={`point-local-time${compact ? " point-time-compact" : ""}`}>
      <time
        className="point-observed"
        dateTime={new Date(point.timestamp).toISOString()}
        data-timezone={time.timezone ?? undefined}
        aria-label={recorded ? "观测当地时间" : "观测 UTC 时间"}
      >
        {time.date}
        <span>{time.time}</span>
      </time>
      <p className="point-time-zone">
        {!compact && <span>{recorded ? "当地时间" : "UTC 时间"}</span>}
        <span>{time.offset}</span>
        {!recorded && <span>未记录时区</span>}
      </p>
    </div>
  );
}
