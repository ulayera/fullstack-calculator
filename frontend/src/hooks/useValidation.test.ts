import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceUnavailableError, type CalculatorApi } from '../api/calculator'
import { useValidation, VALIDATE_DEBOUNCE_MS } from './useValidation'

type Validate = CalculatorApi['validate']

const setup = (validate: Validate, expression: string, enabled = true) => {
  const onUnavailable = vi.fn()
  const hook = renderHook(
    ({ expression, enabled }) => useValidation(validate, expression, enabled, onUnavailable),
    { initialProps: { expression, enabled } },
  )
  return { ...hook, onUnavailable }
}

const settle = () => act(() => vi.advanceTimersByTimeAsync(VALIDATE_DEBOUNCE_MS))

describe('useValidation', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it.each([
    ['', true],
    ['undefined', true],
    ['1+2', false],
  ])('stays idle without calling the backend for %j (enabled %s)', async (expression, enabled) => {
    const validate = vi.fn<Validate>()

    const { result } = setup(validate, expression, enabled)
    await settle()

    expect(result.current).toEqual({ status: 'idle' })
    expect(validate).not.toHaveBeenCalled()
  })

  it('is pending during the debounce and valid once the backend says Ok', async () => {
    const validate = vi.fn<Validate>().mockResolvedValue({ valid: true })

    const { result } = setup(validate, '4+5')
    expect(result.current).toEqual({ status: 'pending' })

    await act(() => vi.advanceTimersByTimeAsync(VALIDATE_DEBOUNCE_MS - 1))
    expect(validate).not.toHaveBeenCalled()

    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(validate).toHaveBeenCalledExactlyOnceWith('4+5', expect.any(AbortSignal))
    expect(result.current).toEqual({ status: 'valid' })
  })

  it('reports backend errors', async () => {
    const validate = vi.fn<Validate>().mockResolvedValue({ valid: false, errors: ['incomplete'] })

    const { result } = setup(validate, '3*')
    await settle()

    expect(result.current).toEqual({ status: 'invalid', errors: ['incomplete'] })
  })

  it('debounces rapid changes into a single request and aborts the superseded one', async () => {
    const signals: AbortSignal[] = []
    const validate = vi.fn<Validate>((_, signal) => {
      signals.push(signal!)
      return new Promise(() => {})
    })
    const { rerender } = setup(validate, '1')

    rerender({ expression: '1+', enabled: true })
    rerender({ expression: '1+2', enabled: true })
    await settle()
    rerender({ expression: '1+23', enabled: true })

    expect(validate).toHaveBeenCalledExactlyOnceWith('1+2', expect.any(AbortSignal))
    expect(signals[0].aborted).toBe(true)
  })

  it('goes back to pending when the expression changes after a result', async () => {
    const validate = vi.fn<Validate>().mockResolvedValue({ valid: true })
    const { result, rerender } = setup(validate, '1')
    await settle()

    rerender({ expression: '1*', enabled: true })

    expect(result.current).toEqual({ status: 'pending' })
  })

  it('reports unavailability and ignores other failures', async () => {
    const validate = vi
      .fn<Validate>()
      .mockRejectedValueOnce(new ServiceUnavailableError())
      .mockRejectedValueOnce(new DOMException('aborted', 'AbortError'))
    const { result, rerender, onUnavailable } = setup(validate, '1')
    await settle()
    expect(onUnavailable).toHaveBeenCalledOnce()

    rerender({ expression: '2', enabled: true })
    await settle()

    expect(onUnavailable).toHaveBeenCalledOnce()
    expect(result.current).toEqual({ status: 'pending' })
  })

  it('revalidates when the service becomes available again', async () => {
    const validate = vi.fn<Validate>().mockResolvedValue({ valid: true })
    const { result, rerender } = setup(validate, '1', false)

    rerender({ expression: '1', enabled: true })
    await settle()

    expect(validate).toHaveBeenCalledOnce()
    expect(result.current).toEqual({ status: 'valid' })
  })
})
