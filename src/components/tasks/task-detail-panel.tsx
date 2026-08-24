'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell, BellOff, Check, ChevronRight, Copy, Heart, Link2, Loader2, MoreHorizontal,
  Plus, Send, Trash2, X, ExternalLink, GitBranch,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { useWorkspace } from '@/lib/workspace-context';
import { useTaskPanel } from '@/lib/task-panel-context';
import { useTaskDetail } from '@/hooks/use-task-detail';
import { useTags } from '@/hooks/use-tags';
import { useCustomFields } from '@/hooks/use-custom-fields';
import { useSections } from '@/hooks/use-sections';
import { AssigneePicker, DatePickerButton, PriorityPicker, TagPicker } from '@/components/tasks/pickers';
import { CustomFieldInput } from '@/components/tasks/custom-field-input';
import { TaskAttachments } from '@/components/tasks/task-attachments';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function useAutoResize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);
  return ref;
}

export function TaskDetailPanel() {
  const { openTaskId, closeTask, openTask } = useTaskPanel();
  return (
    <Sheet open={!!openTaskId} onOpenChange={(v) => !v && closeTask()} modal={false}>
      <SheetContent width={620} overlay={false}>
        <SheetTitle className="sr-only">Task details</SheetTitle>
        {openTaskId && <TaskDetailBody taskId={openTaskId} onClose={closeTask} onOpenTask={openTask} />}
      </SheetContent>
    </Sheet>
  );
}

function TaskDetailBody({ taskId, onClose, onOpenTask }: { taskId: string; onClose: () => void; onOpenTask: (id: string) => void }) {
  const router = useRouter();
  const { user, members } = useWorkspace();
  const {
    task, comments, activity, customValues, attachments, dependencies, dependents, followers, likes, loading,
    updateTask, addComment, toggleLike, toggleFollow, addTag, removeTag, setCustomFieldValue,
    addSubtask, addDependency, removeDependency, moveToSection,
  } = useTaskDetail(taskId);

  const primaryProjectLink = task?.projects?.[0] || null;
  const primaryProject = primaryProjectLink?.project || null;
  const { tags, createTag } = useTags(primaryProject?.workspace_id);
  const { fields } = useCustomFields(primaryProject?.id);
  const { sections } = useSections(primaryProject?.id);

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [comment, setComment] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [posting, setPosting] = useState(false);
  const [depQuery, setDepQuery] = useState('');
  const [depResults, setDepResults] = useState<{ id: string; name: string }[]>([]);
  const [showDepSearch, setShowDepSearch] = useState(false);

  useEffect(() => {
    if (task) {
      setName(task.name);
      setNotes(task.notes || '');
    }
  }, [task?.id, task?.name, task?.notes]);

  const notesRef = useAutoResize(notes);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!depQuery.trim() || !primaryProject) { setDepResults([]); return; }
      const supabase = createClient();
      const { data } = await supabase
        .from('tasks')
        .select('id, name')
        .eq('workspace_id', primaryProject.workspace_id)
        .ilike('name', `%${depQuery}%`)
        .neq('id', taskId)
        .limit(6);
      setDepResults(data || []);
    }, 200);
    return () => clearTimeout(t);
  }, [depQuery, primaryProject, taskId]);

  if (loading || !task) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={20} />
      </div>
    );
  }

  const iLike = user ? likes.includes(user.id) : false;
  const iFollow = user ? followers.includes(user.id) : false;
  const feed = [
    ...comments.map((c) => ({ type: 'comment' as const, at: c.created_at, data: c })),
    ...activity
      .filter((a) => a.action !== 'created')
      .map((a) => ({ type: 'activity' as const, at: a.created_at, data: a })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  async function handleComment() {
    if (!comment.trim() || !user) return;
    setPosting(true);
    await addComment(user.id, comment);
    setComment('');
    setPosting(false);
  }

  function activityText(a: typeof activity[number]) {
    const who = a.actor?.full_name || a.actor?.email || 'Someone';
    switch (a.action) {
      case 'completed': return `${who} marked this task complete`;
      case 'reassigned': return (a.meta as any)?.assignee_id ? `${who} changed the assignee` : `${who} unassigned this task`;
      case 'due_date_changed': return `${who} changed the due date`;
      default: return `${who} ${a.action}`;
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Checkbox checked={task.completed} onCheckedChange={(v) => updateTask({ completed: !!v })} />
          <span className="text-sm font-medium text-ink-muted">{task.completed ? 'Completed' : 'Mark complete'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => user && toggleLike(user.id)}
            className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium', iLike ? 'text-brand-600' : 'text-ink-faint hover:bg-surface-hover')}
          >
            <Heart size={14} fill={iLike ? 'currentColor' : 'none'} /> {likes.length || ''}
          </button>
          <button
            onClick={() => user && toggleFollow(user.id)}
            className={cn('rounded-md p-1.5', iFollow ? 'text-brand-600' : 'text-ink-faint hover:bg-surface-hover')}
            title={iFollow ? 'Following' : 'Follow'}
          >
            {iFollow ? <Bell size={15} /> : <BellOff size={15} />}
          </button>
          <button
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/tasks/${task.id}`); toast.success('Link copied'); }}
            className="rounded-md p-1.5 text-ink-faint hover:bg-surface-hover"
            title="Copy link"
          >
            <Link2 size={15} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md p-1.5 text-ink-faint hover:bg-surface-hover"><MoreHorizontal size={16} /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => router.push(`/tasks/${task.id}`)}>
                <ExternalLink size={14} /> Open full page
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 data-[highlighted]:bg-red-50"
                onSelect={async () => {
                  const supabase = createClient();
                  await supabase.from('tasks').delete().eq('id', task.id);
                  onClose();
                  toast.success('Task deleted');
                }}
              >
                <Trash2 size={14} /> Delete task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button onClick={onClose} className="ml-1 rounded-md p-1.5 text-ink-faint hover:bg-surface-hover"><X size={16} /></button>
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">
        <textarea
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== task.name && updateTask({ name: name.trim() })}
          rows={1}
          className="w-full resize-none border-none p-0 text-2xl font-semibold text-ink outline-none placeholder:text-ink-faint"
          placeholder="Task name"
        />

        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs font-medium text-ink-faint">Assignee</span>
            <AssigneePicker
              assignee={task.assignee}
              onChange={(id) => updateTask({ assignee_id: id })}
              trigger={
                <button className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-surface-hover">
                  <Avatar name={task.assignee?.full_name} email={task.assignee?.email} color={task.assignee?.avatar_color} src={task.assignee?.avatar_url} size={22} />
                  <span className={task.assignee ? 'text-ink' : 'text-ink-faint'}>{task.assignee ? task.assignee.full_name || task.assignee.email : 'Unassigned'}</span>
                </button>
              }
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs font-medium text-ink-faint">Due date</span>
            <DatePickerButton date={task.due_date} completed={task.completed} onChange={(d) => updateTask({ due_date: d })} />
          </div>
          {primaryProject && (
            <div className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs font-medium text-ink-faint">Projects</span>
              <div className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: primaryProject.color || '#FC636B' }} />
                <span className="text-ink">{primaryProject.name}</span>
                {sections.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="ml-1 flex items-center gap-1 rounded-md bg-surface-hover px-1.5 py-0.5 text-xs font-medium text-ink-muted hover:bg-border">
                        {sections.find((s) => s.id === primaryProjectLink?.section_id)?.name || 'No section'}
                        <ChevronRight size={11} className="rotate-90" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {sections.map((s) => (
                        <DropdownMenuItem key={s.id} onSelect={() => primaryProject && moveToSection(primaryProject.id, s.id)}>
                          {s.id === primaryProjectLink?.section_id && <Check size={13} className="text-brand-500" />}
                          {s.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs font-medium text-ink-faint">Priority</span>
            <PriorityPicker priority={task.priority} onChange={(p) => updateTask({ priority: p as any })} />
          </div>
          <div className="flex items-start gap-3">
            <span className="w-24 shrink-0 pt-1 text-xs font-medium text-ink-faint">Tags</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {task.tags.map((t) => (
                <span key={t.id} className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: t.color + '22', color: t.color }}>
                  {t.name}
                  <button onClick={() => removeTag(t.id)}><X size={10} /></button>
                </span>
              ))}
              <TagPicker tags={tags} selectedTags={task.tags} onAdd={addTag} onRemove={removeTag} onCreate={createTag} />
            </div>
          </div>

          {fields.map((f) => (
            <div key={f.id} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs font-medium text-ink-faint">{f.name}</span>
              <CustomFieldInput
                field={f}
                value={customValues.find((v) => v.custom_field_id === f.id) || null}
                onChange={(patch) => setCustomFieldValue(f.id, patch)}
                members={members}
              />
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <textarea
            ref={notesRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (task.notes || '') && updateTask({ notes: notes || null })}
            placeholder="Add a description..."
            rows={1}
            className="w-full resize-none rounded-lg border-none p-0 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-faint"
          />
        </div>

        {/* Subtasks */}
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Subtasks {task.subtasks.length > 0 && `(${task.subtasks.filter((s) => s.completed).length}/${task.subtasks.length})`}
          </p>
          <div className="space-y-0.5">
            {task.subtasks.map((s) => (
              <button
                key={s.id}
                onClick={() => onOpenTask(s.id)}
                className="group flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-surface-hover"
              >
                <Checkbox
                  checked={s.completed}
                  onCheckedChange={async (v) => {
                    const supabase = createClient();
                    await supabase.from('tasks').update({ completed: !!v }).eq('id', s.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className={cn('flex-1 truncate text-sm', s.completed ? 'text-ink-faint line-through' : 'text-ink')}>{s.name}</span>
                <ChevronRight size={14} className="text-ink-faint opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
          <div className="mt-1 flex items-center gap-2 px-1.5 py-1">
            <Plus size={14} className="text-ink-faint" />
            <input
              value={subtaskInput}
              onChange={(e) => setSubtaskInput(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && subtaskInput.trim() && user) {
                  await addSubtask(subtaskInput.trim(), user.id);
                  setSubtaskInput('');
                }
              }}
              placeholder="Add subtask"
              className="flex-1 border-none bg-transparent p-0 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
        </div>

        {/* Attachments */}
        <div className="mt-5 border-t border-border pt-4">
          <TaskAttachments taskId={task.id} attachments={attachments} />
        </div>

        {/* Dependencies */}
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            <GitBranch size={12} /> Dependencies
          </p>
          {dependencies.length > 0 && (
            <div className="mb-1.5">
              <p className="mb-1 text-xs text-ink-faint">Blocked by</p>
              {dependencies.map((d) => d.depends_on && (
                <div key={d.depends_on_task_id} className="flex items-center justify-between rounded-lg px-1.5 py-1 hover:bg-surface-hover">
                  <button onClick={() => onOpenTask(d.depends_on_task_id)} className="truncate text-left text-sm text-ink">{d.depends_on.name}</button>
                  <button onClick={() => removeDependency(d.depends_on_task_id)} className="text-ink-faint hover:text-ink"><X size={13} /></button>
                </div>
              ))}
            </div>
          )}
          {dependents.length > 0 && (
            <div className="mb-1.5">
              <p className="mb-1 text-xs text-ink-faint">Blocking</p>
              {dependents.map((d) => d.depends_on && (
                <div key={d.task_id} className="rounded-lg px-1.5 py-1 hover:bg-surface-hover">
                  <button onClick={() => onOpenTask(d.task_id)} className="truncate text-left text-sm text-ink">{d.depends_on.name}</button>
                </div>
              ))}
            </div>
          )}
          {!showDepSearch ? (
            <button onClick={() => setShowDepSearch(true)} className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-ink-faint hover:bg-surface-hover">
              <Plus size={13} /> Mark as blocked by
            </button>
          ) : (
            <div className="relative">
              <input
                autoFocus
                value={depQuery}
                onChange={(e) => setDepQuery(e.target.value)}
                onBlur={() => setTimeout(() => setShowDepSearch(false), 150)}
                placeholder="Search tasks..."
                className="w-full rounded-md border border-border px-2.5 py-1.5 text-sm outline-none focus:border-brand-400"
              />
              {depResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-white p-1 shadow-popover">
                  {depResults.map((r) => (
                    <button
                      key={r.id}
                      onMouseDown={() => { addDependency(r.id); setDepQuery(''); setShowDepSearch(false); }}
                      className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-hover"
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activity + comments feed */}
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Activity</p>
          <div className="space-y-3.5">
            {feed.map((item, i) =>
              item.type === 'comment' ? (
                <div key={`c-${i}`} className="flex gap-2.5">
                  <Avatar name={item.data.author?.full_name} email={item.data.author?.email} color={item.data.author?.avatar_color} src={item.data.author?.avatar_url} size={26} />
                  <div className="flex-1 rounded-xl bg-surface-hover px-3 py-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-ink">{item.data.author?.full_name || item.data.author?.email}</span>
                      <span className="text-[11px] text-ink-faint">{formatDistanceToNow(new Date(item.at), { addSuffix: true })}</span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink">{item.data.body}</p>
                  </div>
                </div>
              ) : (
                <div key={`a-${i}`} className="flex items-center gap-2.5 pl-1 text-xs text-ink-faint">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-border-strong" />
                  {activityText(item.data)}
                  <span>· {formatDistanceToNow(new Date(item.at), { addSuffix: true })}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-white px-3 py-2 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleComment();
              }
            }}
            placeholder="Leave a comment..."
            rows={1}
            className="max-h-32 flex-1 resize-none border-none bg-transparent p-0 text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <button
            onClick={handleComment}
            disabled={!comment.trim() || posting}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white disabled:opacity-40"
          >
            {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}
