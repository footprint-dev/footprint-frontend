import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import type { MapActions } from "../components/MapView";
import { useFootprintData } from "./useFootprintData";
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
  const [search, setSearch] = useState("");
  const [showPoints, setShowPoints] = useState(true),
    [showLines, setShowLines] = useState(false);
  const [showBorders, setShowBorders] = useState(false);
  const [showPlaceNames, setShowPlaceNames] = useState(true);
  const [autoFit, setAutoFit] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false),
    [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [tableTab, setTableTab] = useState<"points" | "projects">("points"),
    [projectSearch, setProjectSearch] = useState("");
  const [projectEditor, setProjectEditor] = useState<{
    project?: Project;
    initialDraft: ProjectDraft;
  } | null>(null);
  const [tableSorting, setTableSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);
  const [drawerHeight, setDrawerHeight] = useState(58);
  const map = useRef<MapActions>(null),
    drawerRef = useRef<HTMLDivElement>(null),
    tableSearch = useRef<HTMLInputElement>(null);
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
  const selectTablePoint = useCallback((id: number) => {
    setSelectedId(id);
    setTableDialogOpen(false);
  }, []);
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setDrawerHeight(entries[0].contentRect.height),
    );
    if (drawerRef.current) observer.observe(drawerRef.current);
    return () => observer.disconnect();
  }, []);
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
  const tablePoints = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return visible;
    return visible.filter((p) =>
      [
        p.id,
        p.city,
        p.device,
        formatDate(p.timestamp),
        formatTime(p.timestamp),
        p.longitude.toFixed(6),
        p.latitude.toFixed(6),
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [visible, search]);
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
  const tableProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    return query
      ? projects.filter((project) =>
          [
            project.id,
            project.name,
            formatDate(project.startTime),
            formatDate(project.endTime),
          ].some((value) => String(value).toLowerCase().includes(query)),
        )
      : projects;
  }, [projects, projectSearch]);
  const previewProject = (project: Project) => {
    map.current?.stop();
    setAutoFit(true);
    setFilters({ ...EMPTY_FILTERS, project: String(project.id) });
    setSearch("");
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
    setProjectSearch("");
    setProjectEditor(null);
  };
  const indices = useMemo(
    () => new Map(visible.map((p, index) => [p.id, index])),
    [visible],
  );
  const selectedIndex =
    selectedId === null ? -1 : (indices.get(selectedId) ?? -1);
  const selected = selectedIndex < 0 ? null : visible[selectedIndex];
  const drawAroundPoint = () => {
    if (!selected) return;
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
    setSearch("");
    setProjectSearch("");
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
    search,
    setSearch,
    projectSearch,
    setProjectSearch,
    tablePoints,
    tableProjects,
    tableTab,
    selectTableTab,
    tableSorting,
    setTableSorting,
    tableSearch,
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
    selectTablePoint,
    drawerOpen,
    toggleDrawer,
    tableDialogOpen,
    setTableDialogOpen,
    drawerHeight,
    drawerRef,
    map,
  };
}
