export function observeMapOverlay(
  overlay: HTMLElement,
  onMeasure: (size: { height: number; bottomInset: number }) => void,
) {
  // Overlays are direct children of the map-sized atlas container.
  const container = overlay.parentElement;
  if (!container) return;

  const measure = () => {
    const bounds = overlay.getBoundingClientRect();
    onMeasure({
      height: bounds.height,
      bottomInset: container.getBoundingClientRect().bottom - bounds.top,
    });
  };
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(container);
  observer.observe(overlay);
  window.addEventListener("resize", measure);
  return () => {
    observer.disconnect();
    window.removeEventListener("resize", measure);
  };
}
