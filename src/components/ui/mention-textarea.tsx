'use client';

import { forwardRef, useMemo, useRef, useState, type TextareaHTMLAttributes } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Tables } from '@/types/database';

type Profile = Tables<'profiles'>;

interface MentionTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  members: Profile[];
  excludeUserId?: string;
  // Extra classes for the wrapping <div> — needed when the textarea itself
  // relies on a flex-layout class (e.g. flex-1) from its parent, since that
  // now has to live on the wrapper instead.
  wrapperClassName?: string;
}

// Type "@" and a few letters anywhere in the text to get a live, filtered
// dropdown of workspace members — same interaction as Teams/Outlook mention
// pickers. Selecting one inserts their exact full name, which is what makes
// mention detection (src/lib/mentions.ts) reliable regardless of how someone
// abbreviated it while typing.
export const MentionTextarea = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(function MentionTextarea(
  { value, onChange, members, excludeUserId, onKeyDown, className, wrapperClassName, ...rest },
  forwardedRef
) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function setRefs(node: HTMLTextAreaElement | null) {
    localRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
  }

  const candidates = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return members
      .filter((m) => m.id !== excludeUserId)
      .filter((m) => (m.full_name || '').toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .slice(0, 6);
  }, [members, query, excludeUserId]);

  function detectMention(text: string, cursor: number) {
    const upToCursor = text.slice(0, cursor);
    const at = upToCursor.lastIndexOf('@');
    if (at === -1) return null;
    const before = upToCursor[at - 1];
    if (before && !/\s/.test(before)) return null; // "@" must start a word, not sit mid-word
    const between = upToCursor.slice(at + 1);
    if (/\s/.test(between)) return null; // a space after "@" ends the mention context
    return { start: at, query: between };
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    onChange(text);
    const cursor = e.target.selectionStart ?? text.length;
    const mention = detectMention(text, cursor);
    if (mention) {
      setQuery(mention.query);
      setMentionStart(mention.start);
      setActiveIndex(0);
    } else {
      setQuery(null);
      setMentionStart(null);
    }
  }

  function selectMember(m: Profile) {
    if (mentionStart === null || !localRef.current) return;
    const el = localRef.current;
    const cursor = el.selectionStart ?? value.length;
    const name = m.full_name || m.email;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const inserted = `@${name} `;
    onChange(before + inserted + after);
    setQuery(null);
    setMentionStart(null);
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query !== null && candidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % candidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + candidates.length) % candidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectMember(candidates[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setQuery(null);
        setMentionStart(null);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <div className={cn('relative', wrapperClassName)}>
      <textarea ref={setRefs} value={value} onChange={handleChange} onKeyDown={handleKeyDown} className={className} {...rest} />
      {query !== null && candidates.length > 0 && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-popover">
          {candidates.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectMember(m);
              }}
              className={cn('flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm', i === activeIndex ? 'bg-surface-hover' : 'hover:bg-surface-hover')}
            >
              <Avatar name={m.full_name} email={m.email} color={m.avatar_color} src={m.avatar_url} size={22} />
              <span className="min-w-0 flex-1 block truncate text-ink">{m.full_name || m.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
