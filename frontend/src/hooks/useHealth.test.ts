import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FetchHealth } from '../api/health'
import { useHealth } from './useHealth'

describe('useHealth', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts unavailable and becomes available once health resolves', async () => {
    const fetchHealth = vi.fn<FetchHealth>().mockResolvedValue({ status: 'ok' })

    const { result } = renderHook(() => useHealth(fetchHealth, 1000))

    expect(result.current.available).toBe(false)
    await act(async () => {})
    expect(result.current.available).toBe(true)
  })

  it('polls on the interval and follows the latest result', async () => {
    const fetchHealth = vi
      .fn<FetchHealth>()
      .mockResolvedValueOnce({ status: 'ok' })
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce({ status: 'ok' })
    const { result } = renderHook(() => useHealth(fetchHealth, 1000))
    await act(async () => {})

    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.available).toBe(false)

    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.available).toBe(true)
    expect(fetchHealth).toHaveBeenCalledTimes(3)
  })

  it('can be marked unavailable until the next successful check', async () => {
    const fetchHealth = vi.fn<FetchHealth>().mockResolvedValue({ status: 'ok' })
    const { result } = renderHook(() => useHealth(fetchHealth, 1000))
    await act(async () => {})

    act(() => result.current.markUnavailable())
    expect(result.current.available).toBe(false)

    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.available).toBe(true)
  })

  it('stops polling and ignores late results after unmount', async () => {
    let resolve: (value: { status: string }) => void = () => {}
    const fetchHealth = vi.fn<FetchHealth>(() => new Promise((r) => (resolve = r)))
    const { unmount } = renderHook(() => useHealth(fetchHealth, 1000))

    unmount()
    await act(async () => resolve({ status: 'ok' }))
    await act(() => vi.advanceTimersByTimeAsync(5000))

    expect(fetchHealth).toHaveBeenCalledOnce()
  })
})
