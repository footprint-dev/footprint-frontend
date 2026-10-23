import { useRef, useState, type SubmitEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, X } from "lucide-react";
import { validateToken } from "./api";
import { Button, IconButton } from "./components";

export function SettingsDialog({
  token,
  onSave,
  onClose,
  restoreFocus,
}: {
  token: string;
  onSave: (token: string) => void;
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const [draft, setDraft] = useState(token);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const tokenInput = useRef<HTMLInputElement>(null);
  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const value = draft.trim();
      if (value) await validateToken(value);
      onSave(value);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Token 校验失败, 请稍后重试.",
      );
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
            tokenInput.current?.focus();
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
            <Dialog.Title>设置</Dialog.Title>
            <IconButton label="关闭设置" disabled={busy} onClick={onClose}>
              <X size={17} />
            </IconButton>
          </div>
          <Dialog.Description className="form-description">
            输入后端的 Token 以访问足迹数据.
          </Dialog.Description>
          <form onSubmit={submit} aria-busy={busy}>
            <fieldset disabled={busy}>
              <label className="field">
                Token
                <input
                  ref={tokenInput}
                  type="password"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="输入 Token"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
              </label>
            </fieldset>
            <p className="form-hint">
              仅保存在当前标签页. 留空并保存可清除 Token.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-dialog-actions">
              <Button disabled={busy} onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={busy} className="button-primary">
                {busy && <LoaderCircle size={14} className="spinning" />}
                {busy ? "验证中..." : "保存"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
