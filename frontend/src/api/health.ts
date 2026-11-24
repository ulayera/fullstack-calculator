export type Health = { status: string }

export type FetchHealth = () => Promise<Health>

export const HEALTH_PATH = '/api/v1/healthz'

export const createFetchHealth =
  (http: typeof fetch = fetch): FetchHealth =>
  async () => {
    const response = await http(HEALTH_PATH)
    if (!response.ok) throw new Error(`Health check failed with ${response.status}`)
    return (await response.json()) as Health
  }

export const fetchHealth = createFetchHealth()
