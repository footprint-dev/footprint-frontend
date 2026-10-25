import type { RefObject } from "react";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { LoaderCircle, Plus, X } from "lucide-react";
import { Button } from "./ui";
import { DataTable } from "./DataTable";
import { ProjectTable } from "./ProjectTable";
import { PointFilters } from "./PointFilters";
import { ProjectFilters } from "./ProjectFilters";
import { count, type LocationPoint, type Project } from "../lib/model";
import type {
  PointTableFilters,
  ProjectTableFilters,
} from "../lib/table-filters";

interface Props {
  tableTab: "points" | "projects";
  tabPrefix: string;
  tableFocus: RefObject<HTMLElement | null>;
  tableFilters: PointTableFilters;
  setTableFilters: (filters: PointTableFilters) => void;
  filterOptions: LocationPoint[];
  mobile: boolean;
  projectFilters: ProjectTableFilters;
  setProjectFilters: (filters: ProjectTableFilters) => void;
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
  projectFilters,
  setProjectFilters,
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
        <PointFilters
          points={filterOptions}
          filters={tableFilters}
          onChange={setTableFilters}
          mobile={mobile}
          focusRef={tableFocus}
        >
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
        </PointFilters>
      ) : (
        <ProjectFilters
          filters={projectFilters}
          onChange={setProjectFilters}
          mobile={mobile}
          focusRef={tableFocus}
        >
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
          {originalTracksButton}
          <Button
            className="new-project"
            disabled={!token || loading || !!error}
            onClick={() => openProjectEditor()}
          >
            <Plus size={14} />
            新增项目
          </Button>
        </ProjectFilters>
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
