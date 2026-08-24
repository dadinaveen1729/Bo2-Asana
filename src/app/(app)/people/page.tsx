'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { Avatar } from '@/components/ui/avatar';

export default function PeoplePage() {
  const { members, workspace } = useWorkspace();
  const [query, setQuery] = useState('');

  const filtered = members.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (m.full_name || '').toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.title || '').toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <h1 className="text-2xl font-semibold text-ink">People</h1>
      <p className="mt-0.5 text-sm text-ink-muted">{members.length} member{members.length === 1 ? '' : 's'} in {workspace?.name}</p>

      <div className="relative mt-5 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a person"
          className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <Link
            key={m.id}
            href={`/people/${m.id}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 transition hover:border-border-strong hover:shadow-panel"
          >
            <Avatar name={m.full_name} email={m.email} color={m.avatar_color} src={m.avatar_url} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{m.full_name || m.email}</p>
              <p className="truncate text-xs text-ink-faint">{m.title || m.email}</p>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-ink-muted">No one matches "{query}".</p>
        )}
      </div>
    </div>
  );
}
