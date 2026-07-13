const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(body?.detail ?? `Request failed with status ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export type AuthUser = {
  id: string
  name: string
  email: string
  phone?: string | null
  role: 'Admin' | 'Tutor' | 'Student' | 'Parent'
  profile_id: string | null
}

export type AuthResponse = {
  access_token: string
  token_type: string
  expires_at: string
  user: AuthUser
}

export function login(identifier: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  })
}

export type CreatedTutor = {
  id: string
  name: string
  email: string
  phone: string | null
  subjects: string[]
  status: 'Active' | 'Inactive'
  students: number
  temporary_password: string | null
}

export function createTutor(
  payload: { name: string; email: string; phone: string; subjects: string[] },
  token: string,
): Promise<CreatedTutor> {
  return request<CreatedTutor>('/api/admin/tutors', { method: 'POST', body: JSON.stringify(payload) }, token)
}

export type CreatedStudent = {
  id: string
  name: string
  email: string
  phone: string | null
  board: string
  grade: string
  tutor_id: string
  parent_ids: string[]
  progress: number
  total_fee: number
  fee_paid: number
  pending_fee: number
  fee_status: 'Pending' | 'Completed'
  status: 'Active' | 'Inactive'
  temporary_password: string | null
}

export function createStudent(
  payload: { name: string; email: string; phone: string; board: string; grade: string; tutor_id: string; total_fee: number; fee_paid: number },
  token: string,
): Promise<CreatedStudent> {
  return request<CreatedStudent>('/api/admin/students', { method: 'POST', body: JSON.stringify(payload) }, token)
}

export type CreatedParent = {
  id: string
  name: string
  email: string
  phone: string
  student_ids: string[]
  status: 'Active' | 'Inactive'
  temporary_password: string | null
}

export function createParent(
  payload: { name: string; email: string; phone: string; student_ids: string[] },
  token: string,
): Promise<CreatedParent> {
  return request<CreatedParent>('/api/admin/parents', { method: 'POST', body: JSON.stringify(payload) }, token)
}
