// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import * as Tooltip from "@radix-ui/react-tooltip";
import { expect, it, vi } from "vitest";
import { ProjectEditor } from "../src/components/ProjectEditor";

it("shows an inline error and focuses an empty project name on submit", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        createElement(
          Tooltip.Provider,
          null,
          createElement(ProjectEditor, {
            initialDraft: {
              name: "",
              start: "2026-10-25T00:00:00",
              end: "2026-10-25T23:59:59",
            },
            token: "test-token",
            onSaved: vi.fn(),
            onClose: vi.fn(),
            restoreFocus: vi.fn(),
          }),
        ),
      );
    });
    await act(async () => document.querySelector("form")!.requestSubmit());
    const input = document.querySelector<HTMLInputElement>('[name="name"]')!;
    const error = document.querySelector('[role="alert"]')!;
    expect(error.textContent).toContain("项目名称");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
    expect(input.matches(":focus")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
