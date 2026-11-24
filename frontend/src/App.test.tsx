import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { ServiceUnavailableError, type CalculatorApi } from './api/calculator'
import type { FetchHealth } from './api/health'

const api = (overrides: Partial<CalculatorApi> = {}): CalculatorApi => ({
  validate: vi.fn<CalculatorApi['validate']>().mockResolvedValue({ valid: true }),
  calculate: vi.fn<CalculatorApi['calculate']>(),
  ...overrides,
})

const input = () => screen.getByRole('textbox', { name: 'expression' })

describe('App', () => {
  it('renders the calculator disabled until health resolves', async () => {
    const fetchHealth = vi.fn<FetchHealth>().mockResolvedValue({ status: 'ok' })

    render(<App api={api()} fetchHealth={fetchHealth} />)

    expect(screen.getByRole('heading', { name: 'Calculator' })).toBeInTheDocument()
    expect(input()).toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await waitFor(() => expect(input()).toBeEnabled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the calculator disabled with a message when health fails', async () => {
    const fetchHealth = vi.fn<FetchHealth>().mockRejectedValue(new Error('down'))

    render(<App api={api()} fetchHealth={fetchHealth} />)

    await waitFor(() => expect(fetchHealth).toHaveBeenCalled())
    expect(input()).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Service unavailable momentarily')
  })

  it('disables the calculator when an endpoint reports the service unavailable', async () => {
    const fetchHealth = vi.fn<FetchHealth>().mockResolvedValue({ status: 'ok' })
    const validate = vi.fn<CalculatorApi['validate']>().mockRejectedValue(new ServiceUnavailableError())
    render(<App api={api({ validate })} fetchHealth={fetchHealth} />)
    await waitFor(() => expect(input()).toBeEnabled())

    await userEvent.type(input(), '1')

    await waitFor(() => expect(input()).toBeDisabled())
    expect(screen.getByRole('alert')).toHaveTextContent('Service unavailable momentarily')
  })
})
