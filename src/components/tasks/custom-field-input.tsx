'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar } from '@/components/ui/avatar';
import { DatePickerButton } from '@/components/tasks/pickers';
import { cn } from '@/lib/utils';
import type { Tables } from '@/types/database';
import type { CustomField } from '@/hooks/use-custom-fields';

type Option = { id: string; label: string; color: string };
type Value = Tables<'custom_field_values'> | null;

export function CustomFieldInput({
  field,
  value,
  onChange,
  members,
}: {
  field: CustomField;
  value: Value;
  onChange: (patch: Partial<Tables<'custom_field_values'>>) => void;
  members: Tables<'profiles'>[];
}) {
  const options = (field.options as unknown as Option[]) || [];

  if (field.type === 'text') {
    return <TextInput value={value?.value_text || ''} onSave={(v) => onChange({ value_text: v || null })} />;
  }

  if (field.type === 'number') {
    return <NumberInput value={value?.value_number ?? null} onSave={(v) => onChange({ value_number: v })} />;
  }

  if (field.type === 'checkbox') {
    return <Checkbox checked={!!value?.value_bool} onCheckedChange={(v) => onChange({ value_bool: !!v })} />;
  }

  if (field.type === 'date') {
    return (
      <DatePickerButton
        date={value?.value_date || null}
        completed
        label={field.name}
        onChange={(d) => onChange({ value_date: d })}
      />
    );
  }

  if (field.type === 'people') {
    const person = members.find((m) => m.id === value?.value_user_id) || null;
    return (
      <PeoplePickerField
        person={person}
        members={members}
        onChange={(id) => onChange({ value_user_id: id })}
      />
    );
  }

  const selectedIds: string[] = (value?.value_option_ids as unknown as string[]) || [];
  const multi = field.type === 'multi_select';

  return (
    <SelectField
      options={options}
      selectedIds={selectedIds}
      multi={multi}
      placeholder={field.name}
      onChange={(ids) => onChange({ value_option_ids: ids as any })}
    />
  );
}

function TextInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      placeholder="Empty"
      className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm text-ink outline-none hover:border-border focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
    />
  );
}

function NumberInput({ value, onSave }: { value: number | null; onSave: (v: number | null) => void }) {
  const [v, setV] = useState(value?.toString() ?? '');
  return (
    <input
      type="number"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onSave(v === '' ? null : Number(v))}
      placeholder="Empty"
      className="w-28 rounded-md border border-transparent px-1.5 py-1 text-sm text-ink outline-none hover:border-border focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
    />
  );
}

function SelectField({
  options,
  selectedIds,
  multi,
  placeholder,
  onChange,
}: {
  options: Option[];
  selectedIds: string[];
  multi: boolean;
  placeholder: string;
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((o) => selectedIds.includes(o.id));

  function toggle(id: string) {
    if (multi) {
      onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
    } else {
      onChange(selectedIds.includes(id) ? [] : [id]);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex min-h-[26px] flex-wrap items-center gap-1 rounded-md px-1.5 py-1 text-sm hover:bg-surface-hover">
          {selected.length === 0 && <span className="text-ink-faint">Empty</span>}
          {selected.map((o) => (
            <span key={o.id} className="rounded-md px-1.5 py-0.5 text-xs font-medium" style={{ backgroundColor: o.color + '22', color: o.color }}>
              {o.label}
            </span>
          ))}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1.5">
        {options.map((o) => (
          <button key={o.id} onClick={() => toggle(o.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: o.color }} />
            <span className="truncate">{o.label}</span>
            {selectedIds.includes(o.id) && <Check size={13} className="ml-auto text-brand-500" />}
          </button>
        ))}
        {options.length === 0 && <p className="px-2 py-2 text-center text-xs text-ink-faint">No options configured</p>}
      </PopoverContent>
    </Popover>
  );
}

function PeoplePickerField({
  person,
  members,
  onChange,
}: {
  person: Tables<'profiles'> | null;
  members: Tables<'profiles'>[];
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-surface-hover">
          {person ? (
            <>
              <Avatar name={person.full_name} email={person.email} color={person.avatar_color} src={person.avatar_url} size={20} />
              <span className="text-ink">{person.full_name || person.email}</span>
            </>
          ) : (
            <span className="text-ink-faint">Empty</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1.5">
        {person && (
          <button onClick={() => { onChange(null); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-muted hover:bg-surface-hover">
            <X size={13} /> Clear
          </button>
        )}
        {members.map((m) => (
          <button key={m.id} onClick={() => { onChange(m.id); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover">
            <Avatar name={m.full_name} email={m.email} color={m.avatar_color} src={m.avatar_url} size={20} />
            <span className="truncate">{m.full_name || m.email}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
