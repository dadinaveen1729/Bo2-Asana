import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  listSections,
  listTasks,
  listProjectMembers,
  listTaskStories,
  asanaColorToHex,
  AsanaError,
  type AsanaProject,
  type AsanaMember,
  type AsanaStory,
} from '@/lib/asana';
import { colorForIndex } from '@/lib/utils';

export const maxDuration = 60;

// Matches Asana project members to existing Boost Hub accounts by email
// (skipping anyone already a member) so both the fresh-import path and the
// already-imported top-up path share the exact same matching logic.
function matchNewMembers(
  asanaMembers: AsanaMember[],
  emailToUserId: Map<string, string>,
  alreadyMemberIds: Set<string>
) {
  const toAdd = new Set<string>();
  let unmatchedMembers = 0;
  for (const m of asanaMembers) {
    const email = m.email?.toLowerCase();
    const matchedUserId = email ? emailToUserId.get(email) : undefined;
    if (!matchedUserId) {
      if (email) unmatchedMembers++;
      continue;
    }
    if (alreadyMemberIds.has(matchedUserId)) continue;
    toAdd.add(matchedUserId);
  }
  return { toAdd, unmatchedMembers };
}

// Runs `fn` over `items` with at most `limit` in flight at once -- per-task
// story fetches are n+1 by nature (one Asana request per task), so this
// keeps a 100-task project from either blasting Asana's rate limit or
// blowing this route's time budget with fully sequential requests.
async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

function commentBody(story: AsanaStory) {
  const author = story.created_by?.name || 'Someone';
  const date = story.created_at.slice(0, 10);
  return `**${author}** commented in Asana on ${date}:\n\n${story.text || ''}`;
}

// Pulls real human comments (Asana "stories" of type 'comment', which
// excludes system entries like "assigned"/"marked complete") for each
// given task and inserts them. Attributed to the importer, not the true
// original Asana author -- the comments_insert RLS policy requires
// author_id = auth.uid(), so a comment can never be inserted as someone
// else even during an import; the real author's name and date are kept
// in the body text instead. `imported: true` skips the real notification
// a normal comment insert would fire (see migration 025) -- without it,
// backfilling a project's history would email every assignee once per
// historical comment, the same flood 022 already fixed for assignment.
async function importComments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  token: string,
  pairs: { asanaTaskGid: string; taskId: string }[],
  importerId: string
) {
  const rows: {
    task_id: string;
    author_id: string;
    body: string;
    created_at: string;
    imported: true;
    asana_story_gid: string;
  }[] = [];

  await mapWithConcurrency(pairs, 6, async (pair) => {
    let stories: AsanaStory[];
    try {
      stories = await listTaskStories(token, pair.asanaTaskGid);
    } catch {
      return; // best-effort -- one task's history failing shouldn't sink the whole import
    }
    for (const story of stories) {
      if (story.type !== 'comment' || !story.text) continue;
      rows.push({
        task_id: pair.taskId,
        author_id: importerId,
        body: commentBody(story),
        created_at: story.created_at,
        imported: true,
        asana_story_gid: story.gid,
      });
    }
  });

  if (!rows.length) return 0;
  const { data } = await supabase
    .from('comments')
    .upsert(rows, { onConflict: 'task_id,asana_story_gid', ignoreDuplicates: true })
    .select('id');
  return data?.length || 0;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { token, workspaceId, teamId, project } = (await req.json()) as {
    token: string;
    workspaceId: string;
    teamId: string | null;
    project: AsanaProject;
  };

  if (!token || !workspaceId || !project?.gid) {
    return NextResponse.json({ error: 'Missing token, workspace, or project.' }, { status: 400 });
  }

  try {
    const [asanaSections, asanaTasks, asanaMembers] = await Promise.all([
      listSections(token, project.gid),
      listTasks(token, project.gid),
      listProjectMembers(token, project.gid),
    ]);

    // Match Asana assignee emails to existing Boost Hub profiles in this workspace.
    const { data: memberRows } = await supabase
      .from('workspace_members')
      .select('user_id, profiles(email)')
      .eq('workspace_id', workspaceId);
    const emailToUserId = new Map<string, string>();
    for (const row of memberRows || []) {
      const email = (row as any).profiles?.email as string | undefined;
      if (email) emailToUserId.set(email.toLowerCase(), row.user_id);
    }

    // Nothing used to stop the same Asana project from being imported
    // twice -- every click created a brand-new project + tasks from
    // scratch, no memory of "this was already imported." A repeat import
    // now just tops up sharing and backfills history on the existing
    // project instead of cloning everything again (see migration
    // asana_import_dedup).
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .eq('asana_gid', project.gid)
      .maybeSingle();

    if (existingProject) {
      const { data: existingMemberRows } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', existingProject.id);
      const existingMemberIds = new Set((existingMemberRows || []).map((m) => m.user_id));

      const { toAdd, unmatchedMembers } = matchNewMembers(asanaMembers, emailToUserId, existingMemberIds);
      if (!existingMemberIds.has(user.id)) toAdd.add(user.id);

      const rowsToInsert = Array.from(toAdd).map((userId) => ({
        project_id: existingProject.id,
        user_id: userId,
        role: 'editor' as const,
      }));
      if (rowsToInsert.length) {
        await supabase.from('project_members').insert(rowsToInsert);
      }

      // Backfill history on an already-imported project: match each Asana
      // task to its existing Boost Hub task (by asana_gid if a prior import
      // already recorded it, falling back to matching by name for tasks
      // imported before that tracking existed), self-healing asana_gid and
      // the original created/completed dates onto anything found only by
      // name, then pull in any comments not already imported.
      const { data: existingTaskLinks } = await supabase
        .from('task_projects')
        .select('tasks(id, name, asana_gid)')
        .eq('project_id', existingProject.id);

      const byGid = new Map<string, { id: string; name: string; asana_gid: string | null }>();
      const byName = new Map<string, { id: string; name: string; asana_gid: string | null }>();
      for (const link of existingTaskLinks || []) {
        const t = (link as any).tasks as { id: string; name: string; asana_gid: string | null } | null;
        if (!t) continue;
        if (t.asana_gid) byGid.set(t.asana_gid, t);
        if (!byName.has(t.name.toLowerCase())) byName.set(t.name.toLowerCase(), t);
      }

      const pairs: { asanaTaskGid: string; taskId: string }[] = [];
      const backfillRows: { id: string; asana_gid: string; created_at: string; completed_at: string | null }[] = [];
      for (const t of asanaTasks) {
        const matched = byGid.get(t.gid) || byName.get(t.name.toLowerCase());
        if (!matched) continue;
        pairs.push({ asanaTaskGid: t.gid, taskId: matched.id });
        if (!matched.asana_gid) {
          backfillRows.push({ id: matched.id, asana_gid: t.gid, created_at: t.created_at, completed_at: t.completed_at });
        }
      }
      // Always updates to existing rows (never a fresh insert), so plain
      // per-row updates rather than upsert -- upsert's generated type
      // demands every required Insert column even though only these three
      // are ever touched via ON CONFLICT DO UPDATE.
      for (const row of backfillRows) {
        await supabase
          .from('tasks')
          .update({ asana_gid: row.asana_gid, created_at: row.created_at, completed_at: row.completed_at })
          .eq('id', row.id);
      }
      const commentsImported = await importComments(supabase, token, pairs, user.id);

      return NextResponse.json({
        projectId: existingProject.id,
        projectName: existingProject.name,
        alreadyImported: true,
        sectionsImported: 0,
        tasksImported: 0,
        unmatchedAssignees: 0,
        membersShared: rowsToInsert.length,
        unmatchedMembers,
        commentsImported,
      });
    }

    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspaceId,
        team_id: teamId || null,
        name: project.name,
        color: asanaColorToHex(project.color, colorForIndex(0)),
        description: project.notes || null,
        privacy: 'private',
        created_by: user.id,
        asana_gid: project.gid,
      })
      .select()
      .single();

    if (projectError || !newProject) {
      return NextResponse.json({ error: projectError?.message || 'Could not create project.' }, { status: 500 });
    }

    await supabase.from('project_members').insert({ project_id: newProject.id, user_id: user.id, role: 'owner' });

    // Projects default to private (see migration 022), which correctly
    // stopped every import from leaking to the whole workspace -- but on
    // its own that also meant nobody except whoever ran the import could
    // see it, even people the project was genuinely shared with in Asana.
    // Recreate that same sharing here: match Asana's project members to
    // existing Boost Hub accounts by email (same technique already used
    // for task assignees below) and add each match as a project member,
    // so the import doesn't quietly strand everyone else's access.
    const { toAdd, unmatchedMembers } = matchNewMembers(asanaMembers, emailToUserId, new Set([user.id]));
    const membersShared = toAdd.size;
    const memberRowsToInsert = Array.from(toAdd).map((userId) => ({
      project_id: newProject.id,
      user_id: userId,
      role: 'editor' as const,
    }));
    if (memberRowsToInsert.length) {
      await supabase.from('project_members').insert(memberRowsToInsert);
    }

    // Asana projects commonly have several sections that share a display name
    // (e.g. multiple "Untitled section"s), so sections must be matched by
    // Asana's gid, not by name — insert in a fixed order and zip by position
    // rather than trusting the map's name keys (which would collide).
    const orderedAsanaSections = asanaSections.length > 0 ? asanaSections : [{ gid: '__default__', name: 'Tasks' }];
    const { data: newSections, error: sectionError } = await supabase
      .from('sections')
      .insert(orderedAsanaSections.map((s, i) => ({ project_id: newProject.id, name: s.name, position: (i + 1) * 1000 })))
      .select()
      .order('position', { ascending: true });

    if (sectionError || !newSections) {
      return NextResponse.json({ error: sectionError?.message || 'Could not create sections.' }, { status: 500 });
    }

    const sectionIdByGid = new Map(orderedAsanaSections.map((s, i) => [s.gid, newSections[i].id]));
    const fallbackSectionId = newSections[0].id;

    let unmatchedAssignees = 0;
    let position = 0;
    const taskInserts: any[] = [];
    for (const t of asanaTasks) {
      const assigneeEmail = t.assignee?.email?.toLowerCase();
      const assigneeId = assigneeEmail ? emailToUserId.get(assigneeEmail) || null : null;
      if (t.assignee && !assigneeId) unmatchedAssignees++;
      taskInserts.push({
        workspace_id: workspaceId,
        name: t.name,
        notes: t.notes || null,
        due_date: t.due_on,
        completed: t.completed,
        // Preserves the task's real Asana history instead of every
        // imported task looking like it was created/completed the
        // instant the import ran.
        created_at: t.created_at,
        completed_at: t.completed_at,
        assignee_id: assigneeId,
        created_by: user.id,
        position: position++,
        // Historical data being brought in, not a live assignment happening
        // right now -- suppresses the 'assigned' notification/email the
        // task-insert trigger would otherwise fire once per task (see
        // migration 022; importing N of someone's tasks used to send them
        // N assignment emails all at once).
        imported: true,
        asana_gid: t.gid,
        __sectionGid: t.memberships.find((m) => m.section)?.section?.gid || null,
      });
    }

    const { data: insertedTasks, error: taskError } = taskInserts.length
      ? await supabase
          .from('tasks')
          .insert(taskInserts.map(({ __sectionGid, ...rest }) => rest))
          .select()
      : { data: [], error: null };

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    if (insertedTasks && insertedTasks.length > 0) {
      const taskProjectRows = insertedTasks.map((row, i) => ({
        task_id: row.id,
        project_id: newProject.id,
        section_id: sectionIdByGid.get(taskInserts[i].__sectionGid) || fallbackSectionId,
        position: i,
      }));
      const { error: linkError } = await supabase.from('task_projects').insert(taskProjectRows);
      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 500 });
      }
    }

    const commentsImported = insertedTasks?.length
      ? await importComments(
          supabase,
          token,
          insertedTasks.map((row, i) => ({ asanaTaskGid: asanaTasks[i].gid, taskId: row.id })),
          user.id
        )
      : 0;

    return NextResponse.json({
      projectId: newProject.id,
      projectName: newProject.name,
      sectionsImported: newSections.length,
      tasksImported: insertedTasks?.length || 0,
      unmatchedAssignees,
      membersShared,
      unmatchedMembers,
      commentsImported,
    });
  } catch (err: any) {
    const status = err instanceof AsanaError ? err.status : 500;
    return NextResponse.json({ error: err.message || 'Import failed.' }, { status });
  }
}
