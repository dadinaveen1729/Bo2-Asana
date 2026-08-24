'use client';

import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Loader2, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { colorForIndex } from '@/lib/utils';
import type { CustomField } from '@/hooks/use-custom-fields';

const TYPES: { value: CustomField['type']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'single_select', label: 'Single-select' },
  { value: 'multi_select', label: 'Multi-select' },
  { value: 'date', label: 'Date' },
  { value: 'people', label: 'Person' },
  { value: 'checkbox', label: 'Checkbox' },
];

export function CreateCustomFieldDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (name: string, type: CustomField['type'], options: { id: string; label: string; color: string }[]) => Promise<any>;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CustomField['type']>('single_select');
  const [options, setOptions] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);

  const needsOptions = type === 'single_select' || type === 'multi_select';

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    const opts = needsOptions
      ? options.filter((o) => o.trim()).map((label, i) => ({ id: nanoid(6), label: label.trim(), color: colorForIndex(i) }))
      : [];
    await onCreate(name.trim(), type, opts);
    setLoading(false);
    setName('');
    setOptions(['']);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New field</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Field name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priority level"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Type</label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {needsOptions && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Options</label>
              <div className="space-y-1.5">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorForIndex(i) }} />
                    <input
                      value={opt}
                      onChange={(e) => setOptions((os) => os.map((o, j) => (j === i ? e.target.value : o)))}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 rounded-md border border-border px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
                    />
                    {options.length > 1 && (
                      <button onClick={() => setOptions((os) => os.filter((_, j) => j !== i))} className="text-ink-faint hover:text-ink">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setOptions((os) => [...os, ''])} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                  <Plus size={12} /> Add option
                </button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Create field
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
