// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import * as Tooltip from "@radix-ui/react-tooltip";
import { expect, it, vi } from "vitest";
import { FilterSurface } from "../src/components/FilterSurface";

it.each([
  { height: 320, sheet: true },
  { height: 900, sheet: false },
])(
  "fits a filter opened from a table dialog to a $height px safe viewport",
  async ({ height, sheet }) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const atlas = document.createElement("main");
    atlas.className = "atlas";
    Object.defineProperty(atlas, "clientHeight", { value: height });
    const dialog = document.createElement("div");
    dialog.className = "table-dialog";
    Object.defineProperty(dialog, "clientHeight", { value: 240 });
    const anchor = document.createElement("button");
    dialog.append(anchor);
    const container = document.createElement("div");
    document.body.append(atlas, dialog, container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(
          createElement(
            Tooltip.Provider,
            null,
            createElement(FilterSurface, {
              mobile: false,
              anchor,
              title: "经度范围",
              onClose: vi.fn(),
              restoreFocus: () => anchor.focus(),
              children: createElement("input", { "aria-label": "经度最小值" }),
            }),
          ),
        );
      });
      const surface = document.querySelector('[role="dialog"]');
      expect(surface).not.toBeNull();
      expect(atlas.getAttribute("aria-hidden") === "true").toBe(sheet);
      expect(document.activeElement?.tagName).toBe(sheet ? "H3" : "INPUT");
    } finally {
      await act(async () => root.unmount());
      atlas.remove();
      dialog.remove();
      container.remove();
      vi.unstubAllGlobals();
    }
  },
);
