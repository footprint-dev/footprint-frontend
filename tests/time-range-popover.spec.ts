// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { TimeRangePopover } from "../src/components/TimeRangePopover";
import { EMPTY_FILTERS } from "../src/lib/model";

it("opens the timeline without focusing the native month picker", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        createElement(TimeRangePopover, {
          filters: EMPTY_FILTERS,
          range: "2026.10.01 - 2026.11.01",
          points: [
            {
              id: 1,
              timestamp: Date.parse("2026-10-01T12:00:00+08:00"),
              longitude: 120,
              latitude: 30,
              altitude: 0,
              device: null,
              city: null,
              quality: {
                status: "retained",
                reason: "accepted",
                version: null,
                checkedAt: null,
                evidence: null,
              },
            },
          ],
          disabled: false,
          onSelectRange: vi.fn(),
          onClearRange: vi.fn(),
        }),
      );
    });
    const trigger = container.querySelector("button")!;
    await act(async () => trigger.click());
    const popover = document.querySelector('[role="dialog"]')!;
    const month = popover.querySelector("select")!;
    expect(month.disabled).toBe(false);
    expect(popover.matches(":focus")).toBe(true);

    await act(async () => {
      popover.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
