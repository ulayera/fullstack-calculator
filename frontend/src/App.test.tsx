import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import type { FetchHealth } from './api/health'

describe('App', () => {
  it('greets and shows the backend status once health resolves', async () => {
    const fetchHealth = vi.fn<FetchHealth>().mockResolvedValue({ status: 'ok' })

    render(<App fetchHealth={fetchHealth} />)

    expect(screen.getByRole('heading', { name: 'hello world!' })).toBeInTheDocument()
    expect(await screen.findByText('status: ok')).toBeInTheDocument()
    expect(fetchHealth).toHaveBeenCalledOnce()
  })

  it('shows a checking state while health is pending', () => {
    const fetchHealth = vi.fn<FetchHealth>().mockReturnValue(new Promise(() => {}))

    render(<App fetchHealth={fetchHealth} />)

    expect(screen.getByRole('status')).toHaveTextContent('status: checking...')
  })

  it('shows unavailable when health fails', async () => {
    const fetchHealth = vi.fn<FetchHealth>().mockRejectedValue(new Error('boom'))

    render(<App fetchHealth={fetchHealth} />)

    expect(await screen.findByText('status: unavailable')).toBeInTheDocument()
  })

  it('ignores a stale health result when the health source changes', async () => {
    let resolveStale: (value: { status: string }) => void = () => {}
    const stale = vi.fn<FetchHealth>().mockReturnValue(new Promise((r) => (resolveStale = r)))
    const fresh = vi.fn<FetchHealth>().mockResolvedValue({ status: 'fresh' })

    const { rerender } = render(<App fetchHealth={stale} />)
    rerender(<App fetchHealth={fresh} />)
    await screen.findByText('status: fresh')
    await act(async () => resolveStale({ status: 'stale' }))

    expect(screen.getByRole('status')).toHaveTextContent('status: fresh')
  })
})
