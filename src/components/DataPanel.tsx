import type { RefObject } from "react";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { LoaderCircle, Plus, Search, X } from "lucide-react";
import { Button } from "./ui";
import { DataTable } from "./DataTable";
import { ProjectTable } from "./ProjectTable";
import { PointFilters } from "./PointFilters";
import { count, type LocationPoint, type Project } from "../lib/model";
import type { PointTableFilters } from "../lib/table-filters";

interface Props {
  tableTab: "points" | "projects";
  tabPrefix: string;
  tableFocus: RefObject<HTMLElement | null>;
  tableFilters: PointTableFilters;
  setTableFilters: (filters: PointTableFilters) => void;
  filterOptions: LocationPoint[];
  mobile: boolean;
  projectSearch: string;
  setProjectSearch: (value: string) => void;
  filtered: boolean;
  toggleOriginalTracks: () => void;
  activeProject?: Project;
  clearProject: () => void;
  token: string;
  loading: boolean;
  loadedCount: number;
  error: string;
  reload: () => void;
  tablePoints: LocationPoint[];
  selectedId: number | null;
  selectTablePoint: (id: number) => void;
  tableSorting: SortingState;
  setTableSorting: OnChangeFn<SortingState>;
  tableProjects: Project[];
  projectCounts: Map<number, number>;
  selectedProject: string;
  previewProject: (project: Project) => void;
  openProjectEditor: (project?: Project) => void;
}

export function DataPanel({
  tableTab,
  tabPrefix,
  tableFocus,
  tableFilters,
  setTableFilters,
  filterOptions,
  mobile,
  projectSearch,
  setProjectSearch,
  filtered,
  toggleOriginalTracks,
  activeProject,
  clearProject,
  token,
  loading,
  loadedCount,
  error,
  reload,
  tablePoints,
  selectedId,
  selectTablePoint,
  tableSorting,
  setTableSorting,
  tableProjects,
  projectCounts,
  selectedProject,
  previewProject,
  openProjectEditor,
}: Props) {
  const originalTracksButton = (
    <Button
      className="raw-track-toggle"
      aria-label="显示原始轨迹"
      aria-pressed={!filtered}
      onClick={toggleOriginalTracks}
    >
      <span>
        <span className="raw-track-prefix">显示</span>原始轨迹
      </span>
    </Button>
  );

  return (
    <div
      className="table-panel"
      role="tabpanel"
      id={`${tabPrefix}-${tableTab}-panel`}
      aria-labelledby={`${tabPrefix}-${tableTab}-tab`}
    >
      {tableTab === "points" ? (
        <div className="table-toolbar point-toolbar">
          <PointFilters
            points={filterOptions}
            filters={tableFilters}
            onChange={setTableFilters}
            mobile={mobile}
            focusRef={tableFocus}
          />
          {originalTracksButton}
          {activeProject && (
            <Button
              className="active-project"
              aria-label="清除项目筛选"
              title={activeProject.name}
              onClick={clearProject}
            >
              <span>{activeProject.name}</span>
              <X size={12} />
            </Button>
          )}
          <span className="table-order-note">点击编号定位 · 表头可排序</span>
        </div>
      ) : (
        <div className="table-toolbar project-toolbar">
          <label className="search-input">
            <Search size={15} />
            <input
              ref={(element) => {
                tableFocus.current = element;
              }}
              aria-label="搜索项目"
              placeholder="搜索项目名称或日期…"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
            />
            {projectSearch && (
              <button
                aria-label="清除项目搜索"
                onClick={() => setProjectSearch("")}
              >
                <X size={14} />
              </button>
            )}
          </label>
          {originalTracksButton}
          {activeProject && (
            <Button
              className="active-project"
              aria-label="清除项目筛选"
              title={activeProject.name}
              onClick={clearProject}
            >
              <span>{activeProject.name}</span>
              <X size={12} />
            </Button>
          )}
          <span className="table-order-note">按开始时间排序 · 北京时间</span>
          <Button
            className="new-project"
            disabled={!token || loading || !!error}
            onClick={() => openProjectEditor()}
          >
            <Plus size={14} />
            新增项目
          </Button>
        </div>
      )}
      {!token ? (
        <div className="data-state">
          <p>请在右上角设置中输入 Token 以加载足迹数据.</p>
        </div>
      ) : loading ? (
        <div className="data-state" role="status">
          <LoaderCircle size={19} className="spinning" />
          <p>
            正在读取轨迹<span>已读取 {count(loadedCount)} 个位置点</span>
          </p>
        </div>
      ) : error ? (
        <div className="data-state data-error" role="alert">
          <p>{error}</p>
          <Button onClick={reload}>重试</Button>
        </div>
      ) : tableTab === "points" ? (
        <DataTable
          points={tablePoints}
          selectedId={selectedId}
          onSelect={selectTablePoint}
          sorting={tableSorting}
          onSortingChange={setTableSorting}
        />
      ) : (
        <ProjectTable
          projects={tableProjects}
          counts={projectCounts}
          selectedId={selectedProject}
          onPreview={previewProject}
          onEdit={openProjectEditor}
        />
      )}
    </div>
  );
}
