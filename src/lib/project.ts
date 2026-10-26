import type { Project } from "./model";

export type ProjectInput = Pick<Project, "name" | "startTime" | "endTime">;
export type ProjectDraft = { name: string; start: string; end: string };
const SHANGHAI_OFFSET = 8 * 60 * 60 * 1000;

export class ProjectInputError extends Error {
  readonly field: keyof ProjectDraft;

  constructor(field: keyof ProjectDraft, message: string) {
    super(message);
    this.field = field;
  }
}

// datetime-local has no timezone; display and parse it explicitly as Shanghai time.
export function projectDateTime(timestamp: number): string {
  return new Date(timestamp + SHANGHAI_OFFSET).toISOString().slice(0, 19);
}

export function projectDraft(project: Project): ProjectDraft {
  return {
    name: project.name,
    start: projectDateTime(project.startTime),
    end: projectDateTime(project.endTime),
  };
}

function draftTimestamp(value: string, field: "start" | "end"): number {
  const label = field === "start" ? "开始时间" : "结束时间";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value))
    throw new ProjectInputError(field, `请填写完整的${label}.`);
  const normalized = value.length === 16 ? `${value}:00` : value;
  const timestamp = Date.parse(`${normalized}+08:00`);
  if (
    !Number.isSafeInteger(timestamp) ||
    timestamp < 0 ||
    projectDateTime(timestamp) !== normalized
  )
    throw new ProjectInputError(field, `请填写有效的${label}.`);
  return timestamp;
}

export function projectInput(
  draft: ProjectDraft,
  original?: Project,
): ProjectInput {
  const name = draft.name.trim();
  if (!name || name.length > 200)
    throw new ProjectInputError("name", "项目名称需为 1-200 个字符.");
  // Preserve historical millisecond precision when an existing field is unchanged.
  const start = draft.start.length === 16 ? `${draft.start}:00` : draft.start;
  const end = draft.end.length === 16 ? `${draft.end}:00` : draft.end;
  const startTime =
    original && start === projectDateTime(original.startTime)
      ? original.startTime
      : draftTimestamp(start, "start");
  const endTime =
    original && end === projectDateTime(original.endTime)
      ? original.endTime
      : draftTimestamp(end, "end");
  if (startTime > endTime)
    throw new ProjectInputError("end", "结束时间不能早于开始时间.");
  return { name, startTime, endTime };
}

export function projectPointCount(
  timestamps: number[],
  project: Project,
): number {
  const boundary = (time: number, inclusive: boolean) => {
    let low = 0,
      high = timestamps.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (
        timestamps[middle] < time ||
        (inclusive && timestamps[middle] === time)
      )
        low = middle + 1;
      else high = middle;
    }
    return low;
  };
  return Math.max(
    0,
    boundary(project.endTime, true) - boundary(project.startTime, false),
  );
}
