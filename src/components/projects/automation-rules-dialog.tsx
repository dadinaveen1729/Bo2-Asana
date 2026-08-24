'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2, Zap } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useSections } from '@/hooks/use-sections';
import { useTags } from '@/hooks/use-tags';
import { useAutomationRules, type AutomationRule } from '@/hooks/use-automation-rules';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AssigneePicker } from '@/components/tasks/pickers';

const TRIGGERS: { value: AutomationRule['trigger_type']; label: string }[] = [
  { value: 'task_added_to_section', label: 'Task is moved into a section' },
  { value: 'task_completed', label: 'Task is marked complete' },
];

const ACTIONS_FOR_TRIGGER: Record<string, { value: AutomationRule['action_type']; label: string }[]> = {
  task_added_to_section: [
    { value: 'set_assignee', label: 'Assign to person' },
    { value: 'add_tag', label: 'Add tag' },
    { value: 'notify_user', label: 'Notify person' },
    { value: 'set_due_date', label: 'Set due date (days from now)' },
  ],
  task_completed: [
    { value: 'move_to_section', label: 'Move to section' },
    { value: 'notify_user', label: 'Notify person' },
    { value: 'add_tag', label: 'Add tag' },
  ],
};

export function AutomationRulesDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string }) {
  const { user, members, workspace } = useWorkspace();
  const { sections } = useSections(projectId);
  const { tags } = useTags(workspace?.id);
  const { rules, createRule, toggleRule, deleteRule } = useAutomationRules(projectId);
  const [showForm, setShowForm] = useState(false);

  const [triggerType, setTriggerType] = useState<AutomationRule['trigger_type']>('task_added_to_section');
  const [triggerSectionId, setTriggerSectionId] = useState<string>('');
  const [actionType, setActionType] = useState<AutomationRule['action_type']>('set_assignee');
  const [actionUserId, setActionUserId] = useState<string>('');
  const [actionSectionId, setActionSectionId] = useState<string>('');
  const [actionTagId, setActionTagId] = useState<string>('');
  const [actionDays, setActionDays] = useState<string>('1');
  const [saving, setSaving] = useState(false);

  const availableActions = ACTIONS_FOR_TRIGGER[triggerType] || [];

  function ruleLabel(r: AutomationRule) {
    const triggerLabel = TRIGGERS.find((t) => t.value === r.trigger_type)?.label || r.trigger_type;
    const sectionName = (cfg: any) => sections.find((s) => s.id === cfg?.section_id)?.name || 'a section';
    const actionLabel = (() => {
      switch (r.action_type) {
        case 'set_assignee': return `assign to ${members.find((m) => m.id === (r.action_config as any)?.user_id)?.full_name || 'someone'}`;
        case 'move_to_section': return `move to "${sectionName(r.action_config)}"`;
        case 'notify_user': return `notify ${members.find((m) => m.id === (r.action_config as any)?.user_id)?.full_name || 'someone'}`;
        case 'add_tag': return `add tag "${tags.find((t) => t.id === (r.action_config as any)?.tag_id)?.name || ''}"`;
        case 'set_due_date': return `set due date (+${(r.action_config as any)?.days_from_now ?? 0}d)`;
        default: return r.action_type;
      }
    })();
    const triggerDetail = r.trigger_type === 'task_added_to_section' ? `→ "${sectionName(r.trigger_config)}"` : '';
    return `When ${triggerLabel} ${triggerDetail}, ${actionLabel}`;
  }

  async function handleSave() {
    if (!user) return;
    if (triggerType === 'task_added_to_section' && !triggerSectionId) return;
    if ((actionType === 'set_assignee' || actionType === 'notify_user') && !actionUserId) return;
    if (actionType === 'move_to_section' && !actionSectionId) return;
    if (actionType === 'add_tag' && !actionTagId) return;

    setSaving(true);
    const trigger_config: Record<string, any> = triggerType === 'task_added_to_section' ? { section_id: triggerSectionId } : {};
    let action_config: Record<string, any> = {};
    if (actionType === 'set_assignee' || actionType === 'notify_user') action_config = { user_id: actionUserId };
    if (actionType === 'move_to_section') action_config = { section_id: actionSectionId };
    if (actionType === 'set_due_date') action_config = { days_from_now: Number(actionDays) || 0 };
    if (actionType === 'add_tag') action_config = { tag_id: actionTagId };

    await createRule({
      name: 'Custom rule',
      trigger_type: triggerType,
      trigger_config,
      action_type: actionType,
      action_config,
      created_by: user.id,
    });
    setSaving(false);
    setShowForm(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap size={16} className="text-brand-500" /> Automation rules</DialogTitle>
          <DialogDescription>Automatically update tasks when something happens in this project.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto px-6 py-4">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
              <Switch checked={r.enabled} onCheckedChange={(v) => toggleRule(r.id, v)} />
              <span className="flex-1 text-sm text-ink">{ruleLabel(r)}</span>
              <button onClick={() => deleteRule(r.id)} className="text-ink-faint hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          ))}

          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong py-2.5 text-sm font-medium text-ink-faint hover:bg-surface-hover">
              <Plus size={14} /> Add rule
            </button>
          ) : (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div>
                <p className="mb-1 text-xs font-medium text-ink-faint">When...</p>
                <Select value={triggerType} onValueChange={(v) => { setTriggerType(v as any); setActionType(ACTIONS_FOR_TRIGGER[v][0].value); }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {triggerType === 'task_added_to_section' && (
                  <Select value={triggerSectionId} onValueChange={setTriggerSectionId}>
                    <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="Choose section" /></SelectTrigger>
                    <SelectContent>
                      {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-ink-faint">Then...</p>
                <Select value={actionType} onValueChange={(v) => setActionType(v as any)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableActions.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>

                {(actionType === 'set_assignee' || actionType === 'notify_user') && (
                  <div className="mt-1.5">
                    <Select value={actionUserId} onValueChange={setActionUserId}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Choose person" /></SelectTrigger>
                      <SelectContent>
                        {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {actionType === 'move_to_section' && (
                  <Select value={actionSectionId} onValueChange={setActionSectionId}>
                    <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="Choose section" /></SelectTrigger>
                    <SelectContent>
                      {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {actionType === 'set_due_date' && (
                  <input
                    type="number"
                    value={actionDays}
                    onChange={(e) => setActionDays(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-400"
                    placeholder="Days from now"
                  />
                )}
                {actionType === 'add_tag' && (
                  <Select value={actionTagId} onValueChange={setActionTagId}>
                    <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="Choose tag" /></SelectTrigger>
                    <SelectContent>
                      {tags.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowForm(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
                  {saving && <Loader2 size={12} className="animate-spin" />} Save rule
                </button>
              </div>
            </div>
          )}

          {rules.length === 0 && !showForm && (
            <p className="pt-1 text-center text-xs text-ink-faint">No rules yet — automate repetitive work in this project.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
