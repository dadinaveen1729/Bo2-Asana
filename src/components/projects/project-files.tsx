'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Download, File as FileIcon, FileArchive, FileSpreadsheet, FileText,
  Image as ImageIcon, Loader2, Paperclip, Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/lib/workspace-context';
import { useTaskPanel } from '@/lib/task-panel-context';
import { Avatar } from '@/components/ui/avatar';
import { toast } from 'sonner';
import type { Tables } from '@/types/database';

type FileRow = Tables<'attachments'> & {
  task: Pick<Tables<'tasks'>, 'id' | 'name'> | null;
  uploader: Tables<'profiles'> | null;
};

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

export function ProjectFiles({ projectId }: { projectId: string }) {
  const { user, role } = useWorkspace();
  const { openTask } = useTaskPanel();
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: tp, error: tpErr } = await supabase.from('task_projects').select('task_id').eq('project_id', projectId);
    if (tpErr) {
      toast.error(tpErr.message);
      setLoading(false);
      return;
    }
    const taskIds = (tp || []).map((r) => r.task_id);
    if (taskIds.length === 0) {
      setFiles([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('attachments')
      .select('*, task:tasks(id, name), uploader:profiles!attachments_uploaded_by_fkey(*)')
      .in('task_id', taskIds)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setFiles((data as any) || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`project-files:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attachments' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, load]);

  async function handleOpen(f: FileRow) {
    setOpeningId(f.id);
    const supabase = createClient();
    const { data, error } = await supabase.storage.from('attachments').createSignedUrl(f.file_path, 3600);
    setOpeningId(null);
    if (error || !data) {
      toast.error(error?.message || 'Could not open file.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleDelete(f: FileRow) {
    setDeletingId(f.id);
    const supabase = createClient();
    const { error: storageError } = await supabase.storage.from('attachments').remove([f.file_path]);
    if (storageError) {
      toast.error(storageError.message);
      setDeletingId(null);
      return;
    }
    const { error: dbError } = await supabase.from('attachments').delete().eq('id', f.id);
    if (dbError) {
      toast.error(dbError.message);
      setDeletingId(null);
      return;
    }
    setDeletingId(null);
  }

  function canDelete(f: FileRow) {
    return f.uploaded_by === user?.id || role === 'admin' || role === 'owner';
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={20} />
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Paperclip size={28} className="mb-3 text-ink-faint" />
          <p className="text-sm font-medium text-ink">No files yet</p>
          <p className="mt-1 text-[13px] text-ink-faint">Files attached to tasks in this project will show up here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-surface-hover px-3 py-2">
            <span className="flex-1 text-[13px] font-medium text-ink-faint">Name</span>
            <span className="w-40 shrink-0 text-[13px] font-medium text-ink-faint">Task</span>
            <span className="w-28 shrink-0 text-[13px] font-medium text-ink-faint">Uploaded by</span>
            <span className="w-20 shrink-0 text-[13px] font-medium text-ink-faint">Size</span>
            <span className="w-24 shrink-0 text-[13px] font-medium text-ink-faint">Added</span>
            <span className="w-16 shrink-0" />
          </div>
          {files.map((f) => {
            const Icon = iconForMime(f.mime_type);
            return (
              <div key={f.id} className="group flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0 hover:bg-surface-hover">
                <button onClick={() => handleOpen(f)} disabled={openingId === f.id} className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:opacity-50">
                  {openingId === f.id ? <Loader2 size={15} className="shrink-0 animate-spin text-ink-faint" /> : <Icon size={15} className="shrink-0 text-ink-faint" />}
                  <span className="truncate text-[13.5px] text-ink">{f.file_name}</span>
                </button>
                <button
                  onClick={() => f.task && openTask(f.task.id)}
                  disabled={!f.task}
                  className="w-40 shrink-0 truncate text-left text-[13px] text-ink-faint hover:text-brand-600 hover:underline disabled:no-underline"
                >
                  {f.task?.name || '—'}
                </button>
                <div className="flex w-28 shrink-0 items-center gap-1.5">
                  {f.uploader && <Avatar name={f.uploader.full_name} email={f.uploader.email} color={f.uploader.avatar_color} src={f.uploader.avatar_url} size={18} />}
                  <span className="truncate text-[13px] text-ink-faint">{f.uploader?.full_name || f.uploader?.email || 'Unknown'}</span>
                </div>
                <span className="w-20 shrink-0 text-[13px] text-ink-faint">{formatBytes(f.file_size)}</span>
                <span className="w-24 shrink-0 text-[13px] text-ink-faint">{formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}</span>
                <div className="flex w-16 shrink-0 items-center justify-end gap-1">
                  <button onClick={() => handleOpen(f)} title="Download" className="rounded-md p-1 text-ink-faint opacity-0 hover:bg-white group-hover:opacity-100">
                    <Download size={13} />
                  </button>
                  {canDelete(f) && (
                    <button
                      onClick={() => handleDelete(f)}
                      disabled={deletingId === f.id}
                      title="Delete"
                      className="rounded-md p-1 text-ink-faint opacity-0 hover:bg-white hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
                    >
                      {deletingId === f.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
