import { formatDate, formatTime } from "../lib/model";

export function TableDateTime({ timestamp }: { timestamp: number }) {
  const date = formatDate(timestamp);
  const time = formatTime(timestamp);
  return (
    <time
      className="table-date"
      dateTime={new Date(timestamp).toISOString()}
      title="北京时间 (UTC+8)"
      aria-label={`${date} ${time}, 北京时间 (UTC+8)`}
    >
      {date}
      <span>{time}</span>
    </time>
  );
}
