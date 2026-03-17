/**
 * D2Com Survey — API Service Layer
 * Centralized API calls with typed responses.
 */

const API_BASE = '/api/v1';

// ── Types ──

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

export interface SurveyForm {
  id: number;
  name: string;
  type: string;
  version: string;
  is_active: boolean;
  question_count: number;
}

export interface Question {
  id: number;
  q_id: string;
  question_text: string;
  question_type: 'short_answer' | 'multiple_choice' | 'checkboxes' | 'linear_scale';
  options: string[] | null;
  display_order: number;
  is_required: boolean;
}

export interface SurveyItem {
  id: number;
  customer_id: number;
  customer_resp_id: string;
  customer_name: string | null;
  customer_type: string;
  form_name: string;
  form_version: string;
  status: 'draft' | 'partial' | 'complete' | 'synced';
  pain_cluster: string | null;
  answered_count: number;
  total_questions: number;
  created_at: string;
  updated_at: string;
}

export interface ResponseItem {
  id: number;
  question_id: number;
  q_id: string;
  section: string | null;
  question_text: string;
  question_type: string;
  options: string[] | null;
  answer: string | null;
  is_required: boolean;
}

export interface DashboardStats {
  total_surveys: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  total_customers: number;
  pain_distribution: Record<string, number>;
}

// ── Helpers ──

function getToken(): string | null {
  return localStorage.getItem('d2com_token');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('d2com_token');
    localStorage.removeItem('d2com_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Lỗi hệ thống' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth API ──

export const authApi = {
  loginGoogle: (token: string) =>
    apiFetch<{ access_token: string; user: User }>('/auth/login/google', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  getMe: () => apiFetch<User>('/auth/me'),
};

// ── Users API ──

export const usersApi = {
  list: () => apiFetch<User[]>('/users/'),

  create: (data: { email: string; name: string; role: string }) =>
    apiFetch<User>('/users/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<{ name: string; role: string; is_active: boolean }>) =>
    apiFetch<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ── Forms API ──

export const formsApi = {
  list: () => apiFetch<SurveyForm[]>('/forms/'),

  getQuestions: (formId: number) =>
    apiFetch<Question[]>(`/forms/${formId}/questions`),
};

// ── Surveys API ──

export const surveysApi = {
  list: (params?: { status?: string; customer_type?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.customer_type) qs.set('customer_type', params.customer_type);
    if (params?.search) qs.set('search', params.search);
    const query = qs.toString();
    return apiFetch<SurveyItem[]>(`/surveys/${query ? '?' + query : ''}`);
  },

  create: (data: { customer_type: string; customer_name?: string; form_id?: number }) =>
    apiFetch<SurveyItem>('/surveys/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (id: number) => apiFetch<SurveyItem>(`/surveys/${id}`),

  getResponses: (id: number) =>
    apiFetch<ResponseItem[]>(`/surveys/${id}/responses`),

  saveResponses: (id: number, responses: { question_id: number; answer: string }[]) =>
    apiFetch<{ message: string; answered_count: number }>(`/surveys/${id}/responses`, {
      method: 'POST',
      body: JSON.stringify({ responses }),
    }),

  submit: (id: number, painCluster?: string) =>
    apiFetch<{ message: string; status: string }>(`/surveys/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ pain_cluster: painCluster }),
    }),
};

// ── Dashboard API ──

export const dashboardApi = {
  getStats: () => apiFetch<DashboardStats>('/dashboard/stats'),
};
