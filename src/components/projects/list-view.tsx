'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import {
  ArrowUpDown, Check, ChevronDown, ChevronRight, Copy, ExternalLink, Filter, Flag,
  GitBranch, Layers, Link2, ListPlus, MoreHorizontal, Plus, Search, SlidersHorizontal,
  SquareCheck, Target, Trash2, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/lib/workspace-context';
import { useSections } from '@/hooks/use-sections';
import { useProjectTasks, type ProjectTask } from '@/hooks/use-tasks';
import { useCustomFields, type CustomField } from '@/hooks/use-custom-fields';
import { useTaskPanel } from '@/lib/task-panel-context';
import { useUndo } from '@/lib/undo-context';
import { TaskRow } from '@/components/tasks/task-row';
import { AssigneePicker, DatePickerButton, PriorityPicker } from '@/components/tasks/pickers';
import { CustomFieldInput } from '@/components/tasks/custom-field-input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub,
  ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { cn, PRIORITY_META, isOverdue, isDueSoon } from '@/lib/utils';
import type { Tables } from '@/types/database';

const NONE = '__none__';

type CustomFieldValue = Tables<'custom_field_values'>;

type SortField = 'manual' | 'name' | 'priority' | 'due_date';
type SortDir = 'asc' | 'desc';
type GroupField = 'section' | 'priority' | 'assignee' | 'due_date';
type DueFilter = 'any' | 'overdue' | 'has_due' | 'no_due';

const PRIORITY_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3 };

const PRIORITY_GROUPS = [
  { key: 'high', name: 'High priority' },
  { key: 'medium', name: 'Medium priority' },
  { key: 'low', name: 'Low priority' },
  { key: 'none', name: 'No priority' },
];

const DUE_GROUPS = [
  { key: 'overdue', name: 'Overdue' },
  { key: 'soon', name: 'Due soon' },
  { key: 'later', name: 'Later' },
  { key: 'none', name: 'No due date' },
];

const DUE_FILTER_OPTIONS: { key: DueFilter; label: string }[] = [
  { key: 'any', label: 'Any' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'has_due', label: 'Has due date' },
  { key: 'no_due', label: 'No due date' },
];

const SORT_OPTIONS: { field: SortField; dir: SortDir; label: string }[] = [
  { field: 'manual', dir: 'asc', label: 'Manual (drag order)' },
  { field: 'name', dir: 'asc', label: 'Name (A → Z)' },
  { field: 'name', dir: 'desc', label: 'Name (Z → A)' },
  { field: 'priority', dir: 'desc', label: 'Priority (High → Low)' },
  { field: 'priority', dir: 'asc', label: 'Priority (Low → High)' },
  { field: 'due_date', dir: 'asc', label: 'Due date (Earliest first)' },
  { field: 'due_date', dir: 'desc', label: 'Due date (Latest first)' },
];

const GROUP_OPTIONS: { field: GroupField; label: string }[] = [
  { field: 'section', label: 'Section' },
  { field: 'priority', label: 'Priority' },
  { field: 'assignee', label: 'Assignee' },
  { field: 'due_date', label: 'Due date' },
];

function dueBucketOf(t: ProjectTask): string {
  if (!t.due_date) return 'none';
  if (isOverdue(t.due_date, t.completed)) return 'overdue';
  if (isDueSoon(t.due_date, t.completed)) return 'soon';
  return 'later';
}

// Pixel widths shared by the header row and every task row's grid-template
// so custom-field columns always line up exactly, whatever fields a
// project has defined.
function fieldColPx(type: CustomField['type']) {
  switch (type) {
    case 'checkbox': return 60;
    case 'number': return 90;
    case 'date': return 110;
    case 'people': return 130;
    case 'multi_select': return 160;
    case 'single_select': return 130;
    default: return 120;
  }
}

const DEFAULT_COL_WIDTHS: Record<string, number> = {
  name: 320,
  assignee: 64,
  priority: 108,
  due_date: 100,
};
const MIN_COL_WIDTH: Record<string, number> = {
  name: 160,
  assignee: 48,
  priority: 70,
  due_date: 70,
};
const ADD_COL_COL = '32px';

// Column widths are user-adjustable (see ResizeHandle) and persisted per
// project in localStorage, so both header and row share this one function
// -- same reasoning as the shared rowGridTemplate this replaces: whatever
// widths are in play, header and row must build their grid-template from
// the identical source or they drift out of alignment.
function rowGridTemplate(fields: CustomField[], colWidths: Record<string, number>) {
  const w = (key: string, fallback: number) => `${colWidths[key] ?? fallback}px`;
  return [
    w('name', DEFAULT_COL_WIDTHS.name),
    w('assignee', DEFAULT_COL_WIDTHS.assignee),
    w('priority', DEFAULT_COL_WIDTHS.priority),
    w('due_date', DEFAULT_COL_WIDTHS.due_date),
    ...fields.map((f) => w(f.id, fieldColPx(f.type))),
    ADD_COL_COL,
  ].join(' ');
}

// A thin drag strip on a header cell's right edge, matching Asana's
// column-resize interaction. Uses the pointer capture API directly rather
// than a drag-and-drop library since this is a single-axis width drag, not
// a reorder -- dnd-kit (already in this file for task reordering) is the
// wrong tool for it.
function ResizeHandle({
  colKey,
  min,
  colWidths,
  onResize,
}: {
  colKey: string;
  min: number;
  colWidths: Record<string, number>;
  onResize: (colKey: string, width: number) => void;
}) {
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] ?? DEFAULT_COL_WIDTHS[colKey] ?? 120;
    function onMove(ev: PointerEvent) {
      onResize(colKey, Math.max(min, startWidth + (ev.clientX - startX)));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }
  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize select-none"
    >
      <div className="mx-auto h-full w-px bg-transparent hover:bg-brand-400 active:bg-brand-500" />
    </div>
  );
}

export function ListView({ projectId, onAddColumn }: { projectId: string; onAddColumn?: () => void }) {
  const { workspace, user, members } = useWorkspace();
  const { sections, createSection, renameSection, deleteSection } = useSections(projectId);
  const { tasks, createTask, moveTask, toggleComplete } = useProjectTasks(projectId);
  const { fields } = useCustomFields(projectId);
  const { openTask } = useTaskPanel();
  const { pushUndo } = useUndo();
  const supabase = useMemo(() => createClient(), []);

  const [columns, setColumns] = useState<Record<string, string[]>>({});
  const [colWidths, setColWidthsState] = useState<Record<string, number>>(DEFAULT_COL_WIDTHS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [customValues, setCustomValues] = useState<CustomFieldValue[]>([]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('manual');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [groupField, setGroupField] = useState<GroupField>('section');
  const [filterPriorities, setFilterPriorities] = useState<Set<string>>(new Set());
  const [filterAssignees, setFilterAssignees] = useState<Set<string>>(new Set());
  const [filterDue, setFilterDue] = useState<DueFilter>('any');
  const [hiddenFieldIds, setHiddenFieldIds] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const taskById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

  const fieldIds = useMemo(() => fields.map((f) => f.id), [fields]);
  const visibleFields = useMemo(() => fields.filter((f) => !hiddenFieldIds.has(f.id)), [fields, hiddenFieldIds]);

  // Column widths are remembered per project, same idea as Asana's own
  // per-project column sizing. Loaded in an effect (not the useState
  // initializer) so the very first server-rendered pass always matches the
  // client's pre-hydration pass -- reading localStorage during render would
  // make them diverge and trigger a hydration mismatch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`boosthub-list-col-widths-${projectId}`);
      if (raw) setColWidthsState({ ...DEFAULT_COL_WIDTHS, ...JSON.parse(raw) });
    } catch {
      // corrupt/blocked storage -- just keep the defaults
    }
  }, [projectId]);

  function resizeColumn(colKey: string, width: number) {
    setColWidthsState((prev) => {
      const next = { ...prev, [colKey]: Math.round(width) };
      try {
        localStorage.setItem(`boosthub-list-col-widths-${projectId}`, JSON.stringify(next));
      } catch {
        // best-effort persistence -- resizing still works for this session either way
      }
      return next;
    });
  }

  const dndEnabled = groupField === 'section' && sortField === 'manual';
  const activeFilterCount = filterPriorities.size + filterAssignees.size + (filterDue !== 'any' ? 1 : 0);

  useEffect(() => {
    if (fieldIds.length === 0) {
      setCustomValues([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('custom_field_values').select('*').in('custom_field_id', fieldIds);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!cancelled) setCustomValues(data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, fieldIds]);

  useEffect(() => {
    if (fieldIds.length === 0) return;
    const channel = supabase
      .channel(`list-view-custom-values:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_field_values' }, async () => {
        const { data, error } = await supabase.from('custom_field_values').select('*').in('custom_field_id', fieldIds);
        if (error) {
          toast.error(error.message);
          return;
        }
        setCustomValues(data || []);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, projectId, fieldIds]);

  async function setCellValue(taskId: string, fieldId: string, patch: Partial<CustomFieldValue>) {
    const { error } = await supabase
      .from('custom_field_values')
      .upsert({ task_id: taskId, custom_field_id: fieldId, ...patch }, { onConflict: 'task_id,custom_field_id' });
    if (error) toast.error(error.message);
  }

  async function updateTaskField(taskId: string, patch: Partial<Pick<ProjectTask, 'assignee_id' | 'priority' | 'due_date'>>) {
    const { error } = await supabase.from('tasks').update(patch).eq('id', taskId);
    if (error) toast.error(error.message);
  }

  const groupMetas = useMemo((): { id: string; name: string; isSection: boolean }[] => {
    if (groupField === 'section') {
      const hasUnsectioned = tasks.some((t) => !t.section_id) || sections.length === 0;
      return [
        ...sections.map((s) => ({ id: s.id, name: s.name, isSection: true })),
        ...(hasUnsectioned ? [{ id: NONE, name: 'Tasks', isSection: false }] : []),
      ];
    }
    if (groupField === 'priority') return PRIORITY_GROUPS.map((g) => ({ id: g.key, name: g.name, isSection: false }));
    if (groupField === 'assignee') {
      return [
        ...members.map((m) => ({ id: m.id, name: m.full_name || m.email, isSection: false })),
        { id: 'unassigned', name: 'Unassigned', isSection: false },
      ];
    }
    return DUE_GROUPS.map((g) => ({ id: g.key, name: g.name, isSection: false }));
  }, [groupField, sections, members, tasks]);

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();

    function passesFilters(t: ProjectTask) {
      if (!showCompleted && t.completed) return false;
      if (query && !t.name.toLowerCase().includes(query)) return false;
      if (filterPriorities.size > 0 && !filterPriorities.has(t.priority ?? 'none')) return false;
      if (filterAssignees.size > 0 && !filterAssignees.has(t.assignee_id ?? 'unassigned')) return false;
      if (filterDue === 'overdue' && !isOverdue(t.due_date, t.completed)) return false;
      if (filterDue === 'has_due' && !t.due_date) return false;
      if (filterDue === 'no_due' && t.due_date) return false;
      return true;
    }

    function bucketKey(t: ProjectTask): string {
      if (groupField === 'section') return t.section_id ?? NONE;
      if (groupField === 'priority') return t.priority ?? 'none';
      if (groupField === 'assignee') return t.assignee_id ?? 'unassigned';
      return dueBucketOf(t);
    }

    function compareTasks(a: ProjectTask, b: ProjectTask): number {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'priority') cmp = (PRIORITY_ORDER[a.priority ?? ''] ?? 0) - (PRIORITY_ORDER[b.priority ?? ''] ?? 0);
      else if (sortField === 'due_date') {
        const av = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const bv = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        cmp = av - bv;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    }

    const base = tasks.filter(passesFilters);
    const next: Record<string, string[]> = {};
    for (const g of groupMetas) {
      const inGroup = base.filter((t) => bucketKey(t) === g.id);
      const ordered = sortField === 'manual'
        ? [...inGroup].sort((a, b) => a.tp_position - b.tp_position)
        : [...inGroup].sort(compareTasks);
      next[g.id] = ordered.map((t) => t.id);
    }
    setColumns(next);
  }, [tasks, groupMetas, groupField, sortField, sortDir, showCompleted, searchQuery, filterPriorities, filterAssignees, filterDue]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function containerOf(id: string): string | null {
    if (columns[id]) return id;
    for (const [key, ids] of Object.entries(columns)) if (ids.includes(id)) return key;
    return null;
  }

  function handleDragStart(e: DragStartEvent) {
    if (!dndEnabled) return;
    setActiveId(e.active.id as string);
  }

  function handleDragOver(e: DragOverEvent) {
    if (!dndEnabled) return;
    const { active, over } = e;
    if (!over) return;
    const activeContainer = containerOf(active.id as string);
    const overContainer = containerOf(over.id as string);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setColumns((prev) => {
      const activeItems = prev[activeContainer].filter((id) => id !== active.id);
      const overItems = [...prev[overContainer]];
      const overIndex = overItems.indexOf(over.id as string);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      overItems.splice(insertAt, 0, active.id as string);
      return { ...prev, [activeContainer]: activeItems, [overContainer]: overItems };
    });
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!dndEnabled) return;
    const { active, over } = e;
    if (!over) return;
    const container = containerOf(active.id as string);
    if (!container) return;
    const items = columns[container];
    const oldIndex = items.indexOf(active.id as string);
    const newIndex = items.indexOf(over.id as string);
    let finalItems = items;
    if (oldIndex !== newIndex && newIndex >= 0) {
      finalItems = arrayMove(items, oldIndex, newIndex);
      setColumns((prev) => ({ ...prev, [container]: finalItems }));
    }

    const idx = finalItems.indexOf(active.id as string);
    const prevPos = idx > 0 ? taskById[finalItems[idx - 1]]?.tp_position ?? 0 : 0;
    const nextPos = idx < finalItems.length - 1 ? taskById[finalItems[idx + 1]]?.tp_position ?? prevPos + 2000 : prevPos + 2000;
    const newPosition = (prevPos + nextPos) / 2;
    await moveTask(active.id as string, container === NONE ? null : container, newPosition);
  }

  async function handleAddTask(sectionKey: string) {
    if (!newTaskName.trim() || !workspace || !user) return;
    await createTask({
      name: newTaskName.trim(),
      sectionId: sectionKey === NONE ? null : sectionKey,
      workspaceId: workspace.id,
      createdBy: user.id,
    });
    setNewTaskName('');
    setAddingIn(sectionKey);
  }

  const primarySectionKey = sections[0]?.id ?? NONE;

  function handleQuickAddTask() {
    if (groupField === 'section') {
      const target = groupMetas[0];
      if (!target) return;
      setCollapsed((c) => ({ ...c, [target.id]: false }));
      setAddingIn(target.id);
    } else {
      setAddingIn(primarySectionKey);
    }
  }

  function togglePriorityFilter(key: string) {
    setFilterPriorities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAssigneeFilter(key: string) {
    setFilterAssignees((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleFieldVisibility(id: string) {
    setHiddenFieldIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setFilterPriorities(new Set());
    setFilterAssignees(new Set());
    setFilterDue('any');
  }

  async function toggleCompleteWithUndo(t: ProjectTask) {
    const prev = t.completed;
    await toggleComplete(t.id, !prev);
    pushUndo({
      label: `mark "${t.name}" ${!prev ? 'complete' : 'incomplete'}`,
      undo: () => toggleComplete(t.id, prev),
      redo: () => toggleComplete(t.id, !prev),
    });
  }

  async function duplicateTask(t: ProjectTask) {
    if (!workspace || !user) return;
    const { data: copy, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: workspace.id,
        name: `${t.name} (copy)`,
        notes: t.notes,
        priority: t.priority,
        due_date: t.due_date,
        assignee_id: t.assignee_id,
        is_milestone: t.is_milestone,
        created_by: user.id,
      })
      .select()
      .single();
    if (error || !copy) {
      toast.error(error?.message || 'Could not duplicate task.');
      return;
    }
    const sectionTasks = tasks.filter((x) => x.section_id === t.section_id);
    const maxPos = sectionTasks.length ? Math.max(...sectionTasks.map((x) => x.tp_position)) : 0;
    await supabase.from('task_projects').insert({ task_id: copy.id, project_id: projectId, section_id: t.section_id, position: maxPos + 1000 });
    if (t.tags.length) {
      await supabase.from('task_tags').insert(t.tags.map((tag) => ({ task_id: copy.id, tag_id: tag.id })));
    }
    toast.success('Task duplicated');
  }

  async function createFollowUp(t: ProjectTask) {
    if (!workspace || !user) return;
    const { data: followUp, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: workspace.id,
        name: `Follow-up: ${t.name}`,
        assignee_id: t.assignee_id,
        created_by: user.id,
      })
      .select()
      .single();
    if (error || !followUp) {
      toast.error(error?.message || 'Could not create follow-up task.');
      return;
    }
    const sectionTasks = tasks.filter((x) => x.section_id === t.section_id);
    const maxPos = sectionTasks.length ? Math.max(...sectionTasks.map((x) => x.tp_position)) : 0;
    await supabase.from('task_projects').insert({ task_id: followUp.id, project_id: projectId, section_id: t.section_id, position: maxPos + 1000 });
    // A genuine step beyond stock Asana: the follow-up is actually linked as
    // waiting on the original, so it shows up in the task panel's
    // Dependencies section instead of just being two unrelated tasks.
    await supabase.from('task_dependencies').insert({ task_id: followUp.id, depends_on_task_id: t.id, type: 'waiting_on' });
    toast.success('Follow-up task created');
    openTask(followUp.id);
  }

  async function toggleMilestone(t: ProjectTask) {
    const { error } = await supabase.from('tasks').update({ is_milestone: !t.is_milestone }).eq('id', t.id);
    if (error) toast.error(error.message);
  }

  async function moveTaskToSection(t: ProjectTask, sectionId: string) {
    const sectionTasks = tasks.filter((x) => x.section_id === sectionId);
    const maxPos = sectionTasks.length ? Math.max(...sectionTasks.map((x) => x.tp_position)) : 0;
    await moveTask(t.id, sectionId, maxPos + 1000);
  }

  function copyTaskLink(t: ProjectTask) {
    navigator.clipboard.writeText(`${window.location.origin}/tasks/${t.id}`);
    toast.success('Link copied');
  }

  function openInNewTab(t: ProjectTask) {
    window.open(`${window.location.origin}/tasks/${t.id}`, '_blank', 'noopener,noreferrer');
  }

  async function deleteTaskWithUndo(t: ProjectTask) {
    const tp = { section_id: t.section_id, position: t.tp_position };
    const tagIds = t.tags.map((tag) => tag.id);
    const { error } = await supabase.from('tasks').delete().eq('id', t.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Deleted "${t.name}"`);

    let currentId = t.id;
    pushUndo({
      label: `delete "${t.name}"`,
      undo: async () => {
        const { data: restored, error: restoreError } = await supabase
          .from('tasks')
          .insert({
            workspace_id: t.workspace_id,
            name: t.name,
            notes: t.notes,
            priority: t.priority,
            due_date: t.due_date,
            assignee_id: t.assignee_id,
            is_milestone: t.is_milestone,
            created_by: t.created_by,
          })
          .select()
          .single();
        if (restoreError || !restored) throw new Error(restoreError?.message || 'Could not restore task.');
        currentId = restored.id;
        await supabase.from('task_projects').insert({ task_id: restored.id, project_id: projectId, section_id: tp.section_id, position: tp.position });
        if (tagIds.length) await supabase.from('task_tags').insert(tagIds.map((tagId) => ({ task_id: restored.id, tag_id: tagId })));
      },
      redo: async () => {
        await supabase.from('tasks').delete().eq('id', currentId);
      },
    });
  }

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between gap-2 px-6 pb-2 pt-4">
        <button
          onClick={handleQuickAddTask}
          className="flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={13} /> Add task
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCompleted((s) => !s)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-muted hover:bg-surface-hover"
          >
            {showCompleted ? 'Hide' : 'Show'} completed
          </button>
          <div className="mx-1 h-4 w-px bg-border" />

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <button
                title="Filter"
                className={cn(
                  'relative rounded-md p-1.5 hover:bg-surface-hover',
                  activeFilterCount > 0 ? 'text-brand-600' : 'text-ink-faint'
                )}
              >
                <Filter size={15} />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-500 text-[9px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase text-ink-faint">Priority</p>
                  <div className="space-y-0.5">
                    {Object.entries(PRIORITY_META).map(([key, m]) => (
                      <label key={key} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-surface-hover">
                        <Checkbox checked={filterPriorities.has(key)} onCheckedChange={() => togglePriorityFilter(key)} />
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                        {m.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase text-ink-faint">Assignee</p>
                  <div className="max-h-32 space-y-0.5 overflow-y-auto">
                    {members.map((m) => (
                      <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-surface-hover">
                        <Checkbox checked={filterAssignees.has(m.id)} onCheckedChange={() => toggleAssigneeFilter(m.id)} />
                        <Avatar name={m.full_name} email={m.email} color={m.avatar_color} src={m.avatar_url} size={18} />
                        <span className="block truncate">{m.full_name || m.email}</span>
                      </label>
                    ))}
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-surface-hover">
                      <Checkbox checked={filterAssignees.has('unassigned')} onCheckedChange={() => toggleAssigneeFilter('unassigned')} />
                      Unassigned
                    </label>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase text-ink-faint">Due date</p>
                  <div className="space-y-0.5">
                    {DUE_FILTER_OPTIONS.map((o) => (
                      <button
                        key={o.key}
                        onClick={() => setFilterDue(o.key)}
                        className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm hover:bg-surface-hover"
                      >
                        {o.label}
                        {filterDue === o.key && <Check size={13} className="ml-auto text-brand-500" />}
                      </button>
                    ))}
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="w-full rounded-md px-2 py-1.5 text-center text-xs font-medium text-ink-faint hover:bg-surface-hover">
                    Clear filters
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={sortOpen} onOpenChange={setSortOpen}>
            <PopoverTrigger asChild>
              <button title="Sort" className={cn('rounded-md p-1.5 hover:bg-surface-hover', sortField !== 'manual' ? 'text-brand-600' : 'text-ink-faint')}>
                <ArrowUpDown size={15} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1.5">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={`${o.field}-${o.dir}`}
                  onClick={() => { setSortField(o.field); setSortDir(o.dir); setSortOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-surface-hover"
                >
                  {o.label}
                  {sortField === o.field && sortDir === o.dir && <Check size={13} className="ml-auto text-brand-500" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover open={groupOpen} onOpenChange={setGroupOpen}>
            <PopoverTrigger asChild>
              <button title="Group" className={cn('rounded-md p-1.5 hover:bg-surface-hover', groupField !== 'section' ? 'text-brand-600' : 'text-ink-faint')}>
                <Layers size={15} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1.5">
              {GROUP_OPTIONS.map((o) => (
                <button
                  key={o.field}
                  onClick={() => { setGroupField(o.field); setGroupOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-surface-hover"
                >
                  {o.label}
                  {groupField === o.field && <Check size={13} className="ml-auto text-brand-500" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
            <PopoverTrigger asChild>
              <button title="Options" className="rounded-md p-1.5 text-ink-faint hover:bg-surface-hover">
                <SlidersHorizontal size={15} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
              <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase text-ink-faint">Columns</p>
              {fields.length === 0 ? (
                <p className="px-1 py-2 text-xs text-ink-faint">No custom columns yet. Add one from the header row.</p>
              ) : (
                <div className="space-y-0.5">
                  {fields.map((f) => (
                    <label key={f.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-surface-hover">
                      <Checkbox checked={!hiddenFieldIds.has(f.id)} onCheckedChange={() => toggleFieldVisibility(f.id)} />
                      <span className="block truncate">{f.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {searchOpen ? (
            <div className="flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1">
              <Search size={13} className="text-ink-faint" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && (e.currentTarget as HTMLInputElement).blur()}
                onBlur={() => !searchQuery.trim() && setSearchOpen(false)}
                placeholder="Search tasks..."
                className="w-40 border-none bg-transparent p-0 text-xs outline-none placeholder:text-ink-faint"
              />
              <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} className="text-ink-faint hover:text-ink">
                <X size={12} />
              </button>
            </div>
          ) : (
            <button title="Search" onClick={() => setSearchOpen(true)} className="rounded-md p-1.5 text-ink-faint hover:bg-surface-hover">
              <Search size={15} />
            </button>
          )}
        </div>
      </div>

      {/*
        The grid columns below have fixed pixel widths (see rowGridTemplate)
        that easily exceed a phone's viewport once a couple of custom fields
        are added. Rather than a separate mobile card layout, this scrolls
        the header and every row horizontally together, same as Asana's own
        mobile web list view.
      */}
      <div className="overflow-x-auto">
      {groupMetas.length > 0 && (
        <div className="flex w-max min-w-full items-center px-4 py-1.5">
          <div
            className="grid min-w-0 flex-none items-center divide-x divide-border"
            style={{ gridTemplateColumns: rowGridTemplate(visibleFields, colWidths) }}
          >
            <span className="relative block truncate pl-1 pr-2 text-[13px] font-medium text-ink-faint">
              Name
              <ResizeHandle colKey="name" min={MIN_COL_WIDTH.name} colWidths={colWidths} onResize={resizeColumn} />
            </span>
            <span className="relative px-2 text-[13px] font-medium text-ink-faint">
              Assignee
              <ResizeHandle colKey="assignee" min={MIN_COL_WIDTH.assignee} colWidths={colWidths} onResize={resizeColumn} />
            </span>
            <span className="relative px-2 text-[13px] font-medium text-ink-faint">
              Priority
              <ResizeHandle colKey="priority" min={MIN_COL_WIDTH.priority} colWidths={colWidths} onResize={resizeColumn} />
            </span>
            <span className="relative px-2 text-[13px] font-medium text-ink-faint">
              Due date
              <ResizeHandle colKey="due_date" min={MIN_COL_WIDTH.due_date} colWidths={colWidths} onResize={resizeColumn} />
            </span>
            {visibleFields.map((f) => (
              <span key={f.id} className="relative block truncate px-2 text-[13px] font-medium text-ink-faint">
                {f.name}
                <ResizeHandle colKey={f.id} min={60} colWidths={colWidths} onResize={resizeColumn} />
              </span>
            ))}
            <button
              onClick={onAddColumn}
              title="Add column"
              className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faint hover:bg-surface-hover"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="w-max min-w-full px-4">
          {groupField !== 'section' && addingIn === primarySectionKey && (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2">
              <Plus size={14} className="text-ink-faint" />
              <input
                autoFocus
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask(primarySectionKey)}
                onBlur={() => !newTaskName.trim() && setAddingIn(null)}
                placeholder="Task name"
                className="flex-1 border-none bg-transparent p-0 text-sm outline-none placeholder:text-ink-faint"
              />
            </div>
          )}
          {groupMetas.map((sec) => {
            const ids = columns[sec.id] || [];
            const isCollapsed = collapsed[sec.id];
            return (
              <div key={sec.id} className="mb-1">
                <div className="group flex items-center gap-1.5 rounded-lg px-2 py-2">
                  <button onClick={() => setCollapsed((c) => ({ ...c, [sec.id]: !c[sec.id] }))} className="text-ink-faint">
                    {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <SectionName sectionId={sec.isSection ? sec.id : null} name={sec.name} onRename={renameSection} />
                  <span className="text-xs text-ink-faint">{ids.length}</span>
                  {sec.isSection && (
                    <div className="ml-auto flex items-center opacity-0 group-hover:opacity-100">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-md p-1 text-ink-faint hover:bg-surface-hover"><MoreHorizontal size={14} /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-red-600 data-[highlighted]:bg-red-50" onSelect={() => deleteSection(sec.id)}>
                            <Trash2 size={13} /> Delete section
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                      {ids.map((id) => {
                        const t = taskById[id];
                        if (!t) return null;
                        return (
                          <div
                            key={id}
                            className="group grid items-stretch divide-x divide-border border-b border-border last:border-b-0 hover:bg-surface-hover"
                            style={{ gridTemplateColumns: rowGridTemplate(visibleFields, colWidths) }}
                          >
                            <div className="min-w-0">
                              <ContextMenu>
                                <ContextMenuTrigger asChild>
                                  <div>
                                    <TaskRow task={t} onToggleComplete={() => toggleCompleteWithUndo(t)} dragDisabled={!dndEnabled} />
                                  </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem onSelect={() => duplicateTask(t)}>
                                    <Copy size={14} /> Duplicate task
                                  </ContextMenuItem>
                                  <ContextMenuItem onSelect={() => createFollowUp(t)}>
                                    <GitBranch size={14} /> Create follow-up task
                                  </ContextMenuItem>
                                  <ContextMenuItem onSelect={() => toggleCompleteWithUndo(t)}>
                                    <SquareCheck size={14} /> {t.completed ? 'Mark incomplete' : 'Mark complete'}
                                  </ContextMenuItem>
                                  <ContextMenuItem onSelect={() => openTask(t.id)}>
                                    <ListPlus size={14} /> Add subtask
                                  </ContextMenuItem>
                                  <ContextMenuSub>
                                    <ContextMenuSubTrigger>
                                      <Flag size={14} /> Convert to
                                    </ContextMenuSubTrigger>
                                    <ContextMenuSubContent>
                                      <ContextMenuItem onSelect={() => toggleMilestone(t)}>
                                        <Target size={14} />
                                        {t.is_milestone ? 'Task' : 'Milestone'}
                                        {t.is_milestone && <Check size={13} className="ml-auto text-brand-500" />}
                                      </ContextMenuItem>
                                    </ContextMenuSubContent>
                                  </ContextMenuSub>
                                  {sections.length > 0 && (
                                    <ContextMenuSub>
                                      <ContextMenuSubTrigger>
                                        <Layers size={14} /> Move to section
                                      </ContextMenuSubTrigger>
                                      <ContextMenuSubContent>
                                        {sections.map((s) => (
                                          <ContextMenuItem key={s.id} onSelect={() => moveTaskToSection(t, s.id)}>
                                            {s.id === t.section_id && <Check size={13} className="text-brand-500" />}
                                            {s.name}
                                          </ContextMenuItem>
                                        ))}
                                      </ContextMenuSubContent>
                                    </ContextMenuSub>
                                  )}
                                  <ContextMenuSeparator />
                                  <ContextMenuItem onSelect={() => openTask(t.id)}>
                                    <ExternalLink size={14} /> Open task details
                                  </ContextMenuItem>
                                  <ContextMenuItem onSelect={() => openInNewTab(t)}>
                                    <ExternalLink size={14} /> Open in new tab
                                  </ContextMenuItem>
                                  <ContextMenuItem onSelect={() => copyTaskLink(t)}>
                                    <Link2 size={14} /> Copy task link
                                  </ContextMenuItem>
                                  <ContextMenuSeparator />
                                  <ContextMenuItem
                                    className="text-red-600 data-[highlighted]:bg-red-50"
                                    onSelect={() => deleteTaskWithUndo(t)}
                                  >
                                    <Trash2 size={14} /> Delete task
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>
                            </div>
                            <div className="flex items-center px-2">
                              <AssigneePicker
                                assignee={t.assignee}
                                onChange={(userId) => updateTaskField(t.id, { assignee_id: userId })}
                                size={22}
                              />
                            </div>
                            <div className="flex items-center px-2">
                              <PriorityPicker priority={t.priority} onChange={(p) => updateTaskField(t.id, { priority: p as ProjectTask['priority'] })} />
                            </div>
                            <div className="flex items-center px-2">
                              <DatePickerButton
                                date={t.due_date}
                                completed={t.completed}
                                onChange={(d) => updateTaskField(t.id, { due_date: d })}
                              />
                            </div>
                            {visibleFields.map((f) => (
                              <div key={f.id} className="flex items-center px-2">
                                <CustomFieldInput
                                  field={f}
                                  value={customValues.find((v) => v.task_id === id && v.custom_field_id === f.id) || null}
                                  onChange={(patch) => setCellValue(id, f.id, patch)}
                                  members={members}
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </SortableContext>
                    {groupField === 'section' && (
                      addingIn === sec.id ? (
                        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                          <Plus size={14} className="text-ink-faint" />
                          <input
                            autoFocus
                            value={newTaskName}
                            onChange={(e) => setNewTaskName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTask(sec.id)}
                            onBlur={() => !newTaskName.trim() && setAddingIn(null)}
                            placeholder="Task name"
                            className="flex-1 border-none bg-transparent p-0 text-sm outline-none placeholder:text-ink-faint"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingIn(sec.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-faint hover:bg-surface-hover"
                        >
                          <Plus size={14} /> Add task
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DragOverlay>{activeId && taskById[activeId] && <div className="w-[400px] rounded-lg border border-border bg-white px-3 py-2 shadow-popover text-sm">{taskById[activeId].name}</div>}</DragOverlay>
      </DndContext>
      </div>

      {groupField === 'section' && (
        <div className="px-6 pt-2">
          {addingSection ? (
            <input
              autoFocus
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && newSectionName.trim()) {
                  await createSection(newSectionName.trim());
                  setNewSectionName('');
                  setAddingSection(false);
                }
              }}
              onBlur={() => setAddingSection(false)}
              placeholder="Section name"
              className="rounded-md border border-border px-2.5 py-1.5 text-sm outline-none focus:border-brand-400"
            />
          ) : (
            <button onClick={() => setAddingSection(true)} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-ink-faint hover:bg-surface-hover">
              <Plus size={14} /> Add section
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SectionName({ sectionId, name, onRename }: { sectionId: string | null; name: string; onRename: (id: string, name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(name);
  if (!sectionId) return <span className="text-[13px] font-semibold text-ink">{name}</span>;
  if (editing) {
    return (
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { setEditing(false); if (v.trim() && v !== name) onRename(sectionId, v.trim()); }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="rounded border border-brand-300 bg-white px-1 text-[13px] font-semibold text-ink outline-none"
      />
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="text-[13px] font-semibold text-ink hover:text-ink">
      {name}
    </button>
  );
}
