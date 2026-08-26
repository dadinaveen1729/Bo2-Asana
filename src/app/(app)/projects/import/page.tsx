'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ExternalLink, Hash, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useTeams } from '@/hooks/use-teams-projects';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface AsanaWorkspace { gid: string; name: string }
interface AsanaProjectLite { gid: string; name: string; color: string | null; notes: string | null }
type ImportResult = {
  gid: string;
  name: string;
  status: 'pending' | 'importing' | 'done' | 'error';
  message?: string;
  projectId?: string;
  tasksImported?: number;
  membersShared?: number;
};

export default function ImportProjectsPage() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { teams } = useTeams(workspace?.id);

  const [step, setStep] = useState<'token' | 'workspace' | 'projects' | 'importing' | 'done'>('token');
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [asanaWorkspaces, setAsanaWorkspaces] = useState<AsanaWorkspace[]>([]);
  const [asanaWorkspaceGid, setAsanaWorkspaceGid] = useState<string>('');

  const [asanaProjects, setAsanaProjects] = useState<AsanaProjectLite[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [teamId, setTeamId] = useState<string>('none');

  const [results, setResults] = useState<ImportResult[]>([]);

  async function connect() {
    if (!token.trim()) return;
    setConnecting(true);
    setError(null);
    const res = await fetch('/api/asana/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim() }),
    });
    const json = await res.json();
    setConnecting(false);
    if (!res.ok) {
      setError(json.error || 'Could not connect to Asana. Check that your token is correct and hasn’t expired.');
      return;
    }
    setAsanaWorkspaces(json.workspaces);
    if (json.workspaces.length === 1) {
      setAsanaWorkspaceGid(json.workspaces[0].gid);
      loadProjects(json.workspaces[0].gid);
    } else {
      setStep('workspace');
    }
  }

  async function loadProjects(workspaceGid: string) {
    setConnecting(true);
    setError(null);
    const res = await fetch('/api/asana/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim(), workspaceGid }),
    });
    const json = await res.json();
    setConnecting(false);
    if (!res.ok) {
      setError(json.error || 'Could not load Asana projects.');
      return;
    }
    setAsanaProjects(json.projects);
    setStep('projects');
  }

  function toggle(gid: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(gid)) next.delete(gid);
      else next.add(gid);
      return next;
    });
  }

  async function startImport() {
    if (!workspace || selected.size === 0) return;
    const chosen = asanaProjects.filter((p) => selected.has(p.gid));
    setResults(chosen.map((p) => ({ gid: p.gid, name: p.name, status: 'pending' })));
    setStep('importing');

    for (const p of chosen) {
      setResults((rs) => rs.map((r) => (r.gid === p.gid ? { ...r, status: 'importing' } : r)));
      try {
        const res = await fetch('/api/asana/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token.trim(), workspaceId: workspace.id, teamId: teamId === 'none' ? null : teamId, project: p }),
        });
        const json = await res.json();
        if (!res.ok) {
          setResults((rs) => rs.map((r) => (r.gid === p.gid ? { ...r, status: 'error', message: json.error } : r)));
        } else {
          setResults((rs) =>
            rs.map((r) =>
              r.gid === p.gid
                ? { ...r, status: 'done', projectId: json.projectId, tasksImported: json.tasksImported, membersShared: json.membersShared }
                : r
            )
          );
        }
      } catch (e: any) {
        setResults((rs) => rs.map((r) => (r.gid === p.gid ? { ...r, status: 'error', message: e.message } : r)));
      }
    }
    setStep('done');
    setToken('');
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-ink">Import from Asana</h1>
      <p className="mt-1 text-sm text-ink-muted">Bring your team's existing Asana projects, sections, and tasks into Boost Hub.</p>

      {step === 'token' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-hover/50 px-3.5 py-3 text-[13px] text-ink-muted">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-500" />
            <span>
              Your token is used only for this import and is never saved. Generate one at{' '}
              <a href="https://app.asana.com/0/my-apps" target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">
                Asana &rarr; My Settings &rarr; Apps &rarr; Developer apps <ExternalLink size={11} className="inline" />
              </a>.
            </span>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Asana Personal Access Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && connect()}
              placeholder="2/…"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 font-mono text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
          {error && <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-2">
            <button onClick={() => router.back()} className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover">Cancel</button>
            <button
              onClick={connect}
              disabled={!token.trim() || connecting}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {connecting && <Loader2 size={14} className="animate-spin" />}
              Connect
            </button>
          </div>
        </div>
      )}

      {step === 'workspace' && (
        <div className="mt-6 space-y-4">
          <label className="mb-1.5 block text-sm font-medium text-ink">Choose an Asana workspace</label>
          {asanaWorkspaces.map((w) => (
            <button
              key={w.gid}
              onClick={() => { setAsanaWorkspaceGid(w.gid); loadProjects(w.gid); }}
              className="flex w-full items-center justify-between rounded-lg border border-border px-3.5 py-3 text-sm font-medium text-ink hover:border-brand-400 hover:bg-brand-50"
            >
              {w.name}
            </button>
          ))}
          {error && <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        </div>
      )}

      {step === 'projects' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-ink">Select projects to import ({selected.size} selected)</label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Add to team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team</SelectItem>
                {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
            {asanaProjects.map((p) => (
              <label key={p.gid} className="flex cursor-pointer items-center gap-3 border-b border-border px-3.5 py-2.5 last:border-b-0 hover:bg-surface-hover">
                <input type="checkbox" checked={selected.has(p.gid)} onChange={() => toggle(p.gid)} className="h-4 w-4 rounded border-border" />
                <Hash size={13} className="text-ink-faint" />
                <span className="block truncate text-sm text-ink">{p.name}</span>
              </label>
            ))}
            {asanaProjects.length === 0 && <p className="px-3.5 py-8 text-center text-sm text-ink-muted">No active projects found in this workspace.</p>}
          </div>
          {error && <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-2">
            <button onClick={() => router.back()} className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover">Cancel</button>
            <button
              onClick={startImport}
              disabled={selected.size === 0}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              Import {selected.size || ''} project{selected.size === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}

      {(step === 'importing' || step === 'done') && (
        <div className="mt-6 space-y-4">
          <div className="overflow-hidden rounded-xl border border-border">
            {results.map((r) => (
              <div key={r.gid} className="flex items-center gap-3 border-b border-border px-3.5 py-2.5 last:border-b-0">
                {r.status === 'pending' && <span className="h-4 w-4 shrink-0 rounded-full border-2 border-border" />}
                {r.status === 'importing' && <Loader2 size={16} className="shrink-0 animate-spin text-brand-500" />}
                {r.status === 'done' && <CheckCircle2 size={16} className="shrink-0 text-green-600" />}
                {r.status === 'error' && <XCircle size={16} className="shrink-0 text-red-600" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{r.name}</p>
                  {r.status === 'done' && (
                    <p className="text-xs text-ink-faint">
                      {r.tasksImported} tasks imported
                      {!!r.membersShared && ` · shared with ${r.membersShared} teammate${r.membersShared === 1 ? '' : 's'}`}
                    </p>
                  )}
                  {r.status === 'error' && <p className="text-xs text-red-600">{r.message}</p>}
                </div>
                {r.status === 'done' && r.projectId && (
                  <Link href={`/projects/${r.projectId}`} className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700">View</Link>
                )}
              </div>
            ))}
          </div>
          {step === 'done' && (
            <div className="flex justify-end">
              <button onClick={() => router.push('/home')} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
