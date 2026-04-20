// ============================================================
// Service API — appels fetch centralisés
// ============================================================

function getToken(): string | null {
  try { return JSON.parse(sessionStorage.getItem('auth') || '{}').token; } catch { return null; }
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  // Fichiers binaires
  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('spreadsheet') || contentType.includes('csv')) {
    if (!res.ok) throw new Error('Erreur lors du téléchargement');
    return res.blob();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Erreur ${res.status}`);
  return data;
}

// ── AUTH ──
export const authAPI = {
  login: (email: string, motDePasse: string) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, motDePasse }) }),
  changePassword: (ancienMotDePasse: string, nouveauMotDePasse: string) =>
    apiFetch('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ ancienMotDePasse, nouveauMotDePasse }) }),
};

// ── EMPLOYÉS ──
export const employeesAPI = {
  list: () => apiFetch('/api/employees'),
  get: (id: number) => apiFetch(`/api/employees/${id}`),
  create: (data: any) => apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => apiFetch(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ── SITES ──
export const sitesAPI = {
  list: () => apiFetch('/api/sites'),
  create: (data: any) => apiFetch('/api/sites', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch(`/api/sites/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ── PÉRIODES ──
export const periodesAPI = {
  list: (params?: { siteId?: string; statut?: string }) => {
    const qs = new URLSearchParams(params as any).toString();
    return apiFetch(`/api/periods${qs ? '?' + qs : ''}`);
  },
  create: (data: any) => apiFetch('/api/periods', { method: 'POST', body: JSON.stringify(data) }),
  close: (id: number) => apiFetch(`/api/periods/${id}/close`, { method: 'PATCH' }),
};

// ── ENTRÉES DE TEMPS ──
export const timesheetsAPI = {
  list: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params as any).toString();
    return apiFetch(`/api/timesheets${qs ? '?' + qs : ''}`);
  },
  create: (data: any) => apiFetch('/api/timesheets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => apiFetch(`/api/timesheets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  submit: (id: number) => apiFetch(`/api/timesheets/${id}/submit`, { method: 'PATCH' }),
  approve: (id: number, action: 'approuve' | 'refuse', commentaire?: string) =>
    apiFetch(`/api/timesheets/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ action, commentaire }) }),
};

// ── RAPPORTS ──
export const reportsAPI = {
  export: async (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    const blob = await apiFetch(`/api/reports?${qs}`);
    const ext = params.format === 'csv' ? 'csv' : 'xlsx';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_periode.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
