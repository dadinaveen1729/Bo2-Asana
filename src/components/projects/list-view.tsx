'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import {
  ArrowUpDown, ChevronDown, ChevronRight, Filter, Layers, MoreHorizontal, Plus,
  Search, SlidersHorizontal, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/lib/workspace-context';
import { useSections } from '@/hooks/use-sections';
import { useProjectTasks, type ProjectTask } from '@/hooks/use-tasks';
import { useCustomFields, type CustomField } from '@/hooks/use-custom-fields';
import { TaskRow } from '@/components/tasks/task-row';
import { CustomFieldInput } from '@/components/tasks/custom-field-input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Tables } from '@/types/database';

const NONE = '__none__';

type CustomFieldValue = Tables<'custom_field_values'>;

function fieldColWidth(type: CustomField['type']) {
  switch (type) {
    case 'checkbox': return 'w-10';
    case 'number': return 'w-20';
    case 'date': return 'w-28';
    case 'people': return 'w-32';
    case 'multi_select': return 'w-40';
    case 'single_select': return 'w-32';
    default: return 'w-28';
  }
}

export function ListView({ projectId, onAddColumn }: { projectId: string; onAddColumn?: () => void }) {
  const { workspace, user, members } = useWorkspace();
  const { sections, createSection, renameSection, deleteSection } = useSections(projectId);
  const { tasks, createTask, moveTask, toggleComplete } = useProjectTasks(projectId);
  const { fields } = useCustomFields(projectId);
  const supabase = useMemo(() => createClient(), []);

  const [columns, setColumns] = useState<Record<string, string[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [customValues, setCustomValues] = useState<CustomFieldValue[]>([]);

  const taskById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

  const fieldIds = useMemo(() => fields.map((f) => f.id), [fields]);

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

  useEffect(() => {
    const keys = [...sections.map((s) => s.id), NONE];
    const next: Record<string, string[]> = {};
    for (const key of keys) {
      const secId = key === NONE ? null : key;
      next[key] = tasks
        .filter((t) => t.section_id === secId && (showCompleted || !t.completed))
        .sort((a, b) => a.tp_position - b.tp_position)
        .map((t) => t.id);
    }
    setColumns(next);
  }, [tasks, sections, showCompleted]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function containerOf(id: string): string | null {
    if (columns[id]) return id;
    for (const [key, ids] of Object.entries(columns)) if (ids.includes(id)) return key;
    return null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  function handleDragOver(e: DragOverEvent) {
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
    const { active, over } = e;
    setActiveId(null);
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

  const allSectionKeys = [...sections.map((s) => ({ id: s.id, name: s.name })), ...(columns[NONE]?.length || sections.length === 0 ? [{ id: NONE, name: 'Tasks' }] : [])];

  function handleQuickAddTask() {
    const target = allSectionKeys[0];
    if (!target) return;
    setCollapsed((c) => ({ ...c, [target.id]: false }));
    setAddingIn(target.id);
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
          <button title="Filter" onClick={() => toast('Filter is coming soon')} className="rounded-md p-1.5 text-ink-faint hover:bg-surface-hover">
            <Filter size={15} />
          </button>
          <button title="Sort" onClick={() => toast('Sort is coming soon')} className="rounded-md p-1.5 text-ink-faint hover:bg-surface-hover">
            <ArrowUpDown size={15} />
          </button>
          <button title="Group" onClick={() => toast('Group is coming soon')} className="rounded-md p-1.5 text-ink-faint hover:bg-surface-hover">
            <Layers size={15} />
          </button>
          <button title="Options" onClick={() => toast('Options are coming soon')} className="rounded-md p-1.5 text-ink-faint hover:bg-surface-hover">
            <SlidersHorizontal size={15} />
          </button>
          <button title="Search" onClick={() => toast('Search is coming soon')} className="rounded-md p-1.5 text-ink-faint hover:bg-surface-hover">
            <Search size={15} />
          </button>
        </div>
      </div>

      {allSectionKeys.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-1.5">
          <div className="w-[14px] shrink-0" />
          <div className="w-4 shrink-0" />
          <span className="flex-1 text-[13px] font-medium text-ink-faint">Name</span>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="w-[92px] shrink-0 text-[13px] font-medium text-ink-faint">Priority</span>
            <span className="w-[84px] shrink-0 text-[13px] font-medium text-ink-faint">Due date</span>
          </div>
          <span className="w-14 shrink-0 text-[13px] font-medium text-ink-faint">Assignee</span>
          {fields.map((f) => (
            <span key={f.id} className={cn(fieldColWidth(f.type), 'shrink-0 truncate text-[13px] font-medium text-ink-faint')}>
              {f.name}
            </span>
          ))}
          <button
            onClick={onAddColumn}
            title="Add column"
            className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-faint hover:bg-surface-hover"
          >
            <Plus size={14} />
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="px-4">
          {allSectionKeys.map((sec) => {
            const ids = columns[sec.id] || [];
            const isCollapsed = collapsed[sec.id];
            return (
              <div key={sec.id} className="mb-1">
                <div className="group flex items-center gap-1.5 rounded-lg px-2 py-2">
                  <button onClick={() => setCollapsed((c) => ({ ...c, [sec.id]: !c[sec.id] }))} className="text-ink-faint">
                    {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <SectionName sectionId={sec.id === NONE ? null : sec.id} name={sec.name} onRename={renameSection} />
                  <span className="text-xs text-ink-faint">{ids.length}</span>
                  {sec.id !== NONE && (
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
                          <div key={id} className="flex items-stretch">
                            <div className="min-w-0 flex-1">
                              <TaskRow task={t} onToggleComplete={(v) => toggleComplete(id, v)} />
                            </div>
                            {fields.map((f) => (
                              <div
                                key={f.id}
                                className={cn(fieldColWidth(f.type), 'shrink-0 border-b border-border px-2 py-1.5 hover:bg-surface-hover')}
                              >
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
                    {addingIn === sec.id ? (
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
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DragOverlay>{activeId && taskById[activeId] && <div className="w-[400px] rounded-lg border border-border bg-white px-3 py-2 shadow-popover text-sm">{taskById[activeId].name}</div>}</DragOverlay>
      </DndContext>

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
