'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { colorForIndex } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar } from '@/components/ui/avatar';
import type { PersonProfile } from '@/hooks/use-person';

const COLORS = Array.from({ length: 10 }, (_, i) => colorForIndex(i));
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && profile) {
      setFullName(profile.full_name || '');
      setTitle(profile.title || '');
      setDepartment(profile.department || '');
      setAboutMe(profile.about_me || '');
      setColor(profile.avatar_color || COLORS[0]);
      setOutOfOffice(!!profile.out_of_office_until);
      setAvatarUrl(profile.avatar_url);
      setUploadError(null);
    }
  }, [open, profile]);

  async function handleAvatarPick(file: File | undefined) {
    if (!file || !profile) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setUploadError('Image must be under 5MB.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${profile.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
  }

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
        avatar_url: avatarUrl,
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
          <div className="flex items-center gap-3">
            <Avatar name={fullName} email={profile?.email} color={color} src={avatarUrl} size={56} />
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarPick(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-50"
              >
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {uploading ? 'Uploading…' : 'Upload photo'}
              </button>
              {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
            </div>
          </div>
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
