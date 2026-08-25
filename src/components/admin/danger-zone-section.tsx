'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArchiveRestore, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

type Project = Tables<'projects'>;

export function DangerZoneSection({ workspaceId }: { workspaceId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('archived', true)
      .order('updated_at', { ascending: false });
    if (error) toast.error('Could not load archived projects: ' + error.message);
    setProjects(data || []);
    setLoading(false);
  }, [supabase, workspaceId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`admin-archived-projects:${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `workspace_id=eq.${workspaceId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, workspaceId, load]);

  async function handleUnarchive(id: string) {
    setRestoringId(id);
    const { error } = await supabase.from('projects').update({ archived: false }).eq('id', id);
    setRestoringId(null);
    if (error) {
      toast.error('Could not unarchive project: ' + error.message);
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast.success('Project restored');
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">Danger zone</h2>
      <p className="mt-0.5 text-sm text-ink-muted">Irreversible or high-impact actions live here. Workspace deletion isn&apos;t available from this console.</p>

      <div className="mt-4 rounded-xl border border-border p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-ink-faint" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">Archived projects ({projects.length})</p>
            <p className="mt-0.5 text-sm text-ink-muted">
              Projects hidden from the sidebar via &quot;Archive project&quot;. Restore one if it was archived by mistake.
              This list only shows archived projects you have access to&mdash;private projects you&apos;re not a member of won&apos;t appear here.
            </p>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-brand-500" size={16} />
              </div>
            ) : projects.length === 0 ? (
              <p className="mt-3 text-sm text-ink-faint">No archived projects.</p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-lg border border-border">
                {projects.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color || '#8395A7' }} />
                    <span className="min-w-0 flex-1 block truncate text-sm text-ink">{p.name}</span>
                    <button
                      onClick={() => handleUnarchive(p.id)}
                      disabled={restoringId === p.id}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-ink-muted hover:bg-surface-hover disabled:opacity-50"
                    >
                      {restoringId === p.id ? <Loader2 size={12} className="animate-spin" /> : <ArchiveRestore size={12} />}
                      Unarchive
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
