'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useSections } from '@/hooks/use-sections';
import { useProjectTasks } from '@/hooks/use-tasks';
import { BoardCard } from '@/components/tasks/board-card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function BoardView({ projectId }: { projectId: string }) {
  const { workspace, user } = useWorkspace();
  const { sections, createSection, deleteSection } = useSections(projectId);
  const { tasks, createTask, moveTask, toggleComplete } = useProjectTasks(projectId);

  const [columns, setColumns] = useState<Record<string, string[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  const taskById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

  useEffect(() => {
    const next: Record<string, string[]> = {};
    for (const s of sections) {
      next[s.id] = tasks.filter((t) => t.section_id === s.id).sort((a, b) => a.tp_position - b.tp_position).map((t) => t.id);
    }
    setColumns(next);
  }, [tasks, sections]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function containerOf(id: string): string | null {
    if (columns[id]) return id;
    for (const [key, ids] of Object.entries(columns)) if (ids.includes(id)) return key;
    return null;
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
      overItems.splice(overIndex >= 0 ? overIndex : overItems.length, 0, active.id as string);
      return { ...prev, [activeContainer]: activeItems, [overContainer]: overItems };
    });
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const container = containerOf(active.id as string);
    if (!container) return;
    let items = columns[container];
    const oldIndex = items.indexOf(active.id as string);
    const newIndex = items.indexOf(over.id as string);
    if (oldIndex !== newIndex && newIndex >= 0) {
      items = arrayMove(items, oldIndex, newIndex);
      setColumns((prev) => ({ ...prev, [container]: items }));
    }
    const idx = items.indexOf(active.id as string);
    const prevPos = idx > 0 ? taskById[items[idx - 1]]?.tp_position ?? 0 : 0;
    const nextPos = idx < items.length - 1 ? taskById[items[idx + 1]]?.tp_position ?? prevPos + 2000 : prevPos + 2000;
    await moveTask(active.id as string, container, (prevPos + nextPos) / 2);
  }

  async function handleAddTask(sectionId: string) {
    if (!newTaskName.trim() || !workspace || !user) return;
    await createTask({ name: newTaskName.trim(), sectionId, workspaceId: workspace.id, createdBy: user.id });
    setNewTaskName('');
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="scrollbar-thin flex h-full gap-3 overflow-x-auto px-6 py-4">
        {sections.map((sec) => (
          <BoardColumn key={sec.id} id={sec.id} title={sec.name} count={columns[sec.id]?.length || 0} onDelete={() => deleteSection(sec.id)}>
            <SortableContext items={columns[sec.id] || []} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {(columns[sec.id] || []).map((id) => taskById[id] && (
                  <BoardCard key={id} task={taskById[id]} onToggleComplete={(v) => toggleComplete(id, v)} />
                ))}
              </div>
            </SortableContext>
            {addingIn === sec.id ? (
              <input
                autoFocus
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask(sec.id)}
                onBlur={() => { setAddingIn(null); }}
                placeholder="Task name"
                className="mt-2 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-400"
              />
            ) : (
              <button onClick={() => setAddingIn(sec.id)} className="mt-2 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-faint hover:bg-white">
                <Plus size={13} /> Add task
              </button>
            )}
          </BoardColumn>
        ))}

        <div className="w-72 shrink-0">
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
              className="w-full rounded-lg border border-border px-2.5 py-2 text-sm outline-none focus:border-brand-400"
            />
          ) : (
            <button onClick={() => setAddingSection(true)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-faint hover:bg-surface-hover">
              <Plus size={15} /> Add section
            </button>
          )}
        </div>
      </div>
      <DragOverlay>{activeId && taskById[activeId] && <BoardCard task={taskById[activeId]} onToggleComplete={() => {}} />}</DragOverlay>
    </DndContext>
  );
}

function BoardColumn({ id, title, count, onDelete, children }: { id: string; title: string; count: number; onDelete: () => void; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl bg-surface-hover p-2.5 transition-colors ${isOver ? 'bg-brand-50' : ''}`}
    >
      <div className="group mb-1.5 flex items-center gap-2 px-1">
        <span className="text-[13px] font-semibold text-ink">{title}</span>
        <span className="text-xs text-ink-faint">{count}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-auto rounded-md p-1 text-ink-faint opacity-0 hover:bg-white group-hover:opacity-100"><MoreHorizontal size={14} /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-red-600 data-[highlighted]:bg-red-50" onSelect={onDelete}>
              <Trash2 size={13} /> Delete section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
