import { currentAccount, projectsKey } from "./accounts";
import type { Project } from "./types";

/** Projects are stored per signed-in account. */
function key(): string | null {
  const a = currentAccount();
  return a ? projectsKey(a.key) : null;
}

function readAll(): Project[] {
  const k = key();
  if (typeof window === "undefined" || !k) return [];
  try {
    const raw = window.localStorage.getItem(k);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list.filter((p) => p && typeof p.id === "string" && Array.isArray(p.objects)) as Project[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: Project[]) {
  const k = key();
  if (k) window.localStorage.setItem(k, JSON.stringify(list));
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
