const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('civiliq_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('civiliq_token');
    localStorage.removeItem('civiliq_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (body: { firmName: string; firmSlug: string; name: string; email: string; password: string }) =>
    request<{ accessToken: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // ── Projects ──────────────────────────────────────────────────────────────
  getProjects: () => request<any[]>('/projects'),
  getProject: (id: string) => request<any>(`/projects/${id}`),
  createProject: (body: any) => request<any>('/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProject: (id: string, body: any) => request<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getProjectStats: (id: string) => request<any>(`/projects/${id}/stats`),

  // ── Documents ─────────────────────────────────────────────────────────────
  getDocuments: (projectId?: string) =>
    request<any[]>(`/documents${projectId ? `?projectId=${projectId}` : ''}`),
  getDocument: (id: string) => request<any>(`/documents/${id}`),
  getDocumentDownloadUrl: (id: string) => request<{ url: string }>(`/documents/${id}/download`),

  uploadDocument: async (projectId: string, file: File, type: string, templateSchemaId?: string) => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    form.append('projectId', projectId);
    form.append('type', type);
    if (templateSchemaId) form.append('templateSchemaId', templateSchemaId);

    const res = await fetch(`${API_BASE}/api/v1/documents/upload`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },

  // ── Materials ─────────────────────────────────────────────────────────────
  getMaterials: (projectId?: string) =>
    request<any[]>(`/materials${projectId ? `?projectId=${projectId}` : ''}`),
  getMaterial: (id: string) => request<any>(`/materials/${id}`),
  createMaterial: (body: any) => request<any>('/materials', { method: 'POST', body: JSON.stringify(body) }),
  updateMaterial: (id: string, body: any) =>
    request<any>(`/materials/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // ── Running Account Bills ─────────────────────────────────────────────────
  getBills: (projectId?: string) =>
    request<any[]>(`/bills${projectId ? `?projectId=${projectId}` : ''}`),
  getBill: (id: string) => request<any>(`/bills/${id}`),
  createBill: (body: any) => request<any>('/bills', { method: 'POST', body: JSON.stringify(body) }),
  updateBill: (id: string, body: any) =>
    request<any>(`/bills/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // ── Team ──────────────────────────────────────────────────────────────────
  getTeam: () => request<any[]>('/team'),
  inviteUser: (body: { name: string; email: string; role: string }) =>
    request<any>('/team/invite', { method: 'POST', body: JSON.stringify(body) }),
  updateUserRole: (userId: string, role: string) =>
    request<any>(`/team/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),

  // ── Subcontractors ────────────────────────────────────────────────────────
  getSubcontractors: () => request<any[]>('/subcontractors'),
  createSubcontractor: (body: any) =>
    request<any>('/subcontractors', { method: 'POST', body: JSON.stringify(body) }),

  // ── Work Packages ─────────────────────────────────────────────────────────
  getWorkPackages: (projectId: string) => request<any[]>(`/work-packages?projectId=${projectId}`),
  createWorkPackage: (body: any) =>
    request<any>('/work-packages', { method: 'POST', body: JSON.stringify(body) }),

  // ── Agent Jobs ────────────────────────────────────────────────────────────
  getAgentJobs: (projectId?: string) =>
    request<any[]>(`/agent-jobs${projectId ? `?projectId=${projectId}` : ''}`),
  triggerAgent: (agentType: string, projectId?: string) =>
    request<any>('/agent-jobs', { method: 'POST', body: JSON.stringify({ agentType, projectId }) }),

  // ── Notifications ─────────────────────────────────────────────────────────
  getNotifications: () => request<any[]>('/notifications'),
  markNotificationSeen: (id: string) =>
    request<any>(`/notifications/${id}/seen`, { method: 'PATCH' }),

  // ── Tenders ───────────────────────────────────────────────────────────────
  getTenders: () => request<any[]>('/tenders'),
  createTender: (body: any) => request<any>('/tenders', { method: 'POST', body: JSON.stringify(body) }),
  updateTender: (id: string, body: any) =>
    request<any>(`/tenders/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // ── Variations ────────────────────────────────────────────────────────────
  getVariations: (projectId: string) =>
    request<any[]>(`/variations?projectId=${projectId}`),
  createVariation: (body: any) =>
    request<any>('/variations', { method: 'POST', body: JSON.stringify(body) }),
  updateVariation: (id: string, body: any) =>
    request<any>(`/variations/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};
