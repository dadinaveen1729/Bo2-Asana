# BoostFlow

Internal work management platform for **Boost Oxygen** — projects, tasks, teams, portfolios, goals, and automation, built as a private, full-featured alternative to Asana for unlimited internal users.

Live production data lives in Supabase (Postgres). The app is a Next.js 14 (App Router) + TypeScript + Tailwind CSS front end, deployed on Vercel.

## Features

### Workspace & accounts
- Single shared "Boost Oxygen" workspace, auto-provisioned on first sign-up
- Sign-up restricted to `@boostoxygen.com` company email addresses
- Email/password authentication (Supabase Auth) with password reset flow
- Roles: Owner, Admin, Member, Guest
- Admin console: manage members, change roles, remove members, rename workspace, invite teammates

### Teams & Projects
- Teams with color, description, and membership
- Projects with color, icon, privacy (team-wide or private with explicit membership), status (On track / At risk / Off track / On hold / Complete)
- Project sections (custom columns/groups)
- Archive projects

### Task management
- Tasks with assignee, due date, start date, priority (Low/Medium/High), tags, notes/description
- Subtasks (nested tasks)
- Task dependencies ("blocked by" / "blocking")
- Comments with live activity feed (assignment changes, due date changes, completions, comments)
- Followers and likes
- Custom fields per project: text, number, single-select, multi-select, date, person, checkbox
- Multi-view task browsing:
  - **List view** — grouped by section, drag-and-drop reordering, inline add
  - **Board view** — Kanban columns per section, drag-and-drop between columns
  - **Calendar view** — month grid by due date, quick add per day
  - **Timeline view** — Gantt-style horizontal schedule by section
- Global quick-add task dialog (project/section/assignee/due date)
- Task detail side panel accessible from anywhere, plus shareable deep links (`/tasks/:id`)

### Personal productivity
- **Home** dashboard — greeting, upcoming/overdue tasks, recent projects
- **My tasks** — grouped by Overdue / Today / Upcoming / Later / No due date, with a personal task quick-add
- **Inbox** — real-time notifications for assignments, comments, and mentions

### Portfolios & Goals
- Portfolios group projects together for at-a-glance status rollup
- Goals with owner, progress %, status, and linked projects

### Automation
- Per-project automation rules ("Rules"), e.g.:
  - When a task is moved into a section → assign a person, add a tag, notify someone, or set a due date
  - When a task is marked complete → move it to a section, notify someone, or add a tag
- Rules execute server-side via Postgres triggers — no polling required

### Real-time & search
- Live updates everywhere via Supabase Realtime (tasks, comments, notifications, board/list changes sync instantly across users)
- Global command palette (`⌘K` / `Ctrl+K`) — jump to tasks, projects, teams, or navigate the app

## Tech stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Radix UI primitives, `@dnd-kit` for drag-and-drop
- **Backend:** Supabase (Postgres, Auth, Realtime, Row Level Security)
- **Hosting:** Vercel

## Local development

```bash
npm install
npm run dev
```

The app reads Supabase credentials from `.env` (already included with public, RLS-protected values — the anon key is safe to expose client-side).

## Database

Schema, RLS policies, and automation triggers are defined in `supabase/migrations/`. Every table has Row Level Security enabled, scoped to workspace membership and project privacy.

---

Built by Naveen Dadi
