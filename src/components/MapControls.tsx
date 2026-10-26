import { useState, type CSSProperties } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Crosshair, Layers2, Minus, Plus } from "lucide-react";
import { Button, IconButton, Toggle } from "./ui";
import { overlayBoundary } from "../lib/map-layout";

interface Props {
  drawerInset: number;
  enabled: boolean;
  hasPoints: boolean;
  showPoints: boolean;
  showBorders: boolean;
  showPlaceNames: boolean;
  onZoom: (direction: number) => void;
  onNorth: () => void;
  onViewAll: () => void;
  onShowPointsChange: (enabled: boolean) => void;
  onShowBordersChange: (enabled: boolean) => void;
  onShowPlaceNamesChange: (enabled: boolean) => void;
}

export function MapControls({
  drawerInset,
  enabled,
  hasPoints,
  showPoints,
  showBorders,
  showPlaceNames,
  onZoom,
  onNorth,
  onViewAll,
  onShowPointsChange,
  onShowBordersChange,
  onShowPlaceNamesChange,
}: Props) {
  const [layerButton, setLayerButton] = useState<HTMLButtonElement | null>(
    null,
  );
  return (
    <div
      className="map-tools"
      style={{ "--map-tools-bottom": `${drawerInset + 12}px` } as CSSProperties}
    >
      <IconButton
        label="放大地图"
        disabled={!enabled}
        onClick={() => onZoom(1)}
      >
        <Plus size={19} />
      </IconButton>
      <IconButton
        label="缩小地图"
        disabled={!enabled}
        onClick={() => onZoom(-1)}
      >
        <Minus size={19} />
      </IconButton>
      <span className="tool-separator" />
      <IconButton
        label="查看全部轨迹并清空连线"
        disabled={!enabled || !hasPoints}
        onClick={onViewAll}
      >
        <Crosshair size={18} />
      </IconButton>
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button
            ref={setLayerButton}
            className="icon-button"
            aria-label="地图图层"
          >
            <Layers2 size={18} />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="popover layer-popover"
            side="left"
            sideOffset={10}
            collisionBoundary={overlayBoundary(layerButton)}
            collisionPadding={12}
            aria-label="地图图层"
          >
            <div className="popover-heading">地图图层</div>
            <Toggle
              label="显示位置点"
              checked={showPoints}
              onChange={onShowPointsChange}
            />
            <Toggle
              label="显示国境线"
              checked={showBorders}
              onChange={onShowBordersChange}
            />
            <Toggle
              label="显示地名"
              checked={showPlaceNames}
              onChange={onShowPlaceNamesChange}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <Button
        className="north-button"
        aria-label="地图朝北"
        disabled={!enabled}
        onClick={() => onNorth()}
      >
        <span>N</span>
        <svg viewBox="0 0 18 24" aria-hidden="true">
          <path d="M9 3L15 21 9 17 3 21Z" />
        </svg>
      </Button>
    </div>
  );
}
