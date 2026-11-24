export type Health = { status: string }

export type FetchHealth = () => Promise<Health>

export const HEALTH_PATH = '/api/v1/healthz'
export const HEALTH_TIMEOUT_MS = 5000

const isHealth = (value: unknown): value is Health =>
  typeof value === 'object' && value !== null && typeof (value as Health).status === 'string'

export const createFetchHealth =
  (http: typeof fetch = fetch, timeoutMs = HEALTH_TIMEOUT_MS): FetchHealth =>
  async () => {
    const response = await http(HEALTH_PATH, { signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) throw new Error(`Health check failed with ${response.status}`)
    const body: unknown = await response.json()
    if (!isHealth(body)) throw new Error('Unexpected health response')
    return body
  }

export const fetchHealth = createFetchHealth()
