'use client';

import { useState } from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/lib/workspace-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { workspace, user } = useWorkspace();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const signupUrl = typeof window !== 'undefined' ? `${window.location.origin}/signup` : '';

  async function handleInvite() {
    if (!email.trim() || !workspace || !user) return;
    if (!email.toLowerCase().endsWith('@boostoxygen.com')) {
      setError('Only @boostoxygen.com addresses can be invited.');
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from('invites').insert({
      workspace_id: workspace.id,
      email: email.trim().toLowerCase(),
      role,
      invited_by: user.id,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEmail('');
  }

  function copyLink() {
    navigator.clipboard.writeText(signupUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite teammates</DialogTitle>
          <DialogDescription>
            Anyone with a @boostoxygen.com email can create an account and automatically join this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Share the sign-up link</label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-hover px-3 py-2">
              <span className="flex-1 block truncate text-sm text-ink-muted">{signupUrl}</span>
              <button onClick={copyLink} className="flex items-center gap-1 text-xs font-semibold text-brand-600">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-ink-faint">or track a pending invite</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@boostoxygen.com"
              className="flex-1 rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        </div>

        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover">
            Done
          </button>
          <button
            onClick={handleInvite}
            disabled={!email.trim() || loading}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Add invite
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
