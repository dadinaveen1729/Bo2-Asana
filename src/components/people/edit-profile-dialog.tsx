'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { colorForIndex } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { PersonProfile } from '@/hooks/use-person';

const COLORS = Array.from({ length: 10 }, (_, i) => colorForIndex(i));

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: PersonProfile | null;
  onSaved?: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [outOfOffice, setOutOfOffice] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setFullName(profile.full_name || '');
      setTitle(profile.title || '');
      setDepartment(profile.department || '');
      setAboutMe(profile.about_me || '');
      setColor(profile.avatar_color || COLORS[0]);
      setOutOfOffice(!!profile.out_of_office_until);
    }
  }, [open, profile]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        title: title.trim() || null,
        department: department.trim() || null,
        about_me: aboutMe.trim() || null,
        avatar_color: color,
        out_of_office_until: outOfOffice ? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) : null,
      })
      .eq('id', profile.id);
    setSaving(false);
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Job title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Operations Manager"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Team or department</label>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Operations"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">About me</label>
            <textarea
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Avatar color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn('h-6 w-6 rounded-full transition', color === c && 'ring-2 ring-offset-2')}
                  style={{ backgroundColor: c, ['--tw-ring-color' as any]: c }}
                />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={outOfOffice} onChange={(e) => setOutOfOffice(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Set out of office for the next 7 days
          </label>
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save profile
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
