'use client';

import { useRef, useState } from 'react';
import {
  Download, File as FileIcon, FileArchive, FileSpreadsheet, FileText,
  Image as ImageIcon, Loader2, Paperclip, Plus, Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/lib/workspace-context';
import { toast } from 'sonner';
import type { Tables } from '@/types/database';

const MAX_FILE_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number | null) {
  if (bytes === null || bytes === undefined) return '';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function iconForMime(mime: string | null) {
  if (!mime) return FileIcon;
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.includes('pdf') || mime.startsWith('text/')) return FileText;
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('rar') || mime.includes('tar')) return FileArchive;
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet;
  return FileIcon;
}

export function TaskAttachments({ taskId, attachments }: { taskId: string; attachments: Tables<'attachments'>[] }) {
  const { user, role } = useWorkspace();
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("That file's a bit too heavy to lift — keep it under 25MB.");
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const path = `${taskId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file);
    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from('attachments').insert({
      task_id: taskId,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: user.id,
    });
    if (dbError) {
      toast.error(dbError.message);
      await supabase.storage.from('attachments').remove([path]);
    }
    setUploading(false);
  }

  async function handleOpen(a: Tables<'attachments'>) {
    setOpeningId(a.id);
    const supabase = createClient();
    const { data, error } = await supabase.storage.from('attachments').createSignedUrl(a.file_path, 3600);
    setOpeningId(null);
    if (error || !data) {
      toast.error(error?.message || "Couldn't get that file open. Try again?");
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleDelete(a: Tables<'attachments'>) {
    setDeletingId(a.id);
    const supabase = createClient();
    const { error: storageError } = await supabase.storage.from('attachments').remove([a.file_path]);
    if (storageError) {
      toast.error(storageError.message);
      setDeletingId(null);
      return;
    }
    const { error: dbError } = await supabase.from('attachments').delete().eq('id', a.id);
    if (dbError) {
      toast.error(dbError.message);
      setDeletingId(null);
      return;
    }
    setDeletingId(null);
  }

  function canDelete(a: Tables<'attachments'>) {
    return a.uploaded_by === user?.id || role === 'admin' || role === 'owner';
  }

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
        <Paperclip size={12} /> Attachments {attachments.length > 0 && `(${attachments.length})`}
      </p>
      <div className="space-y-0.5">
        {attachments.map((a) => {
          const Icon = iconForMime(a.mime_type);
          return (
            <div key={a.id} className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-surface-hover">
              <button
                onClick={() => handleOpen(a)}
                disabled={openingId === a.id}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:opacity-50"
              >
                {openingId === a.id ? (
                  <Loader2 size={16} className="shrink-0 animate-spin text-ink-faint" />
                ) : (
                  <Icon size={16} className="shrink-0 text-ink-faint" />
                )}
                <span className="min-w-0 flex-1 block truncate text-sm text-ink">{a.file_name}</span>
                <span className="shrink-0 text-xs text-ink-faint">{formatBytes(a.file_size)}</span>
              </button>
              <button
                onClick={() => handleOpen(a)}
                title="Download"
                className="shrink-0 rounded-md p-1 text-ink-faint opacity-0 hover:bg-white group-hover:opacity-100"
              >
                <Download size={13} />
              </button>
              {canDelete(a) && (
                <button
                  onClick={() => handleDelete(a)}
                  disabled={deletingId === a.id}
                  title="Delete"
                  className="shrink-0 rounded-md p-1 text-ink-faint opacity-0 hover:bg-white hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
                >
                  {deletingId === a.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              )}
            </div>
          );
        })}
        {attachments.length === 0 && <p className="px-1.5 py-2 text-sm text-ink-faint">Nothing attached yet — feels a little empty in here.</p>}
      </div>
      <div className="mt-1">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-ink-faint hover:bg-surface-hover disabled:opacity-50"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {uploading ? 'Floating it up…' : 'Attach file'}
        </button>
      </div>
    </div>
  );
}
