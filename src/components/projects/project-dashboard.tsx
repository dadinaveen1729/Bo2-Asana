'use client';

import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSections } from '@/hooks/use-sections';
import { useProjectTasks } from '@/hooks/use-tasks';
import { PRIORITY_META, colorForIndex, cn, isOverdue } from '@/lib/utils';

export function ProjectDashboard({ projectId }: { projectId: string }) {
  const { sections } = useSections(projectId);
  const { tasks, loading } = useProjectTasks(projectId);

  const bySection = useMemo(() => {
    const rows = sections.map((s) => ({ name: s.name, count: tasks.filter((t) => t.section_id === s.id).length }));
    const noSection = tasks.filter((t) => !t.section_id).length;
    if (noSection > 0) rows.push({ name: 'No section', count: noSection });
    return rows;
  }, [sections, tasks]);

  const byAssignee = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const t of tasks) {
      const key = t.assignee?.id || 'unassigned';
      const name = t.assignee ? t.assignee.full_name || t.assignee.email : 'Unassigned';
      const cur = map.get(key) || { name, count: 0 };
      cur.count += 1;
      map.set(key, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [tasks]);

  const byPriority = useMemo(() => {
    const map: Record<string, number> = { high: 0, medium: 0, low: 0, none: 0 };
    for (const t of tasks) {
      const key = t.priority || 'none';
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([key, v]) => ({ key, name: key === 'none' ? 'No priority' : PRIORITY_META[key]?.label || key, count: v }));
  }, [tasks]);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const overdue = tasks.filter((t) => isOverdue(t.due_date, t.completed)).length;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={20} />
      </div>
    );
  }

  return (
    <div className="px-6 py-5">
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatTile label="Total tasks" value={total} />
        <StatTile label="Completed" value={completed} />
        <StatTile label="Overdue" value={overdue} danger={overdue > 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-[13px] font-semibold text-ink">Tasks by status</p>
          {bySection.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bySection} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={40} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {bySection.map((_, i) => (
                    <Cell key={i} fill={colorForIndex(i)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-[13px] font-semibold text-ink">Tasks by assignee</p>
          {byAssignee.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byAssignee} layout="vertical" margin={{ left: 10, right: 16, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {byAssignee.map((_, i) => (
                    <Cell key={i} fill={colorForIndex(i)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border p-4 lg:col-span-2">
          <p className="mb-3 text-[13px] font-semibold text-ink">Tasks by priority</p>
          {byPriority.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byPriority}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {byPriority.map((row) => (
                    <Cell key={row.key} fill={row.key === 'none' ? '#98A2B3' : PRIORITY_META[row.key].color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-[13px] font-medium text-ink-faint">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold', danger ? 'text-red-600' : 'text-ink')}>{value}</p>
    </div>
  );
}

function EmptyChart() {
  return <div className="flex h-[220px] items-center justify-center text-[13px] text-ink-faint">No data yet</div>;
}
