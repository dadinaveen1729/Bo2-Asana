'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, MoreHorizontal, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { usePortfolios } from '@/hooks/use-portfolios';
import { useProjects } from '@/hooks/use-teams-projects';
import { createClient } from '@/lib/supabase/client';
import { PROJECT_STATUS_META } from '@/lib/utils';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function PortfolioDetailPage({ params }: { params: { portfolioId: string } }) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { portfolios, addProject, removeProject } = usePortfolios(workspace?.id);
  const { projects } = useProjects(workspace?.id);
  const [q, setQ] = useState('');

  const portfolio = portfolios.find((p) => p.id === params.portfolioId);
  if (!portfolio) return null;

  const linkedIds = new Set(portfolio.projects.map((p) => p.id));
  const available = projects.filter((p) => !linkedIds.has(p.id) && p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <button onClick={() => router.push('/portfolios')} className="mb-4 flex items-center gap-1 text-xs font-medium text-ink-faint hover:text-ink-muted">
        <ChevronLeft size={13} /> Portfolios
      </button>

      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: portfolio.color + '22' }}>
          <Sparkles size={18} style={{ color: portfolio.color }} />
        </span>
        <h1 className="text-2xl font-semibold text-ink">{portfolio.name}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-auto rounded-md p-2 text-ink-faint hover:bg-surface-hover"><MoreHorizontal size={16} /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-red-600 data-[highlighted]:bg-red-50"
              onSelect={async () => {
                const supabase = createClient();
                await supabase.from('portfolios').delete().eq('id', portfolio.id);
                router.push('/portfolios');
              }}
            >
              <Trash2 size={13} /> Delete portfolio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Projects ({portfolio.projects.length})</h2>
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover">
              <Plus size={13} /> Add project
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects..."
              className="mb-1.5 w-full rounded-md border border-border px-2.5 py-1.5 text-sm outline-none focus:border-brand-400"
            />
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {available.map((p) => (
                <button key={p.id} onClick={() => addProject(portfolio.id, p.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || '#FC636B' }} />
                  <span className="block truncate">{p.name}</span>
                </button>
              ))}
              {available.length === 0 && <p className="px-2 py-3 text-center text-xs text-ink-faint">No projects found</p>}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        {portfolio.projects.map((p) => {
          const meta = PROJECT_STATUS_META[p.status];
          return (
            <div key={p.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-hover">
              <Link href={`/projects/${p.id}`} className="flex flex-1 items-center gap-2 truncate text-sm font-medium text-ink">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color || '#FC636B' }} />
                {p.name}
              </Link>
              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
              <button onClick={() => removeProject(portfolio.id, p.id)} className="text-ink-faint hover:text-ink"><X size={14} /></button>
            </div>
          );
        })}
        {portfolio.projects.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-faint">No projects added yet. This portfolio is looking pretty minimalist.</p>}
      </div>
    </div>
  );
}
