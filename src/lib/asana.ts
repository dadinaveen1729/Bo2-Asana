const ASANA_BASE = 'https://app.asana.com/api/1.0';

export class AsanaError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function asanaFetch(path: string, token: string) {
  const res = await fetch(`${ASANA_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AsanaError(`Asana API error (${res.status}): ${body.slice(0, 300)}`, res.status);
  }
  return res.json();
}

export interface AsanaWorkspace {
  gid: string;
  name: string;
}

export interface AsanaProject {
  gid: string;
  name: string;
  color: string | null;
  notes: string | null;
}

export interface AsanaSection {
  gid: string;
  name: string;
}

export interface AsanaTask {
  gid: string;
  name: string;
  notes: string | null;
  due_on: string | null;
  completed: boolean;
  assignee: { gid: string; name: string; email?: string } | null;
  memberships: { project: { gid: string }; section: { gid: string; name: string } | null }[];
}

export async function listWorkspaces(token: string): Promise<AsanaWorkspace[]> {
  const json = await asanaFetch('/workspaces?opt_fields=name', token);
  return json.data;
}

export async function listProjects(token: string, workspaceGid: string): Promise<AsanaProject[]> {
  const json = await asanaFetch(
    `/projects?workspace=${workspaceGid}&archived=false&opt_fields=name,color,notes&limit=100`,
    token
  );
  return json.data;
}

export async function listSections(token: string, projectGid: string): Promise<AsanaSection[]> {
  const json = await asanaFetch(`/projects/${projectGid}/sections?opt_fields=name&limit=100`, token);
  return json.data;
}

export interface AsanaMember {
  gid: string;
  name: string;
  email?: string;
}

// Who this project is actually shared with in Asana -- used so an import
// can recreate that same sharing in Boost Hub instead of leaving the
// project visible to nobody but whoever ran the import.
export async function listProjectMembers(token: string, projectGid: string): Promise<AsanaMember[]> {
  const json = await asanaFetch(`/projects/${projectGid}?opt_fields=members.name,members.email`, token);
  return json.data.members || [];
}

export async function listTasks(token: string, projectGid: string): Promise<AsanaTask[]> {
  const json = await asanaFetch(
    `/tasks?project=${projectGid}&opt_fields=name,notes,due_on,completed,assignee.email,assignee.name,memberships.project,memberships.section.name&limit=100`,
    token
  );
  return json.data;
}

// Asana's project color enum has shifted over API versions and isn't fully
// documented in one place, so this maps both the modern short names (verified
// live against a real workspace: purple, blue, indigo, blue-green, red, none)
// and the older dark-x/light-x names, with a prefix-stripping fallback below.
const ASANA_COLOR_MAP: Record<string, string> = {
  pink: '#EB5E9C', 'dark-pink': '#EB5E9C', 'light-pink': '#F8A5C2',
  green: '#17B26A', 'dark-green': '#17B26A', 'light-green': '#6FCF97', 'sea-green': '#2FBF9F',
  blue: '#2E90FA', 'dark-blue': '#2E90FA', 'light-blue': '#56CCF2', cyan: '#56CCF2', aqua: '#56CCF2',
  red: '#F04438', 'dark-red': '#F04438', 'light-red': '#FC636B',
  teal: '#2FBF9F', 'dark-teal': '#2FBF9F', 'light-teal': '#6FE0C8', 'blue-green': '#2FBF9F',
  brown: '#8B5E3C', 'dark-brown': '#8B5E3C', 'light-brown': '#C9A17A', peach: '#F7B76D',
  orange: '#F2994A', 'dark-orange': '#F2994A', 'light-orange': '#F7B76D',
  purple: '#6C5CE7', 'dark-purple': '#6C5CE7', 'light-purple': '#BB6BD9', indigo: '#6C5CE7', magenta: '#BB6BD9',
  'warm-gray': '#667085', 'dark-warm-gray': '#667085', 'light-warm-gray': '#8395A7', 'cool-gray': '#8395A7', gray: '#8395A7',
  yellow: '#F2C94C', 'yellow-green': '#6FCF97', 'yellow-orange': '#F2994A',
  none: '#8395A7',
};

export function asanaColorToHex(color: string | null, fallback: string) {
  if (!color) return fallback;
  if (ASANA_COLOR_MAP[color]) return ASANA_COLOR_MAP[color];
  const stripped = color.replace(/^(dark|light)-/, '');
  return ASANA_COLOR_MAP[stripped] || fallback;
}
