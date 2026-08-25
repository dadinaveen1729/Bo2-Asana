'use client';

import { AlertTriangle, Building2, ShieldCheck, Tags as TagsIcon, Users, Users2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AdminSection = 'workspace' | 'members' | 'teams' | 'tags' | 'security' | 'danger';

const ITEMS: { id: AdminSection; label: string; icon: typeof Building2 }[] = [
  { id: 'workspace', label: 'Workspace settings', icon: Building2 },
  { id: 'members', label: 'Members & invites', icon: Users },
  { id: 'teams', label: 'Teams', icon: Users2 },
  { id: 'tags', label: 'Tags', icon: TagsIcon },
  { id: 'security', label: 'Security & access', icon: ShieldCheck },
  { id: 'danger', label: 'Danger zone', icon: AlertTriangle },
];

export function AdminNav({ active, onChange }: { active: AdminSection; onChange: (section: AdminSection) => void }) {
  return (
    <nav className="flex shrink-0 flex-col gap-0.5 py-1 sm:w-[200px]">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
              isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
            )}
          >
            <Icon size={15} className={isActive ? 'text-brand-600' : 'text-ink-faint'} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
