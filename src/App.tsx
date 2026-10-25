import * as Tooltip from "@radix-ui/react-tooltip";
import { RefreshCw, Settings } from "lucide-react";
import { IconButton } from "./components/ui";
import { MapView } from "./components/MapView";
import { MapControls } from "./components/MapControls";
import { PointCard } from "./components/PointCard";
import { TimeRangePopover } from "./components/TimeRangePopover";
import { DataDrawer } from "./components/DataDrawer";
import { DataPanel } from "./components/DataPanel";
import { ProjectEditor } from "./components/ProjectEditor";
import { SettingsDialog } from "./components/SettingsDialog";
import { useFootprint } from "./hooks/useFootprint";

export function App() {
  const footprint = useFootprint();
  const tabPrefix = footprint.tableDialogOpen ? "dialog" : "drawer";
  return (
    <Tooltip.Provider delayDuration={250}>
      <main
        className={`atlas drawer-${footprint.drawerOpen ? "compact" : "collapsed"}${footprint.tableDialogOpen ? " table-dialog-open" : ""}`}
      >
        <MapView
          ref={footprint.map}
          config={footprint.config}
          points={footprint.visible}
          selected={footprint.selected}
          onSelect={footprint.selectPoint}
          days={footprint.days}
          showPoints={footprint.showPoints}
          showLines={
            footprint.showLines &&
            (footprint.canDraw || !!footprint.activeProject)
          }
          showBorders={footprint.showBorders}
          showPlaceNames={footprint.showPlaceNames}
          filteredMode={footprint.filteredMode}
          autoFit={footprint.autoFit}
          bottomInset={footprint.mapBottomInset}
        />
        <div className="range-control">
          <TimeRangePopover
            filters={footprint.filters}
            range={footprint.range}
            points={footprint.timelinePoints}
            disabled={footprint.loading}
            onSelectRange={footprint.selectTimeRange}
            onClearRange={footprint.clearTimeRange}
          />
        </div>
        <div className="top-controls">
          <IconButton
            label="重新加载数据"
            disabled={!footprint.token || footprint.loading}
            onClick={footprint.reload}
          >
            <RefreshCw
              size={16}
              className={footprint.loading ? "spinning" : ""}
            />
          </IconButton>
          <IconButton
            label="设置"
            onClick={(event) => footprint.openSettings(event.currentTarget)}
          >
            <Settings size={18} />
          </IconButton>
        </div>
        <MapControls
          enabled={!!footprint.config?.mapboxToken}
          hasPoints={!!footprint.points.length}
          showPoints={footprint.showPoints}
          showBorders={footprint.showBorders}
          showPlaceNames={footprint.showPlaceNames}
          onZoom={(direction) => footprint.map.current?.zoom(direction)}
          onNorth={() => footprint.map.current?.north()}
          onViewAll={footprint.viewAllTracks}
          onShowPointsChange={(enabled) => {
            if (!enabled) footprint.preserveMapView();
            footprint.setShowPoints(enabled);
          }}
          onShowBordersChange={footprint.setShowBorders}
          onShowPlaceNamesChange={footprint.setShowPlaceNames}
        />
        {footprint.selected && footprint.pointCardVisible && (
          <PointCard
            selected={footprint.selected}
            selectedIndex={footprint.selectedIndex}
            total={footprint.visible.length}
            drawerHeight={footprint.drawerHeight}
            mobile={footprint.mobile}
            expanded={footprint.pointExpanded}
            onExpandedChange={footprint.setPointExpanded}
            onInsetChange={footprint.setPointInset}
            onClose={footprint.closePoint}
            onDrawAround={footprint.drawAroundPoint}
            onPrevious={() =>
              footprint.setSelectedId(
                footprint.visible[footprint.selectedIndex - 1].id,
              )
            }
            onNext={() =>
              footprint.setSelectedId(
                footprint.visible[footprint.selectedIndex + 1].id,
              )
            }
          />
        )}
        <DataDrawer
          open={footprint.drawerOpen}
          dialogOpen={footprint.tableDialogOpen}
          tableTab={footprint.tableTab}
          tabPrefix={tabPrefix}
          total={
            footprint.tableTab === "points"
              ? footprint.tablePoints.length
              : footprint.tableProjects.length
          }
          drawerRef={footprint.drawerRef}
          focusRef={footprint.tableFocus}
          onTabChange={footprint.selectTableTab}
          onToggle={footprint.toggleDrawer}
          onDialogOpenChange={footprint.setTableDialogOpen}
        >
          <DataPanel
            tableTab={footprint.tableTab}
            tabPrefix={tabPrefix}
            tableFocus={footprint.tableFocus}
            tableFilters={footprint.tableFilters}
            setTableFilters={footprint.setTableFilters}
            filterOptions={footprint.visible}
            mobile={footprint.mobile}
            projectSearch={footprint.projectSearch}
            setProjectSearch={footprint.setProjectSearch}
            filtered={footprint.filters.filtered}
            toggleOriginalTracks={footprint.toggleOriginalTracks}
            activeProject={footprint.activeProject}
            clearProject={footprint.clearProject}
            token={footprint.token}
            loading={footprint.loading}
            loadedCount={footprint.loadedCount}
            error={footprint.error}
            reload={footprint.reload}
            tablePoints={footprint.tablePoints}
            selectedId={footprint.selectedId}
            selectTablePoint={footprint.selectPoint}
            tableSorting={footprint.tableSorting}
            setTableSorting={footprint.setTableSorting}
            tableProjects={footprint.tableProjects}
            projectCounts={footprint.projectCounts}
            selectedProject={footprint.filters.project}
            previewProject={footprint.previewProject}
            openProjectEditor={footprint.openProjectEditor}
          />
        </DataDrawer>
      </main>
      {footprint.settingsOpen && (
        <SettingsDialog
          token={footprint.token}
          onSave={footprint.saveToken}
          onClose={() => footprint.setSettingsOpen(false)}
          restoreFocus={() => footprint.settingsButton.current?.focus()}
        />
      )}
      {footprint.projectEditor && (
        <ProjectEditor
          project={footprint.projectEditor.project}
          initialDraft={footprint.projectEditor.initialDraft}
          token={footprint.token}
          onSaved={footprint.projectSaved}
          onClose={() => footprint.setProjectEditor(null)}
          restoreFocus={() => {
            if (footprint.editorFocus.current?.isConnected)
              footprint.editorFocus.current.focus();
            else footprint.tableFocus.current?.focus();
          }}
        />
      )}
    </Tooltip.Provider>
  );
}
