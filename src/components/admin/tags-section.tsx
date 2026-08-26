'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Tags as TagsIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useTags } from '@/hooks/use-tags';
import { ColorSwatchPicker, SWATCH_COLORS } from '@/components/admin/color-swatch-picker';
import type { Tables } from '@/types/database';

type Tag = Tables<'tags'>;

export function TagsSection({ workspaceId }: { workspaceId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { tags, createTag, updateTag, deleteTag } = useTags(workspaceId);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingNew, setSavingNew] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      if (tags.length === 0) {
        setCounts({});
        return;
      }
      const { data } = await supabase
        .from('task_tags')
        .select('tag_id')
        .in('tag_id', tags.map((t) => t.id));
      if (cancelled) return;
      const next: Record<string, number> = {};
      (data || []).forEach((row) => {
        next[row.tag_id] = (next[row.tag_id] || 0) + 1;
      });
      setCounts(next);
    }
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [supabase, tags]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSavingNew(true);
    const data = await createTag(newName.trim());
    setSavingNew(false);
    if (!data) {
      toast.error('Could not create tag.');
      return;
    }
    setCreating(false);
    setNewName('');
  }

  async function handleRename(id: string, name: string) {
    const { error } = await updateTag(id, { name });
    if (error) toast.error('Could not rename tag: ' + error.message);
  }

  async function handleRecolor(id: string, color: string) {
    const { error } = await updateTag(id, { color });
    if (error) toast.error('Could not recolor tag: ' + error.message);
  }

  async function handleDelete(id: string) {
    const { error } = await deleteTag(id);
    if (error) {
      toast.error('Could not delete tag: ' + error.message);
      return;
    }
    setConfirmDeleteId(null);
    toast.success('Tag deleted and removed from any tasks that had it.');
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Tags ({tags.length})</h2>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover"
        >
          <Plus size={13} /> New tag
        </button>
      </div>
      <p className="mt-0.5 text-sm text-ink-muted">Workspace-wide tags any member can attach to tasks.</p>

      {creating && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border p-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Tag name"
            className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || savingNew}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {savingNew && <Loader2 size={12} className="animate-spin" />}
            Create
          </button>
          <button
            onClick={() => {
              setCreating(false);
              setNewName('');
            }}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover"
          >
            Cancel
          </button>
        </div>
      )}

      {tags.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-border py-8 text-center text-sm text-ink-faint">
          <TagsIcon className="mx-auto mb-2" size={18} />
          No tags yet — a blank canvas, really.
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          {tags.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              usageCount={counts[tag.id] || 0}
              onRename={(name) => handleRename(tag.id, name)}
              onRecolor={(color) => handleRecolor(tag.id, color)}
              confirming={confirmDeleteId === tag.id}
              onDeleteClick={() => setConfirmDeleteId((cur) => (cur === tag.id ? null : tag.id))}
              onDeleteConfirm={() => handleDelete(tag.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TagRow({
  tag,
  usageCount,
  onRename,
  onRecolor,
  confirming,
  onDeleteClick,
  onDeleteConfirm,
}: {
  tag: Tag;
  usageCount: number;
  onRename: (name: string) => void;
  onRecolor: (color: string) => void;
  confirming: boolean;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
}) {
  const [name, setName] = useState(tag.name);
  useEffect(() => setName(tag.name), [tag.name]);
  const dirty = !!name.trim() && name !== tag.name;

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <ColorSwatchPicker value={tag.color || SWATCH_COLORS[0]} onChange={onRecolor} />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => dirty && onRename(name.trim())}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-ink hover:border-border focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
      />
      <span className="shrink-0 text-xs text-ink-faint">
        {usageCount} task{usageCount === 1 ? '' : 's'}
      </span>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={onDeleteConfirm} className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700">
            Confirm
          </button>
          <button onClick={onDeleteClick} className="rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-surface-hover">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={onDeleteClick} className="shrink-0 rounded-md p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
