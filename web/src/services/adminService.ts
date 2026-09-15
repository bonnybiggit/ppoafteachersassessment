export type AdminIdentity = { id: string; email: string; role: 'admin' }
export type AdminOverview = { totalTeachers: number; totalAttempts: number; completedAttempts: number; inProgressAttempts: number; completionRate: number | null; syntheticBankItems: number; activeLearningOpportunities: number | null }
export const ADMIN_TOKEN_KEY = 'ppoaf.admin.token'
export const ADMIN_SESSION_EVENT = 'ppoaf:admin-session-ended'
export const adminTokenStorage = {
  read: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  write: (token: string) => localStorage.setItem(ADMIN_TOKEN_KEY, token),
  remove: () => localStorage.removeItem(ADMIN_TOKEN_KEY),
}
export function adminTokenValid(): boolean {
  try {
    const part = adminTokenStorage.read()?.split('.')[1]
    if (!part) return false
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()
  } catch { return false }
}
export class AdminApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}
const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '').replace(/\/api$/, '')
async function request(path: string, method = 'GET', body?: unknown, authenticated = true) {
  const token = authenticated ? adminTokenStorage.read() : null
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(`${base}/api/admin${path}`, { method, signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    if (!response.ok) {
      if (authenticated && [401, 403].includes(response.status) && adminTokenStorage.read() === token) {
        adminTokenStorage.remove(); window.dispatchEvent(new Event(ADMIN_SESSION_EVENT))
      }
      const message = response.status === 401 ? (authenticated ? 'Your administrator session has expired. Sign in again.' : 'Invalid administrator credentials.')
        : response.status === 403 ? 'This account is not authorized for administration.'
        : response.status === 429 ? 'Too many sign-in attempts. Please try again later.'
        : response.status === 404 ? 'Teacher not found.'
        : response.status === 400 ? (path.startsWith('/teachers') ? 'Check your teacher search parameters.' : 'Check your email and password.') : 'Administration is temporarily unavailable. Please try again.'
      throw new AdminApiError(response.status, message)
    }
    return response.status === 204 ? undefined : await response.json()
  } catch (error) {
    if (error instanceof AdminApiError) throw error
    throw new AdminApiError(0, 'Unable to reach administration. Please try again.')
  } finally { clearTimeout(timeout) }
}
export async function getCurrentAdmin(): Promise<AdminIdentity> {
  const result = await request('/me')
  if (result?.admin?.role !== 'admin' || typeof result.admin.id !== 'string' || typeof result.admin.email !== 'string') {
    adminTokenStorage.remove(); window.dispatchEvent(new Event(ADMIN_SESSION_EVENT))
    throw new AdminApiError(401, 'Administrator sign-in is required.')
  }
  return { id: result.admin.id, email: result.admin.email, role: 'admin' }
}
export async function signInAdmin(email: string, password: string): Promise<string> {
  const result = await request('/login', 'POST', { email, password }, false)
  if (typeof result?.token !== 'string') throw new AdminApiError(503, 'Administrator sign-in is unavailable.')
  return result.token
}
export async function signOutAdmin(): Promise<void> {
  try { await request('/logout', 'POST') } catch (error) {
    if (!(error instanceof AdminApiError) || ![401, 403].includes(error.status)) throw error
  }
}
export async function getAdminOverview(): Promise<AdminOverview> { return request('/overview') }

export type AdminTeacher = {
  id: string; email: string; firstName: string | null; lastName: string | null; isActive: boolean; profileCompleted: boolean;
  currentRole: string | null; subject: string | null; gradeOrClass: string | null; schoolType: string | null; schoolLocation: string | null;
  yearsOfTeachingExperience: number | null; highestEducation: string | null; classSize: number | null; createdAt: string | null; updatedAt: string | null;
  assessmentStatus: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  assessment: { id: string; status: string; startedAt: string | null; completedAt: string | null; assignedItemCount: number; responseCount: number } | null;
}
export type AdminTeacherList = { teachers: AdminTeacher[]; page: number; pageSize: number; total: number; totalPages: number }
export async function getAdminTeachers(query: { page: number; search: string; status: string }): Promise<AdminTeacherList> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: '20', search: query.search, status: query.status })
  return request(`/teachers?${params}`)
}
export async function getAdminTeacher(id: string): Promise<AdminTeacher> {
  const data = await request(`/teachers/${encodeURIComponent(id)}`)
  return data.teacher
}
