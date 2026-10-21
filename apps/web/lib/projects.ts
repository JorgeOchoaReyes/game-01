import type { ChatTurn } from "@frankie/frankie";

// Projects live in this browser only (localStorage). Reads and writes are
// wrapped because storage can be blocked or full; the studio still works,
// it just forgets on reload.

export type Project = {
  id: string;
  name: string;
  html: string;
  history: ChatTurn[];
  updatedAt: number;
};

const KEY = "frankie:projects";

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Project[]) : [];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveProject(p: Project): void {
  try {
    const rest = loadProjects().filter((x) => x.id !== p.id);
    localStorage.setItem(KEY, JSON.stringify([{ ...p, updatedAt: Date.now() }, ...rest]));
  } catch {
    /* storage unavailable: keep the session in memory */
  }
}

export function deleteProject(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadProjects().filter((x) => x.id !== id)));
  } catch {
    /* ignore */
  }
}

export function newProjectId(): string {
  return Math.random().toString(36).slice(2, 10);
}
