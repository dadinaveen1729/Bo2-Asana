import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '@/types/database';

type Profile = Tables<'profiles'>;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Plain-text "@..." detection against workspace members. The mention
// autocomplete (MentionTextarea) always inserts the full name, but this
// also has to handle whatever someone types by hand without it — so it
// matches on the full name, its first word, the email's local-part, and
// the full email, each requiring a word boundary right after (so "@ed"
// doesn't false-match inside "@edited"). Case-insensitive throughout.
export function extractMentions(text: string, members: Profile[], excludeUserId: string): Profile[] {
  return members.filter((m) => {
    if (m.id === excludeUserId) return false;
    const fullName = (m.full_name || '').trim();
    const firstName = fullName.split(/\s+/)[0] || '';
    const emailLocal = m.email.split('@')[0];
    const candidates = Array.from(new Set([fullName, firstName, emailLocal, m.email].filter((c) => c && c.length > 1)));
    return candidates.some((c) => new RegExp('@' + escapeRegex(c) + '(?![a-z0-9])', 'i').test(text));
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
