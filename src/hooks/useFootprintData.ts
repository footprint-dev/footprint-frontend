import { useEffect, useState } from "react";
import { getConfig, loadData } from "../lib/api";
import {
  sortPoints,
  type ConsoleConfig,
  type LocationPoint,
  type Project,
} from "../lib/model";

const tokenStorageKey = "footprint.ingest-token";

export function useFootprintData() {
  const [token, setToken] = useState(
    () => localStorage.getItem(tokenStorageKey) || "",
  );
  const [config, setConfig] = useState<ConsoleConfig | null>(null);
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const reload = () => setRevision((value) => value + 1);
  const saveToken = (value: string) => {
    if (value) localStorage.setItem(tokenStorageKey, value);
    else localStorage.removeItem(tokenStorageKey);
    if (value !== token) setConfig(null);
    setToken(value);
    reload();
  };
  useEffect(() => {
    if (!token) {
      setConfig(null);
      return;
    }
    const controller = new AbortController();
    getConfig(controller.signal, token)
      .then((config) => {
        if (!controller.signal.aborted) setConfig(config);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setConfig(null);
          setError(
            error instanceof Error ? error.message : "预览配置未能加载。",
          );
        }
      });
    return () => controller.abort();
  }, [revision, token]);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setSelectedId(null);
    setPoints([]);
    setProjects([]);
    setLoadedCount(0);
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadData(controller.signal, setLoadedCount, token)
      .then((data) => {
        if (!controller.signal.aborted) {
          setPoints(sortPoints(data.locations));
          setProjects(data.projects);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : "数据未能加载。");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, token]);

  return {
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
    saveToken,
  };
}
