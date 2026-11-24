import { useEffect, useState } from 'react'
import { ServiceUnavailableError, type CalculatorApi, type Validation } from '../api/calculator'
import { UNDEFINED } from '../calculator/input'

export const VALIDATE_DEBOUNCE_MS = 250

export type ValidationState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'valid' }
  | { status: 'invalid'; errors: string[] }

type Outcome = { expression: string; validation: Validation }

export function useValidation(
  validate: CalculatorApi['validate'],
  expression: string,
  enabled: boolean,
  onUnavailable: () => void,
): ValidationState {
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const skip = !enabled || expression === '' || expression === UNDEFINED

  useEffect(() => {
    if (skip) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      validate(expression, controller.signal).then(
        (validation) => setOutcome({ expression, validation }),
        (error: unknown) => {
          if (error instanceof ServiceUnavailableError) onUnavailable()
        },
      )
    }, VALIDATE_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [validate, expression, skip, onUnavailable])

  if (skip) return { status: 'idle' }
  if (outcome?.expression !== expression) return { status: 'pending' }
  return outcome.validation.valid
    ? { status: 'valid' }
    : { status: 'invalid', errors: outcome.validation.errors }
}
