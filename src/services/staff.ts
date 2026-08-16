import api from '../lib/axios';

export interface StaffCreatePayload {
  name:            string;
  email:           string;
  password:        string;   // generated temp password
  title?:          string;
  role?:           'owner' | 'admin' | 'manager' | 'editor' | 'viewer';
  accessLevel?:    'full' | 'limited';
  isActive?:       boolean;
  notifyByEmail?:  boolean;
}

export interface StaffUpdatePayload {
  name?:          string;
  title?:         string;
  role?:          string;
  accessLevel?:   'full' | 'limited';
  isActive?:      boolean;
}

export const staffService = {
  /** List all users belonging to this business */
  async list(): Promise<any> {
    const { data } = await api.get('/api/users/');
    return data;
  },

  /** GET a single user */
  async get(id: string): Promise<any> {
    const { data } = await api.get(`/api/users/${id}/`);
    return data;
  },

  /**
   * Invite a new staff member — calls the register endpoint with a pre-set
   * password; the backend will email the credentials if notifyByEmail is true.
   */
  async create(payload: StaffCreatePayload): Promise<any> {
    const { data } = await api.post('/api/users/register/', {
      ...payload,
      role: payload.role ?? 'staff',
    });
    return data;
  },

  /** PATCH update staff profile / role / access */
  async update(id: string, payload: StaffUpdatePayload): Promise<any> {
    const { data } = await api.patch(`/api/users/${id}/`, payload);
    return data;
  },

  /** GET the staff member's own dashboard (limited view) */
  async getStaffDashboard(): Promise<any> {
    const { data } = await api.get('/api/staff/me/dashboard/');
    return data;
  },
};
