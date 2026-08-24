'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/lib/workspace-context';
import { useProjects } from '@/hooks/use-teams-projects';
import { useSections } from '@/hooks/use-sections';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssigneePicker, DatePickerButton } from '@/components/tasks/pickers';
import { useTaskPanel } from '@/lib/task-panel-context';

export function QuickAddTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { workspace, user, profile } = useWorkspace();
  const { projects } = useProjects(workspace?.id);
  const { openTask } = useTaskPanel();
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState<string>('none');
  const { sections } = useSections(projectId === 'none' ? undefined : projectId);
  const [sectionId, setSectionId] = useState<string>('none');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setProjectId('none');
      setSectionId('none');
      setAssigneeId(user?.id || null);
      setDueDate(null);
    }
  }, [open, user?.id]);

  useEffect(() => setSectionId('none'), [projectId]);

  const assigneeProfile = assigneeId === user?.id ? profile : null;

  async function handleCreate() {
    if (!name.trim() || !workspace || !user) return;
    setSaving(true);
    const supabase = createClient();
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ workspace_id: workspace.id, name: name.trim(), assignee_id: assigneeId, created_by: user.id, due_date: dueDate })
      .select()
      .single();

    if (!error && task && projectId !== 'none') {
      await supabase.from('task_projects').insert({
        task_id: task.id,
        project_id: projectId,
        section_id: sectionId === 'none' ? null : sectionId,
        position: 1000,
      });
    }

    setSaving(false);
    onOpenChange(false);
    if (task) openTask(task.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
        <div className="space-y-4 px-6 py-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Task name"
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-faint">Project</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-faint">Section</label>
              <Select value={sectionId} onValueChange={setSectionId} disabled={projectId === 'none'}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No section</SelectItem>
                  {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-faint">Assignee</p>
              <AssigneePicker
                assignee={assigneeId === user?.id ? (assigneeProfile as any) : null}
                onChange={setAssigneeId}
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-faint">Due date</p>
              <DatePickerButton date={dueDate} onChange={setDueDate} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />} Create task
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
