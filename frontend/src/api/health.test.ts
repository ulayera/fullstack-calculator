import { describe, expect, it, vi } from 'vitest'
import { createFetchHealth } from './health'

const respond = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }))

describe('createFetchHealth', () => {
  it('requests the health endpoint with an abort signal and returns its body', async () => {
    const http = respond({ status: 'ok' })

    await expect(createFetchHealth(http)()).resolves.toEqual({ status: 'ok' })
    expect(http).toHaveBeenCalledExactlyOnceWith('/api/v1/healthz', {
      signal: expect.any(AbortSignal),
    })
  })

  it('rejects when the endpoint responds with a non-2xx status', async () => {
    const http = respond({ error: 'down' }, 503)

    await expect(createFetchHealth(http)()).rejects.toThrow('Health check failed with 503')
  })

  it('rejects when the request itself fails', async () => {
    const http = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(createFetchHealth(http)()).rejects.toThrow('Failed to fetch')
  })

  it('aborts the request once the timeout elapses', async () => {
    const http = vi.fn<typeof fetch>(
      (_, init) =>
        new Promise((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
        ),
    )

    await expect(createFetchHealth(http, 10)()).rejects.toMatchObject({ name: 'TimeoutError' })
  })

  it.each([[{ healthy: true }], [{ status: 200 }], [null], ['ok']])(
    'rejects an unexpected body %j',
    async (body) => {
      await expect(createFetchHealth(respond(body))()).rejects.toThrow(
        'Unexpected health response',
      )
    },
  )
})
