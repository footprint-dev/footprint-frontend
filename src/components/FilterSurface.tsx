import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import { ArrowLeft, X } from "lucide-react";
import { IconButton } from "./ui";

function visibleViewport() {
  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  return {
    height,
    bottom: Math.max(
      0,
      window.innerHeight - height - (viewport?.offsetTop ?? 0),
    ),
  };
}

export function FilterSurface({
  mobile,
  anchor,
  title,
  unit,
  onBack,
  onClose,
  restoreFocus,
  children,
}: {
  mobile: boolean;
  anchor: HTMLButtonElement;
  title: string;
  unit?: string;
  onBack?: () => void;
  onClose: () => void;
  restoreFocus: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const interactedOutsideRef = useRef(false);
  const [viewport, setViewport] = useState(visibleViewport);
  useEffect(() => {
    if (!mobile) return;
    const viewport = window.visualViewport;
    const update = () => setViewport(visibleViewport());
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [mobile]);

  const focusContent = useCallback(() => {
    const content = contentRef.current;
    const target = mobile
      ? headingRef.current
      : (content?.querySelector<HTMLElement>("input:checked") ??
        content?.querySelector<HTMLElement>("input, [data-filter-field]"));
    target?.focus({ preventScroll: true });
  }, [mobile]);
  useLayoutEffect(focusContent, [focusContent, title]);

  const titleContent = (
    <>
      {title}
      {unit && <span className="point-filter-unit">{unit}</span>}
    </>
  );
  const header = (
    <div className="point-filter-heading">
      {onBack && (
        <IconButton label="选择其他筛选字段" onClick={onBack}>
          <ArrowLeft size={16} />
        </IconButton>
      )}
      {mobile ? (
        <Dialog.Title asChild>
          <h3 ref={headingRef} tabIndex={-1}>
            {titleContent}
          </h3>
        </Dialog.Title>
      ) : (
        <h3 id={titleId} ref={headingRef} tabIndex={-1}>
          {titleContent}
        </h3>
      )}
      <IconButton label="关闭筛选" onClick={onClose}>
        <X size={16} />
      </IconButton>
    </div>
  );
  const focusEvents = {
    onOpenAutoFocus: (event: Event) => {
      event.preventDefault();
      focusContent();
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      if (!interactedOutsideRef.current) restoreFocus();
    },
  };
  const changeOpen = (open: boolean) => {
    if (!open) onClose();
  };

  if (mobile)
    return (
      <Dialog.Root open onOpenChange={changeOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="point-filter-overlay" />
          <Dialog.Content
            ref={contentRef}
            className="point-filter-surface point-filter-sheet"
            style={{
              bottom: viewport.bottom,
              maxHeight: viewport.height * 0.8,
            }}
            aria-describedby={undefined}
            {...focusEvents}
          >
            {header}
            {children}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );

  return (
    <Popover.Root open onOpenChange={changeOpen}>
      <Popover.Anchor virtualRef={{ current: anchor }} />
      <Popover.Portal>
        <Popover.Content
          ref={contentRef}
          className="popover point-filter-surface point-filter-popover"
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          aria-labelledby={titleId}
          {...focusEvents}
          onInteractOutside={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("[data-point-filter-trigger]")
            )
              event.preventDefault();
            if (!event.defaultPrevented) interactedOutsideRef.current = true;
          }}
        >
          {header}
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
