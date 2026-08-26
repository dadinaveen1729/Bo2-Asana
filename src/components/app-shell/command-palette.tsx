'use client';

import { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { Home, CheckSquare, Inbox, Hash, Users, Search, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/lib/workspace-context';
import { useProjects, useTeams } from '@/hooks/use-teams-projects';

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { projects } = useProjects(workspace?.id);
  const { teams } = useTeams(workspace?.id);
  const [query, setQuery] = useState('');
  const [taskResults, setTaskResults] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape') onOpenChange(false);
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim() || !workspace) {
        setTaskResults([]);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from('tasks')
        .select('id, name')
        .eq('workspace_id', workspace.id)
        .ilike('name', `%${q}%`)
        .limit(8);
      setTaskResults(data || []);
    },
    [workspace]
  );

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  function go(path: string) {
    router.push(path);
    onOpenChange(false);
    setQuery('');
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-[12vh] backdrop-blur-[1px]" onClick={() => onOpenChange(false)}>
      <Command
        shouldFilter={false}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <Search size={16} className="text-ink-faint" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search tasks, projects, teams — go on, ask"
            className="flex-1 border-none text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-ink-faint">ESC</kbd>
        </div>
        <Command.List className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-sm text-ink-faint">No results found — not even an echo.</Command.Empty>

          {!query && (
            <Command.Group heading="Navigate" className="px-2 py-1.5 text-[11px] font-semibold uppercase text-ink-faint [&_[cmdk-group-items]]:mt-1">
              <Command.Item onSelect={() => go('/home')} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink aria-selected:bg-surface-hover">
                <Home size={15} /> Home
              </Command.Item>
              <Command.Item onSelect={() => go('/my-tasks')} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink aria-selected:bg-surface-hover">
                <CheckSquare size={15} /> My tasks
              </Command.Item>
              <Command.Item onSelect={() => go('/inbox')} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink aria-selected:bg-surface-hover">
                <Inbox size={15} /> Inbox
              </Command.Item>
            </Command.Group>
          )}

          {taskResults.length > 0 && (
            <Command.Group heading="Tasks" className="px-2 py-1.5 text-[11px] font-semibold uppercase text-ink-faint [&_[cmdk-group-items]]:mt-1">
              {taskResults.map((t) => (
                <Command.Item
                  key={t.id}
                  onSelect={() => go(`/tasks/${t.id}`)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink aria-selected:bg-surface-hover"
                >
                  <FileText size={15} className="text-ink-faint" /> {t.name}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Projects" className="px-2 py-1.5 text-[11px] font-semibold uppercase text-ink-faint [&_[cmdk-group-items]]:mt-1">
            {projects
              .filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 8)
              .map((p) => (
                <Command.Item
                  key={p.id}
                  onSelect={() => go(`/projects/${p.id}`)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink aria-selected:bg-surface-hover"
                >
                  <Hash size={15} style={{ color: p.color || '#F14545' }} /> {p.name}
                </Command.Item>
              ))}
          </Command.Group>

          <Command.Group heading="Teams" className="px-2 py-1.5 text-[11px] font-semibold uppercase text-ink-faint [&_[cmdk-group-items]]:mt-1">
            {teams
              .filter((t) => !query || t.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 8)
              .map((t) => (
                <Command.Item
                  key={t.id}
                  onSelect={() => go(`/teams/${t.id}`)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink aria-selected:bg-surface-hover"
                >
                  <Users size={15} /> {t.name}
                </Command.Item>
              ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
