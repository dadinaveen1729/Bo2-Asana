'use client';

import { useState } from 'react';
import { Check, ChevronDown, Flag, Plus, Tag as TagIcon, User, X } from 'lucide-react';
import { format } from 'date-fns';
import { useWorkspace } from '@/lib/workspace-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar } from '@/components/ui/avatar';
import { MiniCalendar } from '@/components/ui/mini-calendar';
import { cn, PRIORITY_META, isOverdue, isDueSoon } from '@/lib/utils';
import type { Tables } from '@/types/database';

export function AssigneePicker({
  assignee,
  onChange,
  size = 22,
  trigger,
}: {
  assignee: Tables<'profiles'> | null;
  onChange: (userId: string | null) => void;
  size?: number;
  trigger?: React.ReactNode;
}) {
  const { members } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = members.filter((m) => (m.full_name || m.email).toLowerCase().includes(q.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <button className="flex items-center gap-1.5 rounded-md p-0.5 hover:bg-surface-hover">
            {assignee ? (
              <Avatar name={assignee.full_name} email={assignee.email} color={assignee.avatar_color} src={assignee.avatar_url} size={size} />
            ) : (
              <div className="flex items-center justify-center rounded-full border border-dashed border-border-strong text-ink-faint" style={{ width: size, height: size }}>
                <User size={size * 0.55} />
              </div>
            )}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Assign to..."
          className="mb-1.5 w-full rounded-md border border-border px-2.5 py-1.5 text-sm outline-none focus:border-brand-400"
        />
        <div className="max-h-56 space-y-0.5 overflow-y-auto">
          {assignee && (
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-muted hover:bg-surface-hover"
            >
              <X size={14} /> Unassign
            </button>
          )}
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => { onChange(m.id); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover"
            >
              <Avatar name={m.full_name} email={m.email} color={m.avatar_color} src={m.avatar_url} size={22} />
              <span className="truncate text-ink">{m.full_name || m.email}</span>
              {assignee?.id === m.id && <Check size={14} className="ml-auto text-brand-500" />}
            </button>
          ))}
          {filtered.length === 0 && <p className="px-2 py-3 text-center text-xs text-ink-faint">No members found</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DatePickerButton({
  date,
  onChange,
  completed = false,
  label = 'Due date',
}: {
  date: string | null;
  onChange: (d: string | null) => void;
  completed?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const overdue = isOverdue(date, completed);
  const soon = isDueSoon(date, completed);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition',
            date ? 'border-transparent' : 'border-dashed border-border-strong text-ink-faint hover:border-ink-faint',
            overdue && 'bg-red-50 text-red-600',
            soon && !overdue && 'bg-orange-50 text-orange-600',
            date && !overdue && !soon && 'bg-surface-hover text-ink-muted'
          )}
        >
          {date ? format(new Date(date + 'T00:00:00'), 'MMM d') : label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-2">
        <MiniCalendar
          selected={date ? new Date(date + 'T00:00:00') : null}
          onSelect={(d) => { onChange(format(d, 'yyyy-MM-dd')); setOpen(false); }}
          onClear={date ? () => { onChange(null); setOpen(false); } : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}

export function PriorityPicker({ priority, onChange }: { priority: string | null; onChange: (p: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const meta = priority ? PRIORITY_META[priority] : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition',
            meta ? '' : 'border border-dashed border-border-strong text-ink-faint hover:border-ink-faint'
          )}
          style={meta ? { backgroundColor: meta.bg, color: meta.color } : undefined}
        >
          <Flag size={11} />
          {meta ? meta.label : 'Priority'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1.5">
        {Object.entries(PRIORITY_META).map(([key, m]) => (
          <button
            key={key}
            onClick={() => { onChange(key); setOpen(false); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface-hover"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
            {m.label}
            {priority === key && <Check size={13} className="ml-auto text-brand-500" />}
          </button>
        ))}
        {priority && (
          <button onClick={() => { onChange(null); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink-faint hover:bg-surface-hover">
            <X size={13} /> Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function TagPicker({
  tags,
  selectedTags,
  onAdd,
  onRemove,
  onCreate,
}: {
  tags: Tables<'tags'>[];
  selectedTags: Tables<'tags'>[];
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  onCreate: (name: string) => Promise<Tables<'tags'> | null>;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const selectedIds = new Set(selectedTags.map((t) => t.id));
  const filtered = tags.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  const exactMatch = tags.some((t) => t.name.toLowerCase() === q.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 rounded-md border border-dashed border-border-strong px-2 py-1 text-xs font-medium text-ink-faint hover:border-ink-faint">
          <TagIcon size={11} /> Tags
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search or create tag..."
          className="mb-1.5 w-full rounded-md border border-border px-2.5 py-1.5 text-sm outline-none focus:border-brand-400"
        />
        <div className="max-h-48 space-y-0.5 overflow-y-auto">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => (selectedIds.has(t.id) ? onRemove(t.id) : onAdd(t.id))}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="truncate text-ink">{t.name}</span>
              {selectedIds.has(t.id) && <Check size={13} className="ml-auto text-brand-500" />}
            </button>
          ))}
          {q.trim() && !exactMatch && (
            <button
              onClick={async () => {
                const created = await onCreate(q.trim());
                if (created) onAdd(created.id);
                setQ('');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-brand-600 hover:bg-brand-50"
            >
              <Plus size={13} /> Create "{q.trim()}"
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
