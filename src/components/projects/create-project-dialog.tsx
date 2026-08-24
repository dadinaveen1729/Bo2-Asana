'use client';

import { useEffect, useState } from 'react';
import { Loader2, Lock, Globe2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/lib/workspace-context';
import { useTeams } from '@/hooks/use-teams-projects';
import { cn, colorForIndex } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = Array.from({ length: 10 }, (_, i) => colorForIndex(i));
const DEFAULT_SECTIONS = ['To do', 'In progress', 'Done'];

export function CreateProjectDialog({
  open,
  onOpenChange,
  defaultTeamId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTeamId?: string | null;
  onCreated?: (projectId: string) => void;
}) {
  const { workspace, user } = useWorkspace();
  const { teams } = useTeams(workspace?.id);
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState<string>('none');
  const [color, setColor] = useState(COLORS[0]);
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setTeamId(defaultTeamId || 'none');
      setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
      setPrivacy('public');
      setError(null);
    }
  }, [open, defaultTeamId]);

  async function handleCreate() {
    if (!name.trim() || !workspace || !user) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspace.id,
        team_id: teamId === 'none' ? null : teamId,
        name: name.trim(),
        color,
        privacy,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError || !project) {
      setError(insertError?.message || 'Could not create project.');
      setLoading(false);
      return;
    }

    await supabase.from('project_members').insert({ project_id: project.id, user_id: user.id, role: 'owner' });
    await supabase
      .from('sections')
      .insert(DEFAULT_SECTIONS.map((n, i) => ({ project_id: project.id, name: n, position: (i + 1) * 1000 })));

    setLoading(false);
    onOpenChange(false);
    onCreated?.(project.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Project name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Q3 Website Redesign"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Team</label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn('h-6 w-6 rounded-full transition', color === c && 'ring-2 ring-offset-2')}
                  style={{ backgroundColor: c, ['--tw-ring-color' as any]: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Privacy</label>
            <div className="flex gap-2">
              <button
                onClick={() => setPrivacy('public')}
                className={cn(
                  'flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                  privacy === 'public' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-border text-ink-muted'
                )}
              >
                <Globe2 size={15} /> Team-wide
              </button>
              <button
                onClick={() => setPrivacy('private')}
                className={cn(
                  'flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                  privacy === 'private' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-border text-ink-muted'
                )}
              >
                <Lock size={15} /> Private
              </button>
            </div>
          </div>

          {error && <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Create project
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
