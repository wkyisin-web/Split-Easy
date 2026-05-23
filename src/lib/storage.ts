import { useEffect, useState, useCallback } from "react";
import type { Group, AppSettings } from "./types";

const GROUPS_KEY = "spliteasy.groups.v1";
const SETTINGS_KEY = "spliteasy.settings.v1";

const defaultSettings: AppSettings = {
  defaultServiceCharge: true,
  defaultVat: true,
  currency: "฿",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("spliteasy:storage", { detail: { key } }));
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setGroups(read<Group[]>(GROUPS_KEY, []));
    setReady(true);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.key === GROUPS_KEY) setGroups(read<Group[]>(GROUPS_KEY, []));
    };
    window.addEventListener("spliteasy:storage", handler);
    return () => window.removeEventListener("spliteasy:storage", handler);
  }, []);

  const save = useCallback((next: Group[]) => {
    write(GROUPS_KEY, next);
    setGroups(next);
  }, []);

  return { groups, setGroups: save, ready };
}

export function getGroupsSync(): Group[] {
  return read<Group[]>(GROUPS_KEY, []);
}
export function saveGroupsSync(g: Group[]) {
  write(GROUPS_KEY, g);
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    setSettings(read<AppSettings>(SETTINGS_KEY, defaultSettings));
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.key === SETTINGS_KEY)
        setSettings(read<AppSettings>(SETTINGS_KEY, defaultSettings));
    };
    window.addEventListener("spliteasy:storage", handler);
    return () => window.removeEventListener("spliteasy:storage", handler);
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    const next = { ...read<AppSettings>(SETTINGS_KEY, defaultSettings), ...patch };
    write(SETTINGS_KEY, next);
    setSettings(next);
  }, []);

  return { settings, update };
}

export function getSettingsSync(): AppSettings {
  return read<AppSettings>(SETTINGS_KEY, defaultSettings);
}
