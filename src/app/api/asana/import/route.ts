import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listSections, listTasks, listProjectMembers, asanaColorToHex, AsanaError, type AsanaProject } from '@/lib/asana';
import { colorForIndex } from '@/lib/utils';

export const maxDuration = 60;

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
    const addedMemberIds = new Set([user.id]);
    let membersShared = 0;
    let unmatchedMembers = 0;
    for (const m of asanaMembers) {
      const email = m.email?.toLowerCase();
      const matchedUserId = email ? emailToUserId.get(email) : undefined;
      if (!matchedUserId) {
        if (email) unmatchedMembers++;
        continue;
      }
      if (addedMemberIds.has(matchedUserId)) continue;
      addedMemberIds.add(matchedUserId);
      membersShared++;
    }
    const memberRowsToInsert = Array.from(addedMemberIds)
      .filter((id) => id !== user.id)
      .map((userId) => ({ project_id: newProject.id, user_id: userId, role: 'editor' as const }));
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
        assignee_id: assigneeId,
        created_by: user.id,
        position: position++,
        // Historical data being brought in, not a live assignment happening
        // right now -- suppresses the 'assigned' notification/email the
        // task-insert trigger would otherwise fire once per task (see
        // migration 022; importing N of someone's tasks used to send them
        // N assignment emails all at once).
        imported: true,
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

    return NextResponse.json({
      projectId: newProject.id,
      projectName: newProject.name,
      sectionsImported: newSections.length,
      tasksImported: insertedTasks?.length || 0,
      unmatchedAssignees,
      membersShared,
      unmatchedMembers,
    });
  } catch (err: any) {
    const status = err instanceof AsanaError ? err.status : 500;
    return NextResponse.json({ error: err.message || 'Import failed.' }, { status });
  }
}
