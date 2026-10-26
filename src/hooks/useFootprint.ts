import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import type { MapActions } from "../components/MapView";
import { useFootprintData } from "./useFootprintData";
import { useMobileLayout } from "./useMobileLayout";
import { observeMapOverlay } from "../lib/map-layout";
import {
  filterTablePoints,
  filterTableProjects,
  type PointTableFilters,
  type ProjectTableFilters,
} from "../lib/table-filters";
import { aroundPointRange, drawableRange } from "../lib/timeline";
import {
  projectDateTime,
  projectPointCount,
  type ProjectDraft,
} from "../lib/project";
import {
  EMPTY_FILTERS,
  filterPoints,
  formatDate,
  formatTime,
  type Filters,
  type Project,
} from "../lib/model";

export function useFootprint() {
  const data = useFootprintData();
  const mobile = useMobileLayout();
  const {
    token,
    config,
    points,
    projects,
    loading,
    loadedCount,
    error,
    selectedId,
    setSelectedId,
    setProjects,
    reload,
  } = data;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tableFilters, setTableFilters] = useState<PointTableFilters>({});
  const [pointExpanded, setPointExpanded] = useState(false);
  const [pointInset, setPointInset] = useState(0);
  const [showPoints, setShowPoints] = useState(true),
    [showLines, setShowLines] = useState(false);
  const [showBorders, setShowBorders] = useState(false);
  const [showPlaceNames, setShowPlaceNames] = useState(true);
  const [autoFit, setAutoFit] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false),
    [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [tableTab, setTableTab] = useState<"points" | "projects">("points");
  const [projectFilters, setProjectFilters] = useState<ProjectTableFilters>({});
  const [projectEditor, setProjectEditor] = useState<{
    project?: Project;
    initialDraft: ProjectDraft;
  } | null>(null);
  const [tableSorting, setTableSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);
  const [drawerHeight, setDrawerHeight] = useState(58);
  const [drawerInset, setDrawerInset] = useState(78);
  const map = useRef<MapActions>(null),
    drawerRef = useRef<HTMLDivElement>(null),
    tableFocus = useRef<HTMLElement>(null);
  const editorFocus = useRef<HTMLElement | null>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const openSettings = (button: HTMLButtonElement) => {
    settingsButton.current = button;
    setSettingsOpen(true);
  };
  const saveToken = (value: string) => {
    data.saveToken(value);
    setSettingsOpen(false);
  };
  const selectPoint = useCallback(
    (id: number) => {
      setSelectedId(id);
      setPointExpanded(false);
      if (mobile) setDrawerOpen(false);
      setTableDialogOpen(false);
    },
    [mobile, setSelectedId],
  );
  useEffect(() => {
    if (!drawerRef.current) return;
    return observeMapOverlay(drawerRef.current, ({ height, bottomInset }) => {
      setDrawerHeight(height);
      setDrawerInset(bottomInset);
    });
  }, []);
  useEffect(() => setPointExpanded(false), [mobile]);
  const visible = useMemo(
    () => filterPoints(points, filters, projects),
    [points, filters, projects],
  );
  const timelinePoints = useMemo(
    () =>
      filterPoints(
        points,
        {
          project: filters.project,
          filtered: filters.filtered,
          since: "",
          until: "",
        },
        projects,
      ),
    [points, filters.project, filters.filtered, projects],
  );
  const canDraw = !!drawableRange(filters);
  // Automatic point cleanup is the normal overview, so low zooms still cluster.
  const filteredMode = canDraw || !!filters.project;
  const preserveMapView = () => {
    setAutoFit(false);
    map.current?.stop();
  };
  const selectTimeRange = (
    since: string,
    until: string,
    timeWindow?: Filters["timeWindow"],
  ) => {
    if (!drawableRange({ since, until })) return;
    setAutoFit(true);
    setFilters((current) => ({ ...current, since, until, timeWindow }));
    setShowLines(true);
  };
  const clearTimeRange = () => {
    preserveMapView();
    setFilters((current) => ({
      ...current,
      since: "",
      until: "",
      timeWindow: undefined,
    }));
    setShowLines(false);
  };
  const toggleOriginalTracks = () => {
    preserveMapView();
    setFilters((current) => ({ ...current, filtered: !current.filtered }));
  };
  const tablePoints = useMemo(
    () => filterTablePoints(visible, tableFilters),
    [visible, tableFilters],
  );
  const activeProject = projects.find(
    (project) => String(project.id) === filters.project,
  );
  const projectTimestamps = useMemo(
    () =>
      filterPoints(
        points,
        { ...EMPTY_FILTERS, filtered: filters.filtered },
        [],
      ).map((point) => point.timestamp),
    [points, filters.filtered],
  );
  const projectCounts = useMemo(
    () =>
      new Map(
        projects.map((project) => [
          project.id,
          projectPointCount(projectTimestamps, project),
        ]),
      ),
    [projects, projectTimestamps],
  );
  const tableProjects = useMemo(
    () => filterTableProjects(projects, projectFilters),
    [projects, projectFilters],
  );
  const previewProject = (project: Project) => {
    map.current?.stop();
    setAutoFit(true);
    setFilters({ ...EMPTY_FILTERS, project: String(project.id) });
    setTableFilters({});
    setSelectedId(null);
    setShowPoints(true);
    setShowLines(true);
    setTableDialogOpen(false);
  };
  const clearProject = () => {
    preserveMapView();
    setFilters((current) => ({ ...current, project: "" }));
    setShowLines(false);
  };
  const openProjectEditor = (project?: Project) => {
    editorFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const date = formatDate(visible.at(-1)?.timestamp ?? Date.now()).replaceAll(
      ".",
      "-",
    );
    const start =
      filters.timeWindow?.start ??
      (filters.since
        ? Date.parse(`${filters.since}T00:00:00+08:00`)
        : activeProject?.startTime);
    const end =
      filters.timeWindow?.end ??
      (filters.until
        ? Date.parse(`${filters.until}T23:59:59+08:00`)
        : activeProject?.endTime);
    setProjectEditor({
      project,
      initialDraft: {
        name: "",
        start:
          start === undefined ? `${date}T00:00:00` : projectDateTime(start),
        end: end === undefined ? `${date}T23:59:59` : projectDateTime(end),
      },
    });
  };
  const projectSaved = (project: Project) => {
    setProjects((current) =>
      [...current.filter((item) => item.id !== project.id), project].sort(
        (a, b) => b.startTime - a.startTime || b.id - a.id,
      ),
    );
    if (filters.project === String(project.id)) {
      map.current?.stop();
      setAutoFit(true);
      setSelectedId(null);
    }
    setProjectFilters({});
    setProjectEditor(null);
  };
  const indices = useMemo(
    () => new Map(visible.map((p, index) => [p.id, index])),
    [visible],
  );
  const selectedIndex =
    selectedId === null ? -1 : (indices.get(selectedId) ?? -1);
  const selected = selectedIndex < 0 ? null : visible[selectedIndex];
  const pointCardVisible =
    !!selected && !(mobile && (drawerOpen || tableDialogOpen));
  const mapBottomInset =
    (mobile && pointCardVisible
      ? Math.max(drawerInset, pointInset)
      : drawerInset) + 4;
  const drawAroundPoint = () => {
    if (!selected) return;
    setPointExpanded(false);
    setAutoFit(true);
    setFilters((current) => ({
      ...current,
      ...aroundPointRange(selected.timestamp),
    }));
    setShowPoints(true);
    setShowLines(true);
  };
  const closePoint = () => {
    setSelectedId(null);
    if (filters.timeWindow) clearTimeRange();
    else preserveMapView();
  };
  const viewAllTracks = () => {
    map.current?.stop();
    setFilters({ ...EMPTY_FILTERS });
    setTableFilters({});
    setProjectFilters({});
    setSelectedId(null);
    setShowLines(false);
    setShowPoints(true);
    setAutoFit(true);
    // MapView fits after the reset filters produce the full point collection.
  };
  const stats = useMemo(() => {
    const dates = new Set<string>();
    for (const p of visible) {
      dates.add(formatDate(p.timestamp));
    }
    const first = visible[0],
      last = visible.at(-1);
    return {
      days: dates.size,
      range:
        first && last
          ? `${formatDate(first.timestamp)} — ${formatDate(last.timestamp)}`
          : "全部时间",
    };
  }, [visible]);
  const { days } = stats;
  const range = filters.timeWindow
    ? `${formatDate(filters.timeWindow.start)} ${formatTime(filters.timeWindow.start).slice(0, 5)} — ${formatDate(filters.timeWindow.end).slice(5)} ${formatTime(filters.timeWindow.end).slice(0, 5)}`
    : canDraw
      ? `${filters.since.replaceAll("-", ".")} — ${filters.until.replaceAll("-", ".")}`
      : stats.range;
  useEffect(() => {
    if (selectedId !== null && !selected) setSelectedId(null);
  }, [selectedId, selected]);

  const selectTableTab = (tab: "points" | "projects") => {
    setTableTab(tab);
    if (!tableDialogOpen && !drawerOpen) {
      map.current?.stop();
      setDrawerOpen(true);
    }
  };
  const toggleDrawer = () => {
    map.current?.stop();
    setDrawerOpen((open) => !open);
  };
  return {
    token,
    config,
    points,
    loading,
    loadedCount,
    error,
    reload,
    saveToken,
    selectedId,
    setSelectedId,
    settingsOpen,
    setSettingsOpen,
    openSettings,
    settingsButton,
    filters,
    visible,
    timelinePoints,
    canDraw,
    filteredMode,
    autoFit,
    days,
    range,
    showPoints,
    setShowPoints,
    showLines,
    showBorders,
    setShowBorders,
    showPlaceNames,
    setShowPlaceNames,
    preserveMapView,
    selectTimeRange,
    clearTimeRange,
    toggleOriginalTracks,
    viewAllTracks,
    tableFilters,
    setTableFilters,
    projectFilters,
    setProjectFilters,
    tablePoints,
    tableProjects,
    tableTab,
    selectTableTab,
    tableSorting,
    setTableSorting,
    tableFocus,
    activeProject,
    projectCounts,
    previewProject,
    clearProject,
    projectEditor,
    setProjectEditor,
    openProjectEditor,
    projectSaved,
    editorFocus,
    selected,
    selectedIndex,
    drawAroundPoint,
    closePoint,
    selectPoint,
    mobile,
    pointExpanded,
    setPointExpanded,
    pointCardVisible,
    setPointInset,
    mapBottomInset,
    drawerOpen,
    toggleDrawer,
    tableDialogOpen,
    setTableDialogOpen,
    drawerHeight,
    drawerInset,
    drawerRef,
    map,
  };
}
