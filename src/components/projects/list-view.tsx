'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useSections } from '@/hooks/use-sections';
import { useProjectTasks, type ProjectTask } from '@/hooks/use-tasks';
import { TaskRow } from '@/components/tasks/task-row';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const NONE = '__none__';

export function ListView({ projectId }: { projectId: string }) {
  const { workspace, user } = useWorkspace();
  const { sections, createSection, renameSection, deleteSection } = useSections(projectId);
  const { tasks, createTask, moveTask, toggleComplete } = useProjectTasks(projectId);

  const [columns, setColumns] = useState<Record<string, string[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const taskById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

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

  return (
    <div className="pb-24">
      <div className="flex items-center justify-end gap-2 px-6 pb-2 pt-4">
        <button
          onClick={() => setShowCompleted((s) => !s)}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-muted hover:bg-surface-hover"
        >
          {showCompleted ? 'Hide' : 'Show'} completed
        </button>
      </div>

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
                      {ids.map((id) => taskById[id] && (
                        <TaskRow key={id} task={taskById[id]} onToggleComplete={(v) => toggleComplete(id, v)} />
                      ))}
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
