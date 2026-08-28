import api from '../lib/axios';

// ─── Types — mirror StaffMemberListSerializer / StaffMemberSerializer exactly ──
// (snake_case <-> camelCase conversion is handled by axios middleware)

export type PermissionLevel = 'managerial_access' | 'limited_access';
export type StaffStatus = 'active' | 'inactive';

export interface StaffMember {
  id:                      string;
  email:                   string;
  firstName:               string;
  lastName:                string;
  fullName:                string;
  department:              string;
  permissionLevel:         PermissionLevel;
  status:                  StaffStatus;
  requiresPasswordChange:  boolean;
  createdAt:               string;
}

// Only StaffMemberSerializer (not the list one) includes these.
export interface StaffMemberDetail extends StaffMember {
  passwordChangedAt: string | null;
  isOnline:           boolean;
  updatedAt:          string;
}

export interface Invitation {
  id:          string;
  email:       string;
  token:       string;
  isAccepted:  boolean;
  createdAt:   string;
  acceptedAt:  string | null;
}

// ─── Payloads ───────────────────────────────────────────────────────────────

export interface CreateStaffPayload {
  email:            string;
  firstName:        string;
  lastName:         string;
  department?:      string;
  permissionLevel?: PermissionLevel;
}

export interface CreateStaffResponse {
  message:      string;
  emailSent:    boolean;
  staff:        StaffMemberDetail;
  tempPassword?: string; // only present when emailSent is false
}

export interface InviteStaffPayload {
  email:            string;
  // ⚠ Backend accepts this but currently drops it — Invitation has no
  // permission_level column and CreateInvitationSerializer.create() never
  // uses the field. It has no effect today; set the level via
  // updateStaffMember() after the invite is accepted instead.
  permissionLevel?: PermissionLevel;
}

export interface InviteStaffResponse {
  message:   string;
  emailSent: boolean;
  email:     string;
  token:     string;
}

export interface AcceptInvitePayload {
  token:            string;
  password:         string;
  passwordConfirm:  string;
  firstName:        string;
  lastName:         string;
  department?:      string;
}

// PATCH /api/staff/{id}/ — owner-only, department + permissionLevel
export interface UpdateStaffPayload {
  department?:      string;
  permissionLevel?: PermissionLevel;
}

// StaffMemberUpdateSerializer.Meta.fields = ['department', 'permission_level']
// ONLY — the PATCH response does not include email, fullName, status, etc.
// even though the model has them. Don't type this as StaffMemberDetail.
export interface UpdateStaffResponse {
  department:      string;
  permissionLevel: PermissionLevel;
}

// GET /api/staff/me/dashboard/ — shape of get_full_staff_data()
export interface StaffDashboardData {
  documentsCreated:     number;
  revenueGenerated:     string; // Decimal serialized as string
  avgTransactionValue:  string; // Decimal serialized as string
  staffInfo:            StaffMemberDetail;
}

export const staffService = {
  /** Owner/admin: every staff member for this business. Staff: only themselves.
   *  Real REST list endpoint — GET /api/staff/. */
  async list(): Promise<StaffMember[]> {
    const { data } = await api.get<StaffMember[]>('/api/staff/');
    return data;
  },

  /** Detail view for one staff member — GET /api/staff/{id}/. */
  async get(staffId: string): Promise<StaffMemberDetail> {
    const { data } = await api.get<StaffMemberDetail>(`/api/staff/${staffId}/`);
    return data;
  },

  /**
   * Owner creates a staff account directly, with a temp password generated
   * server-side. Never send a password from the client — CreateStaffSerializer
   * doesn't accept one.
   */
  async createStaff(payload: CreateStaffPayload): Promise<CreateStaffResponse> {
    const { data } = await api.post<CreateStaffResponse>('/api/staff/create_staff/', payload);
    return data;
  },

  /** Owner invites via an emailed accept-link instead of a direct temp-password account. */
  async invite(payload: InviteStaffPayload): Promise<InviteStaffResponse> {
    const { data } = await api.post<InviteStaffResponse>('/api/staff/invite/', payload);
    return data;
  },

  /** Owner-only: every unaccepted invitation for this business. */
  async listInvitations(): Promise<Invitation[]> {
    const { data } = await api.get<Invitation[]>('/api/staff/invitations/');
    return data;
  },

  async resendInvitation(invitationId: string): Promise<{ message: string; emailSent: boolean }> {
    const { data } = await api.post(`/api/staff/invitations/${invitationId}/resend/`);
    return data;
  },

  async cancelInvitation(invitationId: string): Promise<{ message: string }> {
    const { data } = await api.post(`/api/staff/invitations/${invitationId}/cancel/`);
    return data;
  },

  /** Public (no auth) — the invited person accepts and sets their own password. */
  async acceptInvite(payload: AcceptInvitePayload): Promise<{
    message: string;
    user: { id: string; email: string; firstName: string };
  }> {
    const { data } = await api.post('/api/staff/accept_invite/', payload);
    return data;
  },

 
  async getMyDashboard(): Promise<StaffDashboardData> {
    const { data } = await api.get<StaffDashboardData>('/api/staff/me/dashboard/');
    return data;
  },

  /**
   * Owner-only: edit another staff member's department/permissionLevel.
   * Response only contains { department, permissionLevel } — see
   * UpdateStaffResponse for why.
   */
  async updateStaffMember(staffId: string, payload: UpdateStaffPayload): Promise<UpdateStaffResponse> {
    const { data } = await api.patch<UpdateStaffResponse>(`/api/staff/${staffId}/`, payload);
    return data;
  },

  async deactivate(staffId: string): Promise<{ message: string }> {
    const { data } = await api.post(`/api/staff/deactivate/${staffId}/`);
    return data;
  },

  async activate(staffId: string): Promise<{ message: string }> {
    const { data } = await api.post(`/api/staff/activate/${staffId}/`);
    return data;
  },
};