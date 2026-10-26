import { useId, useRef, useState, type SubmitEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, X } from "lucide-react";
import { Button, IconButton } from "./ui";
import { saveProject } from "../lib/api";
import type { Project } from "../lib/model";
import {
  projectDraft,
  projectInput,
  ProjectInputError,
  type ProjectDraft,
} from "../lib/project";

export function ProjectEditor({
  project,
  initialDraft,
  token,
  onSaved,
  onClose,
  restoreFocus,
}: {
  project?: Project;
  initialDraft: ProjectDraft;
  token: string;
  onSaved: (project: Project) => void;
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const [draft, setDraft] = useState(() =>
    project ? projectDraft(project) : initialDraft,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{
    message: string;
    field?: keyof ProjectDraft;
  } | null>(null);
  const errorId = useId();
  const nameInput = useRef<HTMLInputElement>(null);
  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    setError(null);
    try {
      const input = projectInput(draft, project);
      setBusy(true);
      onSaved(await saveProject(input, token, project?.id));
    } catch (error) {
      const field =
        error instanceof ProjectInputError ? error.field : undefined;
      setError({
        message:
          error instanceof Error ? error.message : "项目保存失败, 请稍后重试.",
        field,
      });
      if (field)
        form
          .querySelector<HTMLInputElement>(`[name="${field}"]`)
          ?.focus({ preventScroll: true });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="form-dialog-overlay" />
        <Dialog.Content
          className="form-dialog"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            nameInput.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <div className="form-dialog-heading">
            <Dialog.Title>{project ? "编辑项目" : "新增项目"}</Dialog.Title>
            <IconButton label="关闭项目编辑" disabled={busy} onClick={onClose}>
              <X size={17} />
            </IconButton>
          </div>
          <Dialog.Description className="form-description">
            按起止时间归集足迹，可在地图中预览。
          </Dialog.Description>
          <form noValidate onSubmit={submit} aria-busy={busy}>
            <fieldset disabled={busy}>
              <label className="field">
                项目名称
                <input
                  ref={nameInput}
                  name="name"
                  aria-label="项目名称"
                  aria-invalid={error?.field === "name"}
                  aria-describedby={
                    error?.field === "name" ? errorId : undefined
                  }
                  required
                  maxLength={200}
                  placeholder="给这段旅程起个名字"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <div className="project-date-fields">
                <label className="field">
                  开始时间
                  <input
                    name="start"
                    aria-label="开始时间"
                    aria-invalid={error?.field === "start"}
                    aria-describedby={
                      error?.field === "start" ? errorId : undefined
                    }
                    type="datetime-local"
                    required
                    step="1"
                    value={draft.start}
                    onChange={(e) =>
                      setDraft({ ...draft, start: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  结束时间
                  <input
                    name="end"
                    aria-label="结束时间"
                    aria-invalid={error?.field === "end"}
                    aria-describedby={
                      error?.field === "end" ? errorId : undefined
                    }
                    type="datetime-local"
                    required
                    step="1"
                    value={draft.end}
                    onChange={(e) =>
                      setDraft({ ...draft, end: e.target.value })
                    }
                  />
                </label>
              </div>
            </fieldset>
            <p className="form-hint">北京时间 · UTC+8</p>
            {error && (
              <p className="form-error" role="alert" id={errorId}>
                {error.message}
              </p>
            )}
            <div className="form-dialog-actions">
              <Button disabled={busy} onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={busy} className="button-primary">
                {busy && <LoaderCircle size={14} className="spinning" />}
                {busy ? "保存中…" : "保存项目"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
