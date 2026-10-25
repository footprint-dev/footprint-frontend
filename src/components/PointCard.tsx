import { ArrowLeft, ArrowRight, Route, X } from "lucide-react";
import { Button, IconButton } from "./ui";
import { PointLocalTime } from "./PointLocalTime";
import { count, type LocationPoint } from "../lib/model";

export function PointCard({
  selected,
  selectedIndex,
  total,
  drawerHeight,
  onClose,
  onDrawAround,
  onPrevious,
  onNext,
}: {
  selected: LocationPoint;
  selectedIndex: number;
  total: number;
  drawerHeight: number;
  onClose: () => void;
  onDrawAround: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <aside
      className="point-card"
      aria-label="选中位置详情"
      style={{
        bottom: `${drawerHeight + 100}px`,
        maxHeight: `calc(100dvh - ${drawerHeight + 100}px - var(--point-card-top, 16px))`,
      }}
    >
      <div className="point-card-heading">
        <span className="eyebrow">位置点 / {selected.id}</span>
        <IconButton label="关闭位置详情" onClick={onClose}>
          <X size={15} />
        </IconButton>
      </div>
      <h3>{selected.city || "未记录城市"}</h3>
      <PointLocalTime point={selected} />
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
      </div>
      <div className="point-card-meta">
        <span>{selected.device || "未知设备"}</span>
      </div>
      <Button
        className="point-context-button"
        aria-label="绘制前后 24 小时轨迹"
        title="以此点为中心，绘制前后各 24 小时的轨迹"
        onClick={onDrawAround}
      >
        <Route size={15} />
        前后 24 小时轨迹
      </Button>
      <div className="point-stepper">
        <Button disabled={selectedIndex <= 0} onClick={onPrevious}>
          <ArrowLeft size={14} />
          上一个
        </Button>
        <span>
          {selectedIndex + 1} / {count(total)}
        </span>
        <Button disabled={selectedIndex >= total - 1} onClick={onNext}>
          下一个
          <ArrowRight size={14} />
        </Button>
      </div>
    </aside>
  );
}
