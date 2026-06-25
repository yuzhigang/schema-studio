import { useEffect, useState } from "react";

export const PROJECT_PANEL_WIDTH_KEY = "schema-studio:project-panel-width";
export const TREE_PANEL_WIDTH_KEY = "schema-studio:tree-panel-width";

export const DEFAULT_PROJECT_PANEL_WIDTH = 260;
export const DEFAULT_TREE_PANEL_WIDTH = 520;

const MIN_PROJECT_PANEL_WIDTH = 200;
const MAX_PROJECT_PANEL_WIDTH = 400;
const MIN_TREE_PANEL_WIDTH = 200;
const MAX_TREE_PANEL_WIDTH = 600;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readSavedWidth(key: string, defaultWidth: number, min: number, max: number) {
  if (typeof window === "undefined") {
    return defaultWidth;
  }
  const saved = localStorage.getItem(key);
  if (!saved) {
    return defaultWidth;
  }
  const parsed = Number(saved);
  if (Number.isNaN(parsed)) {
    return defaultWidth;
  }
  return clamp(parsed, min, max);
}

function usePersistentPanelWidth(key: string, defaultWidth: number, min: number, max: number) {
  const [width, setWidth] = useState(() => readSavedWidth(key, defaultWidth, min, max));

  useEffect(() => {
    localStorage.setItem(key, String(width));
  }, [key, width]);

  return {
    width,
    setWidth,
    minWidth: min,
    maxWidth: max,
  };
}

export function useProjectPanelWidth() {
  return usePersistentPanelWidth(
    PROJECT_PANEL_WIDTH_KEY,
    DEFAULT_PROJECT_PANEL_WIDTH,
    MIN_PROJECT_PANEL_WIDTH,
    MAX_PROJECT_PANEL_WIDTH,
  );
}

export function useTreePanelWidth() {
  return usePersistentPanelWidth(
    TREE_PANEL_WIDTH_KEY,
    DEFAULT_TREE_PANEL_WIDTH,
    MIN_TREE_PANEL_WIDTH,
    MAX_TREE_PANEL_WIDTH,
  );
}
