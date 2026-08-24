'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/lib/workspace-context';
import { cn, colorForIndex } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

const COLORS = Array.from({ length: 10 }, (_, i) => colorForIndex(i));

export function CreateTeamDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { workspace, user } = useWorkspace();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
      setError(null);
    }
  }, [open]);

  async function handleCreate() {
    if (!name.trim() || !workspace || !user) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: team, error: insertError } = await supabase
      .from('teams')
      .insert({ workspace_id: workspace.id, name: name.trim(), description: description.trim() || null, color, created_by: user.id })
      .select()
      .single();

    if (insertError || !team) {
      setError(insertError?.message || 'Could not create team.');
      setLoading(false);
      return;
    }

    await supabase.from('team_members').insert({ team_id: team.id, user_id: user.id, role: 'lead' });

    setLoading(false);
    onOpenChange(false);
    router.push(`/teams/${team.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New team</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Team name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Operations"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What does this team work on?"
              className="w-full resize-none rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
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
            Create team
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
