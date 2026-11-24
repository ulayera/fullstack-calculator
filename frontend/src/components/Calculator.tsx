import {
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react'
import type { CalculatorApi } from '../api/calculator'
import { continuesStored, expressionToSend, type StoredResult } from '../calculator/chain'
import { change, insert, UNDEFINED, type Edit } from '../calculator/input'
import { useValidation } from '../hooks/useValidation'
import { ErrorFooter } from './ErrorFooter'
import { Keypad } from './Keypad'

export const UNAVAILABLE_MESSAGE = 'Service unavailable momentarily'

type CalculatorProps = {
  api: CalculatorApi
  available: boolean
  onUnavailable: () => void
}

const block = (e: SyntheticEvent) => e.preventDefault()

export function Calculator({ api, available, onUnavailable }: CalculatorProps) {
  const [value, setValue] = useState('')
  const [stored, setStored] = useState<StoredResult | null>(null)
  const [calculationErrors, setCalculationErrors] = useState<string[]>([])
  const [calculating, setCalculating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const caretRef = useRef(0)
  const validation = useValidation(api.validate, value, available, onUnavailable)

  useLayoutEffect(() => {
    inputRef.current?.setSelectionRange(caretRef.current, caretRef.current)
  }, [value])

  const commit = (edit: Edit, keep: StoredResult | null = stored) => {
    caretRef.current = edit.caret
    setValue(edit.value)
    setStored(continuesStored(edit.value, keep) ? keep : null)
    setCalculationErrors([])
  }

  const insertAtCaret = (text: string) => {
    const input = inputRef.current!
    const edit = insert(value, Number(input.selectionStart), Number(input.selectionEnd), text)
    if (edit) commit(edit)
  }

  const canSubmit = available && validation.status === 'valid' && !calculating

  const submit = async () => {
    if (!canSubmit) return
    setCalculating(true)
    try {
      const outcome = await api.calculate(expressionToSend(value, stored))
      if (outcome.kind === 'invalid') {
        setCalculationErrors(outcome.errors)
      } else if (outcome.kind === 'undefined') {
        commit({ value: UNDEFINED, caret: UNDEFINED.length }, null)
      } else {
        const { result, exact } = outcome
        commit({ value: result, caret: result.length }, { display: result, exact })
      }
    } catch {
      onUnavailable()
    } finally {
      setCalculating(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void submit()
      return
    }
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
    e.preventDefault()
    insertAtCaret(e.key)
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const edit = change(value, e.target.value)
    if (edit) commit(edit)
  }

  const clear = () => commit({ value: '', caret: 0 }, null)

  const errors = !available
    ? [UNAVAILABLE_MESSAGE]
    : calculationErrors.length > 0
      ? calculationErrors
      : validation.status === 'invalid'
        ? validation.errors
        : []

  return (
    <section className="calculator" aria-label="calculator">
      <div className="calculator__display">
        <input
          ref={inputRef}
          className="calculator__input"
          aria-label="expression"
          value={value}
          disabled={!available}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onKeyDown={onKeyDown}
          onChange={onChange}
          onPaste={block}
          onDrop={block}
        />
        <button
          type="button"
          className="calculator__clear"
          aria-label="clear"
          disabled={!available}
          onMouseDown={block}
          onClick={clear}
        >
          C
        </button>
      </div>
      <Keypad
        disabled={!available}
        equalsDisabled={!canSubmit}
        onInsert={insertAtCaret}
        onEquals={() => void submit()}
      />
      <ErrorFooter errors={errors} />
    </section>
  )
}
