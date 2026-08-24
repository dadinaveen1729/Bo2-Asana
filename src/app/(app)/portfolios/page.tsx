'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { usePortfolios } from '@/hooks/use-portfolios';
import { PROJECT_STATUS_META, colorForIndex } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AvatarStack } from '@/components/ui/avatar';

export default function PortfoliosPage() {
  return (
    <Suspense fallback={null}>
      <PortfoliosPageInner />
    </Suspense>
  );
}

function PortfoliosPageInner() {
  const { workspace, user } = useWorkspace();
  const { portfolios, loading, createPortfolio } = usePortfolios(workspace?.id);
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(searchParams.get('create') === '1');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !user) return;
    setSaving(true);
    await createPortfolio(name.trim(), colorForIndex(portfolios.length), user.id);
    setSaving(false);
    setName('');
    setOpen(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Portfolios</h1>
          <p className="mt-0.5 text-sm text-ink-muted">Track health and status across groups of projects.</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
          <Plus size={15} /> New portfolio
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-500" size={20} /></div>
      ) : portfolios.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border py-16 text-center">
          <Sparkles className="mx-auto mb-2 text-ink-faint" size={22} />
          <p className="text-sm text-ink-muted">No portfolios yet. Group related projects to track them together.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {portfolios.map((p) => (
            <Link key={p.id} href={`/portfolios/${p.id}`} className="rounded-xl border border-border bg-white p-4 transition hover:border-border-strong hover:shadow-panel">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: p.color + '22' }}>
                  <Sparkles size={15} style={{ color: p.color }} />
                </span>
                <span className="truncate text-sm font-semibold text-ink">{p.name}</span>
              </div>
              <p className="mt-2 text-xs text-ink-faint">{p.projects.length} project{p.projects.length === 1 ? '' : 's'}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.projects.slice(0, 4).map((proj) => {
                  const meta = PROJECT_STATUS_META[proj.status];
                  return <span key={proj.id} className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} title={proj.name} />;
                })}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New portfolio</DialogTitle></DialogHeader>
          <div className="px-6 py-4">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Portfolio name"
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
