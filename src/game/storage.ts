import type { Project } from "./types";

const KEY = "bom-studio.projects.v1";

function readAll(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list.filter((p) => p && typeof p.id === "string" && Array.isArray(p.objects)) as Project[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: Project[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function listProjects(): Project[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): Project | undefined {
  return readAll().find((p) => p.id === id);
}

export function saveProject(p: Project) {
  const list = readAll().filter((x) => x.id !== p.id);
  list.push(p);
  writeAll(list);
}

export function deleteProject(id: string) {
  writeAll(readAll().filter((p) => p.id !== id));
}
