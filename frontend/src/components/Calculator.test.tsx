import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Calculation, CalculatorApi, Validation } from '../api/calculator'
import type { HealthState } from '../hooks/useHealth'
import { Calculator, UNAVAILABLE_MESSAGE } from './Calculator'

const third = { kind: 'value', result: '0.3333333333333333', exact: '0.3333333333333333333333333333333333' } as const

const setup = ({ health = 'up' as HealthState, calculation = third as Calculation } = {}) => {
  const api = {
    validate: vi.fn<CalculatorApi['validate']>().mockResolvedValue({ valid: true }),
    calculate: vi.fn<CalculatorApi['calculate']>().mockResolvedValue(calculation),
  }
  const onUnavailable = vi.fn()
  const user = userEvent.setup({ delay: null })
  const view = render(
    <Calculator api={api} health={health} onUnavailable={onUnavailable} validateDebounceMs={0} />,
  )
  const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'expression' })
  const button = (name: string) => screen.getByRole('button', { name })
  return { api, onUnavailable, user, view, input, button }
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 10)))

describe('Calculator', () => {
  describe('layout', () => {
    it('renders the input with clear, digit, operator and equals keys', () => {
      const { button } = setup()

      expect(button('clear')).toBeInTheDocument()
      for (const name of [...'0123456789', 'decimal point', 'equals']) expect(button(name)).toBeInTheDocument()
      for (const name of ['plus', 'minus', 'multiply', 'divide', 'open parenthesis', 'close parenthesis']) {
        expect(button(name)).toBeInTheDocument()
      }
      expect(screen.getByTestId('advanced-column')).toBeEmptyDOMElement()
      expect(screen.getByTestId('advanced-column')).toHaveAttribute('aria-hidden', 'true')
    })

    it('orders digits as a 3x4 pad ending in 0, . and =', () => {
      setup()
      const pad = screen.getByRole('button', { name: '7' }).parentElement!

      expect(within(pad).getAllByRole('button').map((b) => b.textContent)).toEqual([
        ...'789456123',
        '0',
        '.',
        '=',
      ])
    })

    it('shows operators with readable symbols', () => {
      const { button } = setup()

      expect(button('multiply')).toHaveTextContent('×')
      expect(button('divide')).toHaveTextContent('÷')
      expect(button('minus')).toHaveTextContent('−')
    })
  })

  describe('typing', () => {
    it('accepts digits, operators, periods and parentheses', async () => {
      const { user, input } = setup()

      await user.type(input, '(1.5+2)*-3/4-.5')

      expect(input).toHaveValue('(1.5+2)*-3/4-.5')
    })

    it('silently blocks disallowed characters and repeated operators', async () => {
      const { user, input } = setup()

      await user.type(input, 'a2 ^+*+3e=1..2.3')

      expect(input).toHaveValue('2+31.23')
    })

    it('allows a single minus sign after an operator', async () => {
      const { user, input } = setup()

      await user.type(input, '2---2')

      expect(input).toHaveValue('2--2')
    })

    it('blocks paste and drop', () => {
      const { input } = setup()

      expect(fireEvent.paste(input, { clipboardData: { getData: () => '1+1' } })).toBe(false)
      expect(fireEvent.drop(input)).toBe(false)
      expect(input).toHaveValue('')
    })

    it('leaves modifier shortcuts to the browser', () => {
      const { input } = setup()

      expect(fireEvent.keyDown(input, { key: 'a', ctrlKey: true })).toBe(true)
      expect(fireEvent.keyDown(input, { key: 'c', metaKey: true })).toBe(true)
      expect(fireEvent.keyDown(input, { key: 'π', altKey: true })).toBe(true)
    })

    it('accepts deletions and rejects invalid changes that bypass keydown', async () => {
      const { user, input } = setup()
      await user.type(input, '12+3')

      await user.keyboard('{ArrowLeft}{Backspace}')
      expect(input).toHaveValue('123')
      expect(input.selectionStart).toBe(2)

      fireEvent.change(input, { target: { value: '12x3' } })
      expect(input).toHaveValue('123')
    })
  })

  describe('buttons', () => {
    it('insert at the caret and keep it after the inserted text', async () => {
      const { user, input, button } = setup()
      await user.type(input, '12')
      input.setSelectionRange(1, 1)

      await user.click(button('plus'))
      await user.click(button('3'))

      expect(input).toHaveValue('1+32')
      expect(input.selectionStart).toBe(3)
    })

    it('apply the same blocking rules as typing', async () => {
      const { user, input, button } = setup()

      await user.click(button('multiply'))
      await user.click(button('5'))
      await user.click(button('decimal point'))
      await user.click(button('close parenthesis'))
      await user.click(button('decimal point'))

      expect(input).toHaveValue('5.')
    })

    it('do not steal focus from the input', async () => {
      const { user, input, button } = setup()
      await user.type(input, '1')
      await settle()

      expect(fireEvent.mouseDown(button('7'))).toBe(false)
      expect(fireEvent.mouseDown(button('equals'))).toBe(false)
      expect(fireEvent.mouseDown(button('clear'))).toBe(false)
    })

    it('clear empties the input', async () => {
      const { user, input, button } = setup()
      await user.type(input, '1+2')

      await user.click(button('clear'))

      expect(input).toHaveValue('')
    })
  })

  describe('validation', () => {
    it('keeps equals disabled while empty or pending and enables it once valid', async () => {
      const { user, input, button, api } = setup()
      let accept: (validation: Validation) => void = () => {}
      api.validate.mockReturnValue(new Promise((resolve) => (accept = resolve)))
      expect(button('equals')).toBeDisabled()

      await user.type(input, '4+5')
      await settle()
      expect(button('equals')).toBeDisabled()

      await act(async () => accept({ valid: true }))
      expect(api.validate).toHaveBeenLastCalledWith('4+5', expect.any(AbortSignal))
      expect(button('equals')).toBeEnabled()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('shows backend rule errors in the footer and keeps equals disabled', async () => {
      const { user, input, button, api } = setup()
      api.validate.mockResolvedValue({ valid: false, errors: ['Incomplete expression', 'Unclosed'] })

      await user.type(input, '(3*')
      await settle()

      expect(screen.getByRole('alert')).toHaveTextContent('Incomplete expression')
      expect(screen.getByRole('alert')).toHaveTextContent('Unclosed')
      expect(button('equals')).toBeDisabled()
    })

    it('ignores Enter while the expression is not valid', async () => {
      const { user, input, api } = setup()
      api.validate.mockResolvedValue({ valid: false, errors: ['x'] })
      await user.type(input, '3*')
      await settle()

      await user.keyboard('{Enter}')

      expect(api.calculate).not.toHaveBeenCalled()
    })
  })

  describe('calculating', () => {
    const typeAndSettle = async (ctx: ReturnType<typeof setup>, keys: string) => {
      await ctx.user.type(ctx.input, keys)
      await settle()
    }

    it('replaces the input with the result when equals is pressed', async () => {
      const ctx = setup()
      await typeAndSettle(ctx, '1/3')

      await ctx.user.click(ctx.button('equals'))

      expect(ctx.api.calculate).toHaveBeenCalledExactlyOnceWith('1/3')
      expect(ctx.input).toHaveValue('0.3333333333333333')
      expect(ctx.input.selectionStart).toBe(18)
    })

    it('calculates on Enter', async () => {
      const ctx = setup()
      await typeAndSettle(ctx, '1/3')

      await ctx.user.keyboard('{Enter}')

      expect(ctx.input).toHaveValue('0.3333333333333333')
    })

    it('chains on the exact value while the result is untouched', async () => {
      const ctx = setup()
      await typeAndSettle(ctx, '1/3')
      await ctx.user.click(ctx.button('equals'))
      ctx.api.calculate.mockResolvedValue({ kind: 'value', result: '1', exact: '0.9999999999999999999999999999999999' })

      await typeAndSettle(ctx, '*3')
      await ctx.user.click(ctx.button('equals'))

      expect(ctx.api.calculate).toHaveBeenLastCalledWith('0.3333333333333333333333333333333333*3')
      expect(ctx.input).toHaveValue('1')
    })

    it('keeps the exact value across repeated equals', async () => {
      const ctx = setup()
      await typeAndSettle(ctx, '1/3')
      await ctx.user.click(ctx.button('equals'))
      await settle()

      await ctx.user.click(ctx.button('equals'))

      expect(ctx.api.calculate).toHaveBeenLastCalledWith(third.exact)
    })

    it('drops the exact value once the result digits are edited', async () => {
      const ctx = setup()
      await typeAndSettle(ctx, '1/3')
      await ctx.user.click(ctx.button('equals'))

      await ctx.user.keyboard('{Backspace}')
      await typeAndSettle(ctx, '3*3')
      await ctx.user.click(ctx.button('equals'))

      expect(ctx.api.calculate).toHaveBeenLastCalledWith('0.3333333333333333*3')
    })

    it('drops the exact value even when the edit is undone by retyping', async () => {
      const ctx = setup()
      await typeAndSettle(ctx, '1/3')
      await ctx.user.click(ctx.button('equals'))

      await ctx.user.keyboard('{Backspace}')
      await typeAndSettle(ctx, '3')
      await ctx.user.click(ctx.button('equals'))

      expect(ctx.api.calculate).toHaveBeenLastCalledWith('0.3333333333333333')
    })

    it('drops the exact value when digits are appended to the result', async () => {
      const ctx = setup()
      await typeAndSettle(ctx, '1/3')
      await ctx.user.click(ctx.button('equals'))

      await typeAndSettle(ctx, '1')
      await ctx.user.keyboard('{Backspace}')
      await settle()
      await ctx.user.click(ctx.button('equals'))

      expect(ctx.api.calculate).toHaveBeenLastCalledWith('0.3333333333333333')
    })

    it('drops the exact value on clear', async () => {
      const ctx = setup()
      await typeAndSettle(ctx, '1/3')
      await ctx.user.click(ctx.button('equals'))

      await ctx.user.click(ctx.button('clear'))
      await typeAndSettle(ctx, '0.3333333333333333*3')
      await ctx.user.click(ctx.button('equals'))

      expect(ctx.api.calculate).toHaveBeenLastCalledWith('0.3333333333333333*3')
    })

    it('shows undefined on division by zero and starts fresh on the next digit', async () => {
      const ctx = setup({ calculation: { kind: 'undefined' } })
      await typeAndSettle(ctx, '1/0')

      await ctx.user.click(ctx.button('equals'))
      expect(ctx.input).toHaveValue('undefined')
      expect(ctx.button('equals')).toBeDisabled()

      await ctx.user.click(ctx.button('multiply'))
      expect(ctx.input).toHaveValue('undefined')

      await ctx.user.click(ctx.button('7'))
      expect(ctx.input).toHaveValue('7')
    })

    it('does not validate the undefined result', async () => {
      const ctx = setup({ calculation: { kind: 'undefined' } })
      await typeAndSettle(ctx, '1/0')
      await ctx.user.click(ctx.button('equals'))
      ctx.api.validate.mockClear()

      await settle()

      expect(ctx.api.validate).not.toHaveBeenCalled()
    })

    it('shows calculation errors in the footer until the next edit', async () => {
      const ctx = setup({ calculation: { kind: 'invalid', errors: ['Rejected by backend'] } })
      await typeAndSettle(ctx, '1+1')

      await ctx.user.click(ctx.button('equals'))
      expect(screen.getByRole('alert')).toHaveTextContent('Rejected by backend')
      expect(ctx.input).toHaveValue('1+1')

      await ctx.user.type(ctx.input, '1')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('reports unavailability when calculate fails', async () => {
      const ctx = setup()
      ctx.api.calculate.mockRejectedValue(new Error('timeout'))
      await typeAndSettle(ctx, '1+1')

      await ctx.user.click(ctx.button('equals'))

      expect(ctx.onUnavailable).toHaveBeenCalledOnce()
      expect(ctx.input).toHaveValue('1+1')
    })

    it('ignores equals and edits while a calculation is in flight', async () => {
      const ctx = setup()
      let finish: (c: Calculation) => void = () => {}
      ctx.api.calculate.mockReturnValue(new Promise((r) => (finish = r)))
      await typeAndSettle(ctx, '1+1')

      await ctx.user.click(ctx.button('equals'))
      expect(ctx.button('equals')).toBeDisabled()
      await ctx.user.keyboard('{Enter}')
      await ctx.user.keyboard('9')
      await ctx.user.click(ctx.button('plus'))
      await ctx.user.click(ctx.button('clear'))
      fireEvent.change(ctx.input, { target: { value: '1+' } })
      expect(ctx.input).toHaveValue('1+1')
      await act(async () => finish({ kind: 'value', result: '2', exact: '2' }))

      expect(ctx.api.calculate).toHaveBeenCalledOnce()
      expect(ctx.input).toHaveValue('2')
    })
  })

  describe('while health is unknown', () => {
    it('disables the input and buttons without an outage message', () => {
      setup({ health: 'unknown' })

      expect(screen.getByRole('textbox', { name: 'expression' })).toBeDisabled()
      for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('when the service is unavailable', () => {
    it('disables the input and every button and shows the message', () => {
      setup({ health: 'down' })

      expect(screen.getByRole('textbox', { name: 'expression' })).toBeDisabled()
      for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled()
      expect(screen.getByRole('alert')).toHaveTextContent(UNAVAILABLE_MESSAGE)
    })

    it('does not validate', async () => {
      const { api, view } = setup({ health: 'down' })
      view.rerender(<Calculator api={api} health="down" onUnavailable={() => {}} />)
      await settle()

      expect(api.validate).not.toHaveBeenCalled()
    })
  })
})
