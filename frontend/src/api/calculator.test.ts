import { describe, expect, it, vi } from 'vitest'
import { createCalculatorApi, ServiceUnavailableError } from './calculator'

const respond = (body: unknown, status = 200) =>
  vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
    )

const hanging = () =>
  vi.fn<typeof fetch>(
    (_, init) =>
      new Promise((_, reject) =>
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
      ),
  )

describe('createCalculatorApi', () => {
  describe('validate', () => {
    it('posts the expression as JSON with an abort signal', async () => {
      const http = respond({ result: 'Ok' })

      await expect(createCalculatorApi(http).validate('4+5')).resolves.toEqual({ valid: true })
      expect(http).toHaveBeenCalledExactlyOnceWith('/api/v1/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"expression":"4+5"}',
        signal: expect.any(AbortSignal),
      })
    })

    it('returns the errors of a 400 response', async () => {
      const http = respond({ errors: ['a', 'b'] }, 400)

      await expect(createCalculatorApi(http).validate('3*')).resolves.toEqual({
        valid: false,
        errors: ['a', 'b'],
      })
    })

    it('rethrows the abort when the caller cancels', async () => {
      const controller = new AbortController()
      const pending = createCalculatorApi(hanging()).validate('1', controller.signal)

      controller.abort()

      await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    })

    it('rejects as unavailable when a 200 body is not Ok', async () => {
      await expect(createCalculatorApi(respond({ result: 'nope' })).validate('1')).rejects.toBeInstanceOf(
        ServiceUnavailableError,
      )
    })
  })

  describe('calculate', () => {
    it('posts to the calculate endpoint and returns result and exact', async () => {
      const http = respond({ result: '0.3', exact: '0.33' })

      await expect(createCalculatorApi(http).calculate('1/3')).resolves.toEqual({
        kind: 'value',
        result: '0.3',
        exact: '0.33',
      })
      expect(http).toHaveBeenCalledWith('/api/v1/calculate', expect.objectContaining({ body: '{"expression":"1/3"}' }))
    })

    it('returns undefined on division by zero', async () => {
      await expect(createCalculatorApi(respond({ result: 'undefined' })).calculate('1/0')).resolves.toEqual({
        kind: 'undefined',
      })
    })

    it('returns the errors of a 400 response', async () => {
      await expect(createCalculatorApi(respond({ errors: ['x'] }, 400)).calculate('2(')).resolves.toEqual({
        kind: 'invalid',
        errors: ['x'],
      })
    })

    it.each([[{ result: '1' }], [{ result: 1, exact: '1' }], [{ exact: '1' }]])(
      'rejects as unavailable on the unexpected body %j',
      async (body) => {
        await expect(createCalculatorApi(respond(body)).calculate('1')).rejects.toBeInstanceOf(
          ServiceUnavailableError,
        )
      },
    )
  })

  describe('failures', () => {
    it.each([502, 503, 504, 500, 404])('rejects as unavailable on status %i', async (status) => {
      await expect(createCalculatorApi(respond({ errors: ['x'] }, status)).validate('1')).rejects.toBeInstanceOf(
        ServiceUnavailableError,
      )
    })

    it('rejects as unavailable when the network fails', async () => {
      const http = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))

      await expect(createCalculatorApi(http).calculate('1')).rejects.toBeInstanceOf(ServiceUnavailableError)
    })

    it('rejects as unavailable once the timeout elapses, with or without a caller signal', async () => {
      const api = createCalculatorApi(hanging(), 10)

      await expect(api.calculate('1')).rejects.toMatchObject({
        name: 'ServiceUnavailableError',
        cause: expect.objectContaining({ name: 'TimeoutError' }),
      })
      await expect(api.validate('1', new AbortController().signal)).rejects.toBeInstanceOf(
        ServiceUnavailableError,
      )
    })

    it.each([['not json'], ['[]'], ['null'], ['"Ok"']])('rejects as unavailable on the body %s', async (raw) => {
      await expect(createCalculatorApi(respond(raw)).validate('1')).rejects.toBeInstanceOf(
        ServiceUnavailableError,
      )
    })

    it.each([[{}], [{ errors: 'x' }], [{ errors: [1] }]])(
      'rejects as unavailable on the malformed 400 body %j',
      async (body) => {
        await expect(createCalculatorApi(respond(body, 400)).validate('1')).rejects.toBeInstanceOf(
          ServiceUnavailableError,
        )
      },
    )
  })
})
