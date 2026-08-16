// ─────────────────────────────────────────────────────────────────────────────
// staff.ts — shared mock staff data
// ─────────────────────────────────────────────────────────────────────────────

export type StaffRole   = 'owner' | 'admin' | 'manager' | 'editor' | 'viewer';
export type StaffStatus = 'active' | 'inactive' | 'pending';
export type AccessLevel = 'full' | 'limited';

export interface StaffMember {
  id:          string;
  name:        string;
  email:       string;
  role:        StaffRole;
  title:       string;  // job title / position
  status:      StaffStatus;
  accessLevel: AccessLevel;
  avatarColor: string;
  joinedDate:  string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

export function staffInitials(s: Pick<StaffMember, 'name'>): string {
  const parts = s.name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : s.name.slice(0, 2).toUpperCase();
}

export const ROLE_LABEL: Record<StaffRole, string> = {
  owner:   'OWNER',
  admin:   'ADMIN',
  manager: 'MANAGER',
  editor:  'EDITOR',
  viewer:  'VIEWER',
};

export const ROLE_CHIP: Record<StaffRole, { bg: string; fg: string }> = {
  owner:   { bg: '#fece65', fg: '#755700' },
  admin:   { bg: '#e8ecf5', fg: '#1b2e5e' },
  manager: { bg: '#f0f0f4', fg: '#45464f' },
  editor:  { bg: '#f0f0f4', fg: '#45464f' },
  viewer:  { bg: '#f0f0f4', fg: '#45464f' },
};

// ── catalogue ─────────────────────────────────────────────────────────────────

export const STAFF_MEMBERS: StaffMember[] = [
  {
    id: '1', name: 'Marcus Thorne',   email: 'm.thorne@billbuzz.com',
    role: 'owner',   title: 'Senior Account Manager',
    status: 'active',   accessLevel: 'full',
    avatarColor: '#1b2e5e', joinedDate: 'Jan 1, 2021',
  },
  {
    id: '2', name: 'Elena Rodriguez', email: 'elena.r@billbuzz.com',
    role: 'admin',   title: 'Operations Manager',
    status: 'active',   accessLevel: 'full',
    avatarColor: '#c47f17', joinedDate: 'Mar 15, 2021',
  },
  {
    id: '3', name: 'James Dalton',    email: 'james.d@billbuzz.com',
    role: 'manager', title: 'Sales Manager',
    status: 'active',   accessLevel: 'limited',
    avatarColor: '#4338ca', joinedDate: 'Jul 10, 2022',
  },
  {
    id: '4', name: 'Kevin Zhang',     email: 'k.zhang@billbuzz.com',
    role: 'editor',  title: 'Accounts Editor',
    status: 'active',   accessLevel: 'limited',
    avatarColor: '#374151', joinedDate: 'Oct 3, 2022',
  },
  {
    id: '5', name: 'Sarah Miller',    email: 's.miller@pending.com',
    role: 'viewer',  title: 'Invoice Viewer',
    status: 'pending',  accessLevel: 'limited',
    avatarColor: '#9ca3af', joinedDate: 'Pending',
  },
  {
    id: '6', name: 'David Park',      email: 'd.park@billbuzz.com',
    role: 'editor',  title: 'Finance Editor',
    status: 'active',   accessLevel: 'limited',
    avatarColor: '#0d47a1', joinedDate: 'Nov 20, 2022',
  },
  {
    id: '7', name: 'Lisa Chen',       email: 'l.chen@billbuzz.com',
    role: 'manager', title: 'Client Manager',
    status: 'active',   accessLevel: 'limited',
    avatarColor: '#7e22ce', joinedDate: 'Feb 8, 2023',
  },
  {
    id: '8', name: 'Tom Adams',       email: 't.adams@billbuzz.com',
    role: 'viewer',  title: 'Junior Viewer',
    status: 'inactive', accessLevel: 'limited',
    avatarColor: '#64748b', joinedDate: 'Apr 12, 2023',
  },
];
