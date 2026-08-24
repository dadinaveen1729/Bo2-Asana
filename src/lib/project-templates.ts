import {
  ClipboardList, UserPlus2, KanbanSquare, CalendarDays, Megaphone, Bug,
  GitBranch, Languages, Handshake, PenTool, Ticket, TrendingUp,
} from 'lucide-react';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  greatFor: string;
  category: 'marketing' | 'operations' | 'it' | 'design' | 'product' | 'hr' | 'sales' | 'productivity';
  icon: typeof ClipboardList;
  color: string;
  sections: string[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'request-tracking',
    name: 'Request tracking',
    description: 'Capture, prioritize, and monitor requests until completion.',
    greatFor: 'Operations & PMO',
    category: 'operations',
    icon: ClipboardList,
    color: '#6C5CE7',
    sections: ['New requests', 'In review', 'In progress', 'Completed'],
  },
  {
    id: 'new-hire-checklist',
    name: 'New hire checklist',
    description: 'Outline onboarding steps, assign tasks with due dates, and track milestones to guide new hires from day one.',
    greatFor: 'HR',
    category: 'hr',
    icon: UserPlus2,
    color: '#2FBF9F',
    sections: ['Before day one', 'First week', 'First month', 'Done'],
  },
  {
    id: 'project-management',
    name: 'Project management',
    description: 'Plan projects, assign tasks, and manage deadlines to keep work moving from kickoff to delivery.',
    greatFor: 'Productivity',
    category: 'productivity',
    icon: KanbanSquare,
    color: '#FC636B',
    sections: ['To do', 'In progress', 'Review', 'Done'],
  },
  {
    id: 'content-calendar',
    name: 'Content calendar',
    description: 'Plan content, organize assets, and view schedules by channel to keep your marketing teams organized.',
    greatFor: 'Marketing',
    category: 'marketing',
    icon: CalendarDays,
    color: '#F2994A',
    sections: ['Ideas', 'Drafting', 'Scheduled', 'Published'],
  },
  {
    id: 'campaign-management',
    name: 'Campaign management',
    description: 'Plan, schedule, and track complex marketing campaigns with one workflow built to manage deadlines and deliverables.',
    greatFor: 'Marketing',
    category: 'marketing',
    icon: Megaphone,
    color: '#EB5E9C',
    sections: ['Planning', 'In production', 'Live', 'Wrap-up'],
  },
  {
    id: 'bug-tracking',
    name: 'Bug tracking',
    description: 'File, assign, and prioritize bugs in one place to fix issues faster.',
    greatFor: 'Product & Engineering',
    category: 'product',
    icon: Bug,
    color: '#F04438',
    sections: ['Backlog', 'Confirmed', 'In progress', 'Fixed'],
  },
  {
    id: 'engineering-project-plan',
    name: 'Engineering project plan',
    description: 'Break down work into tasks with due dates, organized by priority and stage to keep your team aligned.',
    greatFor: 'IT',
    category: 'it',
    icon: GitBranch,
    color: '#56CCF2',
    sections: ['Backlog', 'Design', 'In development', 'QA', 'Shipped'],
  },
  {
    id: 'content-localization',
    name: 'Content localization',
    description: 'Automate handoffs, track approvals, and localize content faster across regions.',
    greatFor: 'Design',
    category: 'design',
    icon: Languages,
    color: '#BB6BD9',
    sections: ['Source ready', 'Translating', 'Reviewing', 'Approved'],
  },
  {
    id: 'customer-implementation',
    name: 'Customer implementation',
    description: 'Track onboarding tasks, gather feedback in forms, and manage cross-team work to streamline implementation.',
    greatFor: 'Sales & CX',
    category: 'sales',
    icon: Handshake,
    color: '#17B26A',
    sections: ['Kickoff', 'Setup', 'Training', 'Live'],
  },
  {
    id: 'creative-requests',
    name: 'Creative requests',
    description: 'Track creative requests, collect feedback, and manage each production stage to deliver assets on time.',
    greatFor: 'Marketing',
    category: 'marketing',
    icon: PenTool,
    color: '#F2C94C',
    sections: ['Intake', 'In progress', 'Feedback', 'Delivered'],
  },
  {
    id: 'ticketing',
    name: 'Ticketing',
    description: 'Collect, prioritize, and resolve tickets to keep your service goals on track.',
    greatFor: 'IT',
    category: 'it',
    icon: Ticket,
    color: '#8395A7',
    sections: ['Open', 'Triaged', 'In progress', 'Resolved'],
  },
  {
    id: 'sales-pipeline',
    name: 'Sales pipeline',
    description: 'Track deals at a glance by adding sales projects to a shared portfolio.',
    greatFor: 'Sales & CX',
    category: 'sales',
    icon: TrendingUp,
    color: '#2E90FA',
    sections: ['Prospecting', 'Qualified', 'Proposal', 'Closed won'],
  },
];

export const TEMPLATE_CATEGORIES = [
  { key: 'for-you', label: 'For you' },
  { key: 'my-organization', label: 'My organization' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'operations', label: 'Operations & PMO' },
  { key: 'productivity', label: 'Productivity' },
  { key: 'manufacturing', label: 'Manufacturing' },
  { key: 'professional-services', label: 'Professional services' },
] as const;

export const MORE_CATEGORIES = [
  { key: 'it', label: 'IT' },
  { key: 'design', label: 'Design' },
  { key: 'product', label: 'Product & Engineering' },
  { key: 'hr', label: 'HR' },
  { key: 'sales', label: 'Sales & CX' },
  { key: 'retail', label: 'Retail' },
  { key: 'healthcare', label: 'Healthcare' },
] as const;
