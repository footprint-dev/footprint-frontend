import { afterEach, describe, expect, it, vi } from "vitest";
import { observeMapOverlay } from "../src/lib/map-layout";

afterEach(() => vi.unstubAllGlobals());

describe("map overlay measurements", () => {
  it("measures against the map when it is taller than the viewport or resizes", () => {
    const viewport = Object.assign(new EventTarget(), { innerHeight: 390 });
    vi.stubGlobal("window", viewport);

    const containerBounds = { bottom: 600 };
    const overlayBounds = { top: 522, height: 58 };
    const container = {
      getBoundingClientRect: () => containerBounds,
    } as HTMLElement;
    const overlay = {
      parentElement: container,
      getBoundingClientRect: () => overlayBounds,
    } as HTMLElement;
    let notifyResize: (element: HTMLElement) => void;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        elements = new Set<HTMLElement>();
        constructor(callback: () => void) {
          notifyResize = (element) => {
            if (this.elements.has(element)) callback();
          };
        }
        observe(element: HTMLElement) {
          this.elements.add(element);
        }
        disconnect() {
          this.elements.clear();
        }
      },
    );
    const measured = vi.fn();
    const stopObserving = observeMapOverlay(overlay, measured);
    expect(measured).toHaveBeenLastCalledWith({ height: 58, bottomInset: 78 });

    // Opening the drawer changes its height and top edge.
    measured.mockClear();
    Object.assign(overlayBounds, { top: 310, height: 270 });
    notifyResize!(overlay);
    expect(measured).toHaveBeenLastCalledWith({
      height: 270,
      bottomInset: 290,
    });

    // A container resize can reposition an overlay without resizing it.
    measured.mockClear();
    containerBounds.bottom = 700;
    overlayBounds.top = 410;
    notifyResize!(container);
    expect(measured).toHaveBeenLastCalledWith({
      height: 270,
      bottomInset: 290,
    });

    // Rotating to mobile changes the viewport and the bottom spacing.
    measured.mockClear();
    viewport.innerHeight = containerBounds.bottom = 844;
    overlayBounds.top = 564;
    viewport.dispatchEvent(new Event("resize"));
    expect(measured).toHaveBeenLastCalledWith({
      height: 270,
      bottomInset: 280,
    });
    stopObserving?.();
  });
});
