// ─────────────────────────────────────────────────────────────────────────────
// clients.ts — shared mock client catalogue
// ─────────────────────────────────────────────────────────────────────────────

export type ClientStatus = 'active' | 'inactive' | 'pending';

export interface Client {
  id:                string;
  firstName:         string;
  lastName:          string;
  businessName:      string;
  email:             string;
  phone:             string;
  status:            ClientStatus;
  paymentPreference: string;
  tags:              string[];
  outstanding:       number;
  lifetimeValue:     number;
  isOverdue:         boolean;
  yoyGrowth:         string;    // e.g. "+12%"
  isOnline:          boolean;
  avatarColor:       string;    // initials background hex
  recentDocIds:      string[];  // references DOCS ids
  joinedDate:        string;
}

export function initials(c: Client): string {
  return `${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`.toUpperCase();
}

export function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── catalogue ─────────────────────────────────────────────────────────────────

export const CLIENTS: Client[] = [
  {
    id: '1',
    firstName: 'John', lastName: 'Smith',
    businessName: 'Acme Corp.',
    email: 'john.smith@acmecorp.com',
    phone: '+1 (555) 012-3456',
    status: 'active',
    paymentPreference: 'Bank Transfer (ACH)',
    tags: ['Enterprise', 'High-Priority'],
    outstanding: 1200, lifetimeValue: 15400,
    isOverdue: true, yoyGrowth: '+12%',
    isOnline: true,
    avatarColor: '#1b2e5e',
    recentDocIds: ['1', '2'],
    joinedDate: 'Jan 12, 2022',
  },
  {
    id: '2',
    firstName: 'Alice', lastName: 'Wong',
    businessName: 'DesignFlow Studio',
    email: 'a.wong@designflow.io',
    phone: '+1 (555) 789-0123',
    status: 'active',
    paymentPreference: 'Credit Card',
    tags: ['Retail'],
    outstanding: 0, lifetimeValue: 8200,
    isOverdue: false, yoyGrowth: '+8%',
    isOnline: true,
    avatarColor: '#c47f17',
    recentDocIds: ['3'],
    joinedDate: 'Mar 5, 2022',
  },
  {
    id: '3',
    firstName: 'Marcus', lastName: 'Reed',
    businessName: 'Reed Logistics Ltd.',
    email: 'marcus@reedlogistics.com',
    phone: '+44 20 7946 0958',
    status: 'pending',
    paymentPreference: 'Wire Transfer',
    tags: ['Logistics'],
    outstanding: 3400, lifetimeValue: 5100,
    isOverdue: false, yoyGrowth: '+3%',
    isOnline: false,
    avatarColor: '#374151',
    recentDocIds: ['4'],
    joinedDate: 'Jun 19, 2023',
  },
  {
    id: '4',
    firstName: 'Elena', lastName: 'Miller',
    businessName: 'GlobalNexus Inc.',
    email: 'elena.m@globalnexus.net',
    phone: '+1 (555) 456-7890',
    status: 'active',
    paymentPreference: 'PayPal',
    tags: ['SMB'],
    outstanding: 500, lifetimeValue: 4300,
    isOverdue: false, yoyGrowth: '+5%',
    isOnline: true,
    avatarColor: '#2e7d32',
    recentDocIds: ['5'],
    joinedDate: 'Aug 3, 2023',
  },
  {
    id: '5',
    firstName: 'David', lastName: 'Brown',
    businessName: 'Heritage Group',
    email: 'dbrown@heritage.com',
    phone: '+1 (555) 222-3333',
    status: 'inactive',
    paymentPreference: 'Check',
    tags: ['Corporate'],
    outstanding: 0, lifetimeValue: 22000,
    isOverdue: false, yoyGrowth: '+18%',
    isOnline: false,
    avatarColor: '#7e22ce',
    recentDocIds: ['6'],
    joinedDate: 'Feb 14, 2021',
  },
  {
    id: '6',
    firstName: 'Alex', lastName: 'Sterling',
    businessName: 'Sterling Media Group, LLC',
    email: 'a.sterling@smg.com',
    phone: '(555) 012-3456',
    status: 'active',
    paymentPreference: 'Bank Transfer (ACH)',
    tags: ['Enterprise', 'High-Priority'],
    outstanding: 1200, lifetimeValue: 15400,
    isOverdue: true, yoyGrowth: '+12%',
    isOnline: false,
    avatarColor: '#0d47a1',
    recentDocIds: ['1', '2'],
    joinedDate: 'Apr 22, 2020',
  },
];
