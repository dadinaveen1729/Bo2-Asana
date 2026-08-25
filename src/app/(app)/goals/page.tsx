'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, Plus, Target } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useGoals } from '@/hooks/use-goals';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar } from '@/components/ui/avatar';

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  not_started: { label: 'Not started', color: '#667085', bg: '#F9FAFB' },
  on_track: { label: 'On track', color: '#17B26A', bg: '#ECFDF3' },
  at_risk: { label: 'At risk', color: '#F79009', bg: '#FFFAEB' },
  off_track: { label: 'Off track', color: '#F04438', bg: '#FEF3F2' },
  achieved: { label: 'Achieved', color: '#6C5CE7', bg: '#F5F3FF' },
  missed: { label: 'Missed', color: '#98A2B3', bg: '#F9FAFB' },
};

export default function GoalsPage() {
  return (
    <Suspense fallback={null}>
      <GoalsPageInner />
    </Suspense>
  );
}

function GoalsPageInner() {
  const { workspace, user } = useWorkspace();
  const { goals, loading, createGoal } = useGoals(workspace?.id);
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(searchParams.get('create') === '1');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !user) return;
    setSaving(true);
    await createGoal(name.trim(), user.id, null);
    setSaving(false);
    setName('');
    setOpen(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Goals</h1>
          <p className="mt-0.5 text-sm text-ink-muted">Set objectives and connect the projects driving them.</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
          <Plus size={15} /> New goal
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-500" size={20} /></div>
      ) : goals.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border py-16 text-center">
          <Target className="mx-auto mb-2 text-ink-faint" size={22} />
          <p className="text-sm text-ink-muted">No goals yet. Set your team's first objective.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          {goals.map((g) => {
            const meta = STATUS_META[g.status];
            return (
              <Link key={g.id} href={`/goals/${g.id}`} className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0 hover:bg-surface-hover">
                <Target size={16} className="shrink-0 text-brand-500" />
                <span className="flex-1 block truncate text-sm font-medium text-ink">{g.name}</span>
                <div className="hidden w-32 items-center gap-2 sm:flex">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-hover">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, g.progress)}%` }} />
                  </div>
                  <span className="text-xs text-ink-faint">{Math.round(g.progress)}%</span>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
                {g.owner && <Avatar name={g.owner.full_name} email={g.owner.email} color={g.owner.avatar_color} src={g.owner.avatar_url} size={24} />}
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New goal</DialogTitle></DialogHeader>
          <div className="px-6 py-4">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Grow retail revenue 20%"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover">Cancel</button>
            <button onClick={handleCreate} disabled={!name.trim() || saving} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />} Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
