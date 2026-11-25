import type { MouseEvent } from 'react'

type Key = { text: string; label: string; name: string; wide?: boolean }

const DIGITS: Key[] = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'].map((d) => ({
  text: d,
  label: d,
  name: d,
}))

const OPERATORS: Key[] = [
  { text: '+', label: '+', name: 'plus' },
  { text: '-', label: '−', name: 'minus' },
  { text: '*', label: '×', name: 'multiply' },
  { text: '/', label: '÷', name: 'divide' },
  { text: '(', label: '(', name: 'open parenthesis' },
  { text: ')', label: ')', name: 'close parenthesis' },
]

const ADVANCED: Key[] = [
  { text: '√', label: '√', name: 'square root' },
  { text: '^', label: '^', name: 'power' },
  { text: '%', label: '% of', name: 'percent of', wide: true },
]

const keepInputFocus = (e: MouseEvent) => e.preventDefault()

type KeypadProps = {
  disabled: boolean
  equalsDisabled: boolean
  onInsert: (text: string) => void
  onEquals: () => void
}

export function Keypad({ disabled, equalsDisabled, onInsert, onEquals }: KeypadProps) {
  const key = ({ text, label, name, wide }: Key, className: string) => (
    <button
      key={text}
      type="button"
      className={wide ? `${className} key--wide` : className}
      aria-label={name}
      disabled={disabled}
      onMouseDown={keepInputFocus}
      onClick={() => onInsert(text)}
    >
      {label}
    </button>
  )

  return (
    <div className="keypad">
      <div className="keypad__advanced" data-testid="advanced-column">
        {ADVANCED.map((a) => key(a, 'key key--operator'))}
      </div>
      <div className="keypad__digits">
        {DIGITS.map((d) => key(d, 'key key--digit'))}
        {key({ text: '.', label: '.', name: 'decimal point' }, 'key key--digit')}
        <button
          type="button"
          className="key key--equals"
          aria-label="equals"
          disabled={disabled || equalsDisabled}
          onMouseDown={keepInputFocus}
          onClick={onEquals}
        >
          =
        </button>
      </div>
      <div className="keypad__operators">{OPERATORS.map((o) => key(o, 'key key--operator'))}</div>
    </div>
  )
}
