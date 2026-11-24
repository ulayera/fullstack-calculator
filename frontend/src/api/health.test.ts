import { describe, expect, it, vi } from 'vitest'
import { HEALTH_PATH, createFetchHealth } from './health'

const respond = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }))

describe('createFetchHealth', () => {
  it('requests the health endpoint and returns its body', async () => {
    const http = respond({ status: 'ok' })

    await expect(createFetchHealth(http)()).resolves.toEqual({ status: 'ok' })
    expect(http).toHaveBeenCalledExactlyOnceWith(HEALTH_PATH)
  })

  it('rejects when the endpoint responds with a non-2xx status', async () => {
    const http = respond({ error: 'down' }, 503)

    await expect(createFetchHealth(http)()).rejects.toThrow('Health check failed with 503')
  })

  it('rejects when the request itself fails', async () => {
    const http = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(createFetchHealth(http)()).rejects.toThrow('Failed to fetch')
  })
})
