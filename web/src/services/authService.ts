import { tokenStorage } from './tokenStorage'

export interface Teacher {
  id: string
  email: string
  firstName?: string
  lastName?: string
  isActive: boolean
  profileCompleted: boolean
  assessmentCompleted: boolean
}

export interface Registration {
  firstName: string
  lastName: string
  email: string
  password: string
}

export class AuthApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '').replace(/\/api$/, '')
const apiUrl = `${apiBaseUrl}/api`

async function request(path: string, body?: object, token?: string): Promise<Record<string, unknown>> {
  if (!apiUrl) throw new AuthApiError(0, 'The authentication service is not configured. Please contact support.')
  let response: Response
  try {
    response = await fetch(`${apiUrl}/auth/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new AuthApiError(0, 'Unable to reach the server. Please check your connection and try again.')
  }
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const errorData = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null
    const serverMessage = typeof errorData?.message === 'string' && errorData.message.trim() ? errorData.message.trim() : null

    const message = serverMessage || (
      response.status === 401
        ? (path === 'login' ? 'Invalid email or password.' : 'Your session has ended. Please sign in again.')
        : response.status === 409
        ? 'This email is already registered. Please sign in.'
        : response.status === 400
        ? 'Please check the information you entered and try again.'
        : 'The service is temporarily unavailable. Please try again.'
    )
    if (response.status === 401 && token) tokenStorage.remove()
    throw new AuthApiError(response.status, message)
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new AuthApiError(500, 'The server returned an unexpected response. Please try again.')
  return data as Record<string, unknown>
}

function teacherFrom(data: Record<string, unknown>): Teacher {
  const value = data.teacher
  if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'string' || !('email' in value) || typeof value.email !== 'string') {
    throw new AuthApiError(500, 'Unable to load your account. Please try again.')
  }
  // Explicitly retain only safe account fields, never the raw response object.
  return {
    id: value.id, email: value.email,
    firstName: 'firstName' in value && typeof value.firstName === 'string' ? value.firstName : undefined,
    lastName: 'lastName' in value && typeof value.lastName === 'string' ? value.lastName : undefined,
    isActive: 'isActive' in value && value.isActive === true,
    profileCompleted: 'profileCompleted' in value && value.profileCompleted === true,
    assessmentCompleted: 'assessmentCompleted' in value && value.assessmentCompleted === true,
  }
}

export async function register(input: Registration): Promise<void> {
  await request('register', { ...input, email: input.email.trim().toLowerCase(), firstName: input.firstName.trim(), lastName: input.lastName.trim() })
}

export async function getCurrentTeacher(): Promise<Teacher> {
  const token = tokenStorage.read()
  if (!token) throw new AuthApiError(401, 'Please sign in.')
  return teacherFrom(await request('me', undefined, token))
}

export async function login(email: string, password: string): Promise<Teacher> {
  const data = await request('login', { email: email.trim().toLowerCase(), password })
  if (typeof data.token !== 'string' || !data.token) throw new AuthApiError(500, 'Unable to sign in. Please try again.')
  tokenStorage.write(data.token)
  try { return await getCurrentTeacher() }
  catch (error) { tokenStorage.remove(); throw error }
}

export function logout(): void { tokenStorage.remove() }
