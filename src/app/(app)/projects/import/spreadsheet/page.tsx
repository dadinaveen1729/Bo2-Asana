'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileSpreadsheet, Loader2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/lib/workspace-context';
import { useTeams } from '@/hooks/use-teams-projects';
import { createClient } from '@/lib/supabase/client';
import { cn, colorForIndex } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  parseSpreadsheetFile, guessMapping, distinctInOrder, buildMemberLookup, matchAssignee,
  parseFlexibleDate, parsePriority, NONE, type ColumnMapping,
} from '@/lib/spreadsheet-import';
import type { TablesInsert } from '@/types/database';

type Step = 'upload' | 'mapping' | 'importing' | 'done';

interface SkippedRow {
  row: number;
  reason: string;
}

interface ImportSummary {
  processed: number;
  created: number;
  skipped: SkippedRow[];
}

export default function SpreadsheetImportPage() {
  const router = useRouter();
  const { workspace, user, members } = useWorkspace();
  const { teams } = useTeams(workspace?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: NONE, section: NONE, assignee: NONE, dueDate: NONE, priority: NONE, notes: NONE,
  });

  const [projectName, setProjectName] = useState('');
  const [teamId, setTeamId] = useState('none');

  const [creating, setCreating] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setParsing(true);
    setFileName(file.name);
    try {
      const parsed = await parseSpreadsheetFile(file);
      if (parsed.rows.length === 0) {
        setError('No data rows found below the header row.');
        setParsing(false);
        return;
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(guessMapping(parsed.headers));
      if (!projectName.trim()) {
        setProjectName(file.name.replace(/\.(csv|xlsx|xls)$/i, ''));
      }
      setStep('mapping');
    } catch (e: any) {
      setError(e.message || 'Could not read that file.');
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function updateMapping(field: keyof ColumnMapping, value: string) {
    setMapping((m) => ({ ...m, [field]: value }));
  }

  async function runImport() {
    if (!workspace || !user || !projectName.trim() || mapping.name === NONE) return;
    setCreating(true);
    setError(null);
    setStep('importing');
    const supabase = createClient();

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspace.id,
        team_id: teamId === 'none' ? null : teamId,
        name: projectName.trim(),
        color: colorForIndex(Math.floor(Math.random() * 10)),
        privacy: 'public',
        created_by: user.id,
      })
      .select()
      .single();

    if (projectError || !project) {
      toast.error(projectError?.message || 'Could not create the project.');
      setCreating(false);
      setStep('mapping');
      return;
    }

    const { error: memberError } = await supabase
      .from('project_members')
      .insert({ project_id: project.id, user_id: user.id, role: 'owner' });
    if (memberError) {
      toast.error(memberError.message);
    }

    const sectionNames = mapping.section !== NONE
      ? distinctInOrder(rows.map((r) => r[mapping.section] || ''))
      : [];
    const orderedSectionNames = sectionNames.length > 0 ? sectionNames : ['Tasks'];

    const { data: newSections, error: sectionError } = await supabase
      .from('sections')
      .insert(orderedSectionNames.map((name, i) => ({ project_id: project.id, name, position: (i + 1) * 1000 })))
      .select()
      .order('position', { ascending: true });

    if (sectionError || !newSections || newSections.length === 0) {
      toast.error(sectionError?.message || 'Could not create sections.');
      setCreating(false);
      setStep('mapping');
      return;
    }

    const sectionIdByName = new Map(orderedSectionNames.map((name, i) => [name, newSections[i].id]));
    const fallbackSectionId = newSections[0].id;
    const memberLookup = buildMemberLookup(members.map((m) => ({ id: m.id, full_name: m.full_name, email: m.email })));

    const pending: { insert: TablesInsert<'tasks'>; sectionId: string }[] = [];
    const skipped: SkippedRow[] = [];

    rows.forEach((row, idx) => {
      const sheetRow = idx + 2; // +1 for 0-index, +1 for the header row
      const name = (row[mapping.name] || '').trim();
      if (!name) {
        skipped.push({ row: sheetRow, reason: 'Missing task name' });
        return;
      }

      const sectionValue = mapping.section !== NONE ? (row[mapping.section] || '').trim() : '';
      const sectionId = (sectionValue && sectionIdByName.get(sectionValue)) || fallbackSectionId;

      const assigneeId = mapping.assignee !== NONE ? matchAssignee(row[mapping.assignee] || '', memberLookup) : null;
      const dueDate = mapping.dueDate !== NONE ? parseFlexibleDate(row[mapping.dueDate] || '') : null;
      const priority = mapping.priority !== NONE ? parsePriority(row[mapping.priority] || '') : null;
      const notes = mapping.notes !== NONE ? (row[mapping.notes] || '').trim() || null : null;

      pending.push({
        insert: {
          workspace_id: workspace.id,
          name,
          notes,
          due_date: dueDate,
          priority,
          assignee_id: assigneeId,
          created_by: user.id,
          position: idx,
        },
        sectionId,
      });
    });

    if (pending.length === 0) {
      setSummary({ processed: rows.length, created: 0, skipped });
      setProjectId(project.id);
      setCreating(false);
      setStep('done');
      return;
    }

    const { data: insertedTasks, error: taskError } = await supabase
      .from('tasks')
      .insert(pending.map((p) => p.insert))
      .select();

    if (taskError || !insertedTasks) {
      toast.error(taskError?.message || 'Could not create tasks.');
      setCreating(false);
      setStep('mapping');
      return;
    }

    const taskProjectRows = insertedTasks.map((t, i) => ({
      task_id: t.id,
      project_id: project.id,
      section_id: pending[i].sectionId,
      position: i,
    }));

    const { error: linkError } = await supabase.from('task_projects').insert(taskProjectRows);
    if (linkError) {
      toast.error(linkError.message);
    }

    setSummary({ processed: rows.length, created: insertedTasks.length, skipped });
    setProjectId(project.id);
    setCreating(false);
    setStep('done');
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-ink">Import from spreadsheet</h1>
      <p className="mt-1 text-sm text-ink-muted">Upload a CSV or Excel file and Boost Hub will build a project from its rows.</p>

      {step === 'upload' && (
        <div className="mt-6 space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition',
              dragOver ? 'border-brand-400 bg-brand-50' : 'border-border-strong bg-surface-hover/40 hover:bg-surface-hover'
            )}
          >
            {parsing ? (
              <Loader2 size={26} className="animate-spin text-brand-500" />
            ) : (
              <UploadCloud size={26} className="text-ink-faint" />
            )}
            <div>
              <p className="text-[15px] font-semibold text-ink">
                {parsing ? 'Reading your file…' : 'Drop a .csv or .xlsx file, or click to browse'}
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">The first row should contain your column names.</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
          {error && <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end">
            <button onClick={() => router.back()} className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover">Cancel</button>
          </div>
        </div>
      )}

      {step === 'mapping' && (
        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-hover/50 px-3.5 py-2.5 text-[13px] text-ink-muted">
            <FileSpreadsheet size={15} className="shrink-0 text-brand-500" />
            <span>
              <span className="font-medium text-ink">{fileName}</span> — {rows.length} row{rows.length === 1 ? '' : 's'} detected, {headers.length} column{headers.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Project name</label>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Q3 Website Redesign"
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Team</label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">Map your columns</p>
            <div className="space-y-2">
              <MappingRow label="Task name" hint="Required" required headers={headers} value={mapping.name} onChange={(v) => updateMapping('name', v)} />
              <MappingRow label="Section / Status" hint="Creates one section per distinct value" headers={headers} value={mapping.section} onChange={(v) => updateMapping('section', v)} />
              <MappingRow label="Assignee" hint="Matched to workspace members by name or email" headers={headers} value={mapping.assignee} onChange={(v) => updateMapping('assignee', v)} />
              <MappingRow label="Due date" hint="e.g. 2026-08-24 or 08/24/2026" headers={headers} value={mapping.dueDate} onChange={(v) => updateMapping('dueDate', v)} />
              <MappingRow label="Priority" hint="High / Medium / Low" headers={headers} value={mapping.priority} onChange={(v) => updateMapping('priority', v)} />
              <MappingRow label="Notes / Description" headers={headers} value={mapping.notes} onChange={(v) => updateMapping('notes', v)} />
            </div>
          </div>

          {error && <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}

          <div className="flex justify-end gap-2">
            <button onClick={() => setStep('upload')} className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover">Back</button>
            <button
              onClick={runImport}
              disabled={!projectName.trim() || mapping.name === NONE || creating}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              Create project
            </button>
          </div>
        </div>
      )}

      {step === 'importing' && !summary && (
        <div className="mt-10 flex flex-col items-center justify-center gap-3 py-10 text-center">
          <Loader2 size={24} className="animate-spin text-brand-500" />
          <p className="text-sm text-ink-muted">Creating project and importing tasks…</p>
        </div>
      )}

      {step === 'done' && summary && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={18} className="shrink-0" />
              <p className="text-sm font-semibold">
                {summary.created} of {summary.processed} row{summary.processed === 1 ? '' : 's'} imported as tasks
              </p>
            </div>
            {summary.skipped.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-ink-muted">
                  {summary.skipped.length} row{summary.skipped.length === 1 ? '' : 's'} skipped:
                </p>
                <div className="mt-1.5 max-h-40 space-y-0.5 overflow-y-auto rounded-lg bg-surface-hover/50 p-2.5">
                  {summary.skipped.map((s) => (
                    <p key={s.row} className="text-xs text-ink-faint">Row {s.row}: {s.reason}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => router.push('/home')} className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover">Not now</button>
            {projectId && (
              <button
                onClick={() => router.push(`/projects/${projectId}`)}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Go to project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MappingRow({
  label, hint, value, onChange, headers, required,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  headers: string[];
  required?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </p>
        {hint && <p className="truncate text-xs text-ink-faint">{hint}</p>}
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48 shrink-0"><SelectValue placeholder="Not mapped" /></SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value={NONE}>Not mapped</SelectItem>}
          {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
