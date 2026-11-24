import { render, screen } from '@testing-library/react'
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

  it('ignores a health result that arrives after unmount', async () => {
    let resolve: (value: { status: string }) => void = () => {}
    const fetchHealth = vi.fn<FetchHealth>().mockReturnValue(new Promise((r) => (resolve = r)))
    const errors = vi.spyOn(console, 'error')

    const { unmount } = render(<App fetchHealth={fetchHealth} />)
    unmount()
    resolve({ status: 'ok' })
    await Promise.resolve()

    expect(errors).not.toHaveBeenCalled()
  })
})
