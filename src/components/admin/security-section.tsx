'use client';

import { Lock, ShieldCheck } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
};

const ROLE_ORDER = ['owner', 'admin', 'member', 'guest'];

export function SecuritySection({ roleCounts, totalMembers }: { roleCounts: Record<string, number>; totalMembers: number }) {
  const summary = ROLE_ORDER.filter((role) => roleCounts[role] > 0)
    .map((role) => `${roleCounts[role]} ${ROLE_LABELS[role].toLowerCase()}${roleCounts[role] === 1 ? '' : 's'}`)
    .join(', ');

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">Security & access</h2>
      <p className="mt-0.5 text-sm text-ink-muted">How access to this workspace is controlled today.</p>

      <div className="mt-4 flex gap-3 rounded-xl border border-border p-4">
        <Lock size={18} className="mt-0.5 shrink-0 text-ink-faint" />
        <div>
          <p className="text-sm font-medium text-ink">Sign-up restricted to @boostoxygen.com</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            Enforced server-side by a Postgres trigger (<code className="rounded bg-surface-hover px-1 py-0.5 text-xs">handle_new_user()</code>)
            on account creation &mdash; any sign-up with a different email domain is rejected before a profile is ever created. This isn&apos;t
            configurable from this page; changing it requires a database migration.
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-3 rounded-xl border border-border p-4">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-ink-faint" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">Members by role</p>
          <p className="mt-0.5 text-sm text-ink-muted">{totalMembers === 0 ? 'No members yet.' : summary}</p>
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            {ROLE_ORDER.map((role, i) => (
              <div
                key={role}
                className={`flex items-center justify-between px-3 py-2 text-sm ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <span className="text-ink-muted">{ROLE_LABELS[role]}</span>
                <span className="font-medium text-ink">{roleCounts[role] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
