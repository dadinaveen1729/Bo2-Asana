import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '@/types/database';

type Profile = Tables<'profiles'>;

// Plain-text "@Full Name" / "@email" detection against workspace members.
// No live autocomplete-while-typing yet — this matches whatever was
// actually typed once the surrounding text is saved/posted.
export function extractMentions(text: string, members: Profile[], excludeUserId: string): Profile[] {
  const lower = text.toLowerCase();
  return members.filter((m) => {
    if (m.id === excludeUserId) return false;
    const byName = m.full_name && lower.includes('@' + m.full_name.toLowerCase());
    const byEmail = lower.includes('@' + m.email.toLowerCase());
    return byName || byEmail;
  });
}

// For editable text (task/project descriptions) that gets re-saved on
// every blur, only the mentions newly introduced since the last saved
// value should notify -- otherwise re-saving unrelated edits would
// re-notify everyone already @mentioned in the untouched part of the text.
export function extractNewMentions(oldText: string, newText: string, members: Profile[], excludeUserId: string): Profile[] {
  const before = new Set(extractMentions(oldText, members, excludeUserId).map((m) => m.id));
  return extractMentions(newText, members, excludeUserId).filter((m) => !before.has(m.id));
}

export async function notifyMentions(
  supabase: SupabaseClient,
  opts: {
    text: string;
    previousText?: string;
    members: Profile[];
    actorId: string;
    message: string;
    taskId?: string | null;
    projectId?: string | null;
  }
) {
  const mentioned =
    opts.previousText !== undefined
      ? extractNewMentions(opts.previousText, opts.text, opts.members, opts.actorId)
      : extractMentions(opts.text, opts.members, opts.actorId);
  if (mentioned.length === 0) return;
  await supabase.from('notifications').insert(
    mentioned.map((m) => ({
      user_id: m.id,
      type: 'mentioned' as const,
      actor_id: opts.actorId,
      task_id: opts.taskId ?? null,
      project_id: opts.projectId ?? null,
      message: opts.message,
    }))
  );
}
