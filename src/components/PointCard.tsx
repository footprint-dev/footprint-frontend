import { useId, useLayoutEffect, useRef, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Route,
  X,
} from "lucide-react";
import { Button, IconButton } from "./ui";
import { PointLocalTime } from "./PointLocalTime";
import { observeMapOverlay } from "../lib/map-layout";
import { count, type LocationPoint } from "../lib/model";

export function PointCard({
  selected,
  selectedIndex,
  total,
  drawerHeight,
  mobile,
  expanded,
  onExpandedChange,
  onInsetChange,
  onClose,
  onDrawAround,
  onPrevious,
  onNext,
}: {
  selected: LocationPoint;
  selectedIndex: number;
  total: number;
  drawerHeight: number;
  mobile: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onInsetChange: (inset: number) => void;
  onClose: () => void;
  onDrawAround: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const card = useRef<HTMLElement>(null);
  const detailsId = useId();
  useLayoutEffect(() => {
    if (!mobile || !card.current) return;
    const stopObserving = observeMapOverlay(card.current, ({ bottomInset }) =>
      onInsetChange(bottomInset),
    );
    return () => {
      stopObserving?.();
      onInsetChange(0);
    };
  }, [mobile, drawerHeight, onInsetChange]);
  return (
    <aside
      ref={card}
      className="point-card"
      aria-label="选中位置详情"
      style={{ "--drawer-height": `${drawerHeight}px` } as CSSProperties}
    >
      <div className="point-card-heading">
        <div className="point-card-identity">
          <span className="eyebrow">位置点 #{selected.id}</span>
          <h3>{selected.city || "未记录城市"}</h3>
        </div>
        <IconButton label="关闭位置详情" onClick={onClose}>
          <X size={15} />
        </IconButton>
      </div>
      <PointLocalTime point={selected} compact={mobile} />
      {mobile && !expanded && (
        <p className="point-altitude-summary">
          <span>海拔</span> {selected.altitude.toFixed(1)} m
        </p>
      )}
      <div
        className="point-detail-body"
        id={detailsId}
        hidden={mobile && !expanded}
      >
        <div className="point-coordinates">
          <div>
            <span>经度</span>
            <strong>{selected.longitude.toFixed(6)}°</strong>
          </div>
          <div>
            <span>纬度</span>
            <strong>{selected.latitude.toFixed(6)}°</strong>
          </div>
          <div>
            <span>海拔</span>
            <strong>{selected.altitude.toFixed(1)} m</strong>
          </div>
          <div>
            <span>设备</span>
            <strong title={selected.device || "未知设备"}>
              {selected.device || "未知设备"}
            </strong>
          </div>
        </div>
        <Button
          className="point-context-button"
          aria-label="绘制前后 24 小时轨迹"
          title="以此点为中心, 绘制前后各 24 小时的轨迹"
          onClick={onDrawAround}
        >
          <Route size={15} />
          前后 24 小时轨迹
        </Button>
      </div>
      <div className="point-stepper">
        <Button
          aria-label="上一个"
          disabled={selectedIndex <= 0}
          onClick={onPrevious}
        >
          <ArrowLeft size={14} />
          <span className="point-step-label">上一个</span>
        </Button>
        <span>
          {selectedIndex + 1} / {count(total)}
        </span>
        <Button
          aria-label="下一个"
          disabled={selectedIndex >= total - 1}
          onClick={onNext}
        >
          <span className="point-step-label">下一个</span>
          <ArrowRight size={14} />
        </Button>
        {mobile && (
          <Button
            className="point-expand"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => onExpandedChange(!expanded)}
          >
            {expanded ? "收起详情" : "展开详情"}
            {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </Button>
        )}
      </div>
    </aside>
  );
}
