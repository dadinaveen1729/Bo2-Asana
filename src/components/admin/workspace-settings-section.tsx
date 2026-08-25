'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/avatar';
import type { Tables } from '@/types/database';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export function WorkspaceSettingsSection({
  workspace,
  onSaved,
}: {
  workspace: Tables<'workspaces'>;
  onSaved: () => void | Promise<void>;
}) {
  const [name, setName] = useState(workspace.name);
  const [logoUrl, setLogoUrl] = useState<string | null>(workspace.logo_url);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(workspace.name);
    setLogoUrl(workspace.logo_url);
  }, [workspace.id, workspace.name, workspace.logo_url]);

  async function handleSaveName() {
    if (!name.trim() || name === workspace.name) return;
    setSavingName(true);
    const supabase = createClient();
    const { error } = await supabase.from('workspaces').update({ name: name.trim() }).eq('id', workspace.id);
    setSavingName(false);
    if (error) {
      toast.error('Could not update workspace name: ' + error.message);
      return;
    }
    toast.success('Workspace name updated');
    await onSaved();
  }

  async function handleLogoPick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Logo image must be under 5MB.');
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'png';
    const path = `workspace/${workspace.id}/logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error('Could not upload logo: ' + uploadError.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ logo_url: data.publicUrl })
      .eq('id', workspace.id);
    setUploading(false);
    if (updateError) {
      toast.error('Logo uploaded but could not be saved: ' + updateError.message);
      return;
    }
    setLogoUrl(data.publicUrl);
    toast.success('Workspace logo updated');
    await onSaved();
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">Workspace settings</h2>
      <p className="mt-0.5 text-sm text-ink-muted">Basic details every member sees across the app.</p>

      <div className="mt-5">
        <label className="mb-1.5 block text-sm font-medium text-ink">Workspace logo</label>
        <div className="flex items-center gap-3">
          <Avatar name={name} src={logoUrl} size={48} />
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleLogoPick(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-50"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? 'Uploading…' : 'Upload logo'}
            </button>
            <p className="mt-1 text-xs text-ink-faint">PNG or JPG, up to 5MB. Shows as the workspace initial until you upload one.</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <label className="mb-1.5 block text-sm font-medium text-ink">Workspace name</label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
          <button
            onClick={handleSaveName}
            disabled={!name.trim() || name === workspace.name || savingName}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover disabled:opacity-50"
          >
            {savingName && <Loader2 size={13} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
