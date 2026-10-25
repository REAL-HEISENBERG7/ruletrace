/**
 * RuleTrace AI — Frontend API Client
 * Connects to the FastAPI backend at http://localhost:8000/api/v1
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem("ruletrace_token", token);
    else localStorage.removeItem("ruletrace_token");
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== "undefined") {
    authToken = localStorage.getItem("ruletrace_token");
  }
  return authToken;
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: res.statusText }));
      const errorMsg = errData.detail || `Request failed with status ${res.status}`;
      
      // Auto-clear invalid or expired token on 401
      if (res.status === 401) {
        setAuthToken(null);
      }
      
      const err = new Error(errorMsg);
      (err as any).status = res.status;
      throw err;
    }
    return await res.json();
  } catch (err: any) {
    // Avoid console.error for expected 401 Unauthorized / expired token responses
    // so Next.js dev overlay does not pop up an intrusive Console Error modal
    if (err?.status !== 401 && !err?.message?.includes("Invalid or expired")) {
      console.error(`API Error on ${endpoint}:`, err);
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const data = await fetchWithAuth("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.access_token);
    return data;
  },
  getMe: async () => {
    const token = getAuthToken();
    if (!token) return null;
    try {
      return await fetchWithAuth("/auth/me");
    } catch {
      setAuthToken(null);
      return null;
    }
  },

  // Dashboard
  getDashboardStats: async () => fetchWithAuth("/dashboard/stats"),

  // Applications
  getApplications: async (params?: { status?: string; category_id?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.category_id) query.set("category_id", params.category_id);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return fetchWithAuth(`/applications${qs}`);
  },
  getApplicationDetail: async (id: string) => fetchWithAuth(`/applications/${id}`),
  createApplication: async (payload: { institution_id: string; category_id: string; academic_year?: string }) =>
    fetchWithAuth("/applications", { method: "POST", body: JSON.stringify(payload) }),
  updateApplication: async (id: string, payload: any) =>
    fetchWithAuth(`/applications/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  submitApplication: async (id: string) =>
    fetchWithAuth(`/applications/${id}/submit`, { method: "POST" }),

  // Documents
  getDocuments: async (applicationId: string) =>
    fetchWithAuth(`/applications/${applicationId}/documents`),
  uploadDocument: async (applicationId: string, formData: FormData) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/applications/${applicationId}/documents`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  },
  deleteDocument: async (documentId: string) =>
    fetchWithAuth(`/documents/${documentId}`, { method: "DELETE" }),
  getDocumentFields: async (documentId: string) =>
    fetchWithAuth(`/documents/${documentId}/fields`),
  correctField: async (fieldId: string, payload: { corrected_value: string; correction_note?: string }) =>
    fetchWithAuth(`/documents/fields/${fieldId}`, { method: "PATCH", body: JSON.stringify(payload) }),

  // Validation
  triggerValidation: async (applicationId: string) =>
    fetchWithAuth(`/applications/${applicationId}/validate`, { method: "POST" }),
  getFindings: async (applicationId: string, params?: { severity?: string; finding_type?: string }) => {
    const query = new URLSearchParams();
    if (params?.severity) query.set("severity", params.severity);
    if (params?.finding_type) query.set("finding_type", params.finding_type);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return fetchWithAuth(`/applications/${applicationId}/findings${qs}`);
  },
  reviewFinding: async (
    findingId: string,
    payload: { action: string; notes?: string; corrected_field?: string; corrected_value?: string }
  ) => fetchWithAuth(`/findings/${findingId}/review`, { method: "POST", body: JSON.stringify(payload) }),

  // Rules & Handbook Traceability
  getRules: async (params?: { category_id?: string; check_type?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category_id) query.set("category_id", params.category_id);
    if (params?.check_type) query.set("check_type", params.check_type);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return fetchWithAuth(`/rules${qs}`);
  },
  getRuleSets: async () => fetchWithAuth("/rules/sets"),
  getRule: async (id: string) => fetchWithAuth(`/rules/${id}`),

  // Verification & Connectors
  getConnectors: async () => fetchWithAuth("/verification/connectors"),
  verifyDocument: async (payload: { document_id: string; method?: string; source_name?: string }) =>
    fetchWithAuth("/verification/verify", { method: "POST", body: JSON.stringify(payload) }),

  // Notifications
  getNotifications: async () => fetchWithAuth("/notifications"),
  getUnreadCount: async () => fetchWithAuth("/notifications/unread-count"),
  markNotificationRead: async (id: string) =>
    fetchWithAuth(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: async () => fetchWithAuth("/notifications/read-all", { method: "POST" }),

  // Reports
  generateReport: async (applicationId: string) =>
    fetchWithAuth(`/applications/${applicationId}/reports/generate`, { method: "POST" }),
  getReports: async (applicationId: string) =>
    fetchWithAuth(`/applications/${applicationId}/reports`),
  getReportDetail: async (reportId: string) =>
    fetchWithAuth(`/reports/${reportId}`),

  // Audit
  getAuditEvents: async (params?: { application_id?: string; event_type?: string }) => {
    const query = new URLSearchParams();
    if (params?.application_id) query.set("application_id", params.application_id);
    if (params?.event_type) query.set("event_type", params.event_type);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return fetchWithAuth(`/audit${qs}`);
  },

  // Metadata & Checklists
  getCategories: async () => fetchWithAuth("/categories"),
  getCategoryChecklist: async (categoryId: string) => fetchWithAuth(`/categories/${categoryId}/checklist`),
  getInstitutions: async () => fetchWithAuth("/institutions"),

  // User management (administrator only — backend enforces require_admin)
  getUsers: async () => fetchWithAuth("/users"),
  updateUser: async (userId: string, payload: { full_name?: string; role?: string; is_active?: boolean }) =>
    fetchWithAuth(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(payload) }),
};
