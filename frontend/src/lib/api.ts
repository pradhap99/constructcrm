import axios from 'axios'
import type {
  Project, Lead, Vendor, Indent, RFQ, PurchaseOrder, GRN,
  Invoice, DPR, BOQItem, Submittal, ChangeOrder, Bill,
  DashboardStats, SpendAnalytics, AIParserResult, PaginatedResponse,
} from './types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
    return Promise.reject(err)
  }
)

// Auth
export const auth = {
  login: (email: string, password: string) =>
    apiClient.post<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
      '/auth/login', { email, password }
    ),
  logout: () => apiClient.post('/auth/logout'),
}

// Projects
export const projects = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<Project>>('/projects', { params }),
  get: (id: string) => apiClient.get<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) => apiClient.post<Project>('/projects', data),
  update: (id: string, data: Partial<Project>) => apiClient.put<Project>(`/projects/${id}`, data),
  delete: (id: string) => apiClient.delete(`/projects/${id}`),
}

// Leads
export const leads = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<Lead>>('/leads', { params }),
  get: (id: string) => apiClient.get<Lead>(`/leads/${id}`),
  create: (data: Partial<Lead>) => apiClient.post<Lead>('/leads', data),
  update: (id: string, data: Partial<Lead>) => apiClient.put<Lead>(`/leads/${id}`, data),
  delete: (id: string) => apiClient.delete(`/leads/${id}`),
}

// Vendors
export const vendors = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<Vendor>>('/vendors', { params }),
  get: (id: string) => apiClient.get<Vendor>(`/vendors/${id}`),
  create: (data: Partial<Vendor>) => apiClient.post<Vendor>('/vendors', data),
  update: (id: string, data: Partial<Vendor>) => apiClient.put<Vendor>(`/vendors/${id}`, data),
  delete: (id: string) => apiClient.delete(`/vendors/${id}`),
}

// Indents
export const indents = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<Indent>>('/indents', { params }),
  get: (id: string) => apiClient.get<Indent>(`/indents/${id}`),
  create: (data: Partial<Indent>) => apiClient.post<Indent>('/indents', data),
  approve: (id: string, remarks?: string) =>
    apiClient.post<Indent>(`/indents/${id}/approve`, { remarks }),
  reject: (id: string, remarks: string) =>
    apiClient.post<Indent>(`/indents/${id}/reject`, { remarks }),
}

// RFQ
export const rfq = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<RFQ>>('/rfq', { params }),
  get: (id: string) => apiClient.get<RFQ>(`/rfq/${id}`),
  create: (data: Partial<RFQ>) => apiClient.post<RFQ>('/rfq', data),
  sendToVendors: (id: string, vendorIds: string[]) =>
    apiClient.post(`/rfq/${id}/send`, { vendorIds }),
}

// Purchase Orders
export const purchaseOrders = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<PurchaseOrder>>('/purchase-orders', { params }),
  get: (id: string) => apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`),
  create: (data: Partial<PurchaseOrder>) =>
    apiClient.post<PurchaseOrder>('/purchase-orders', data),
  approve: (id: string) => apiClient.post<PurchaseOrder>(`/purchase-orders/${id}/approve`),
}

// GRN
export const grn = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<GRN>>('/grn', { params }),
  get: (id: string) => apiClient.get<GRN>(`/grn/${id}`),
  create: (data: Partial<GRN>) => apiClient.post<GRN>('/grn', data),
  confirm: (id: string) => apiClient.post<GRN>(`/grn/${id}/confirm`),
  threeWayMatch: (id: string) =>
    apiClient.get<{ status: string; discrepancies: string[] }>(`/grn/${id}/three-way-match`),
}

// Invoices
export const invoices = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<Invoice>>('/invoices', { params }),
  get: (id: string) => apiClient.get<Invoice>(`/invoices/${id}`),
  create: (data: Partial<Invoice>) => apiClient.post<Invoice>('/invoices', data),
  approve: (id: string) => apiClient.post<Invoice>(`/invoices/${id}/approve`),
}

// DPR
export const dpr = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<DPR>>('/dpr', { params }),
  get: (id: string) => apiClient.get<DPR>(`/dpr/${id}`),
  create: (data: Partial<DPR>) => apiClient.post<DPR>('/dpr', data),
}

// BOQ
export const boq = {
  list: (projectId: string) =>
    apiClient.get<BOQItem[]>(`/boq`, { params: { projectId } }),
  create: (data: Partial<BOQItem>) => apiClient.post<BOQItem>('/boq', data),
}

// Submittals
export const submittals = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<Submittal>>('/submittals', { params }),
  create: (data: Partial<Submittal>) => apiClient.post<Submittal>('/submittals', data),
}

// Change Orders
export const changeOrders = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<ChangeOrder>>('/change-orders', { params }),
  create: (data: Partial<ChangeOrder>) => apiClient.post<ChangeOrder>('/change-orders', data),
}

// Billing
export const billing = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<Bill>>('/billing', { params }),
  create: (data: Partial<Bill>) => apiClient.post<Bill>('/billing', data),
}

// Analytics
export const analytics = {
  dashboardStats: () => apiClient.get<DashboardStats>('/analytics/dashboard-stats'),
  spendByCategory: (params?: Record<string, string>) =>
    apiClient.get<SpendAnalytics['byCategory']>('/analytics/spend-by-category', { params }),
  spendByVendor: (params?: Record<string, string>) =>
    apiClient.get<SpendAnalytics['byVendor']>('/analytics/spend-by-vendor', { params }),
  budgetVsActual: (params?: Record<string, string>) =>
    apiClient.get<SpendAnalytics['budgetVsActual']>('/analytics/budget-vs-actual', { params }),
  fullReport: () => apiClient.get<SpendAnalytics>('/analytics/spend'),
}

// AI Parser
export const aiParser = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<AIParserResult>('/ai-parser/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  extractText: (sessionId: string) =>
    apiClient.get<AIParserResult>(`/ai-parser/result/${sessionId}`),
}
