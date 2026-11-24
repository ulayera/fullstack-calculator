export const VALIDATE_PATH = '/api/v1/validate'
export const CALCULATE_PATH = '/api/v1/calculate'
export const API_TIMEOUT_MS = 5000

export class ServiceUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Service unavailable', { cause })
    this.name = 'ServiceUnavailableError'
  }
}

export type Validation = { valid: true } | { valid: false; errors: string[] }

export type Calculation =
  | { kind: 'value'; result: string; exact: string }
  | { kind: 'undefined' }
  | { kind: 'invalid'; errors: string[] }

export type CalculatorApi = {
  validate: (expression: string, signal?: AbortSignal) => Promise<Validation>
  calculate: (expression: string) => Promise<Calculation>
}

type Reply = { ok: boolean; body: Record<string, unknown> }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const errorsOf = (body: Record<string, unknown>): string[] => {
  const { errors } = body
  if (!Array.isArray(errors) || !errors.every((e) => typeof e === 'string')) {
    throw new ServiceUnavailableError('Unexpected error response')
  }
  return errors
}

export const createCalculatorApi = (
  http: typeof fetch = fetch,
  timeoutMs = API_TIMEOUT_MS,
): CalculatorApi => {
  const post = async (path: string, expression: string, signal?: AbortSignal): Promise<Reply> => {
    const timeout = AbortSignal.timeout(timeoutMs)
    let response: Response
    try {
      response = await http(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression }),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new ServiceUnavailableError(error)
    }
    if (response.status !== 400 && !response.ok) {
      throw new ServiceUnavailableError(`Unexpected status ${response.status}`)
    }
    const body: unknown = await response.json().catch(() => null)
    if (!isRecord(body)) throw new ServiceUnavailableError('Unexpected response body')
    return { ok: response.ok, body }
  }

  return {
    validate: async (expression, signal) => {
      const { ok, body } = await post(VALIDATE_PATH, expression, signal)
      if (!ok) return { valid: false, errors: errorsOf(body) }
      if (body.result !== 'Ok') throw new ServiceUnavailableError('Unexpected validation response')
      return { valid: true }
    },
    calculate: async (expression) => {
      const { ok, body } = await post(CALCULATE_PATH, expression)
      if (!ok) return { kind: 'invalid', errors: errorsOf(body) }
      if (body.result === 'undefined') return { kind: 'undefined' }
      if (typeof body.result !== 'string' || typeof body.exact !== 'string') {
        throw new ServiceUnavailableError('Unexpected calculation response')
      }
      return { kind: 'value', result: body.result, exact: body.exact }
    },
  }
}

export const calculatorApi = createCalculatorApi()
