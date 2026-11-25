import { expect, test, type Page } from '@playwright/test'

export const shot = (name: string) =>
  `../tmp/e2e/screenshots/${test.info().project.name}-${name}.png`

const KEY_NAMES: Record<string, string> = {
  '+': 'plus',
  '-': 'minus',
  '*': 'multiply',
  '/': 'divide',
  '(': 'open parenthesis',
  ')': 'close parenthesis',
  '.': 'decimal point',
  '^': 'power',
  '%': 'percent of',
  '√': 'square root',
}

export const calculator = (page: Page) => {
  const input = page.getByRole('textbox', { name: 'expression' })
  const button = (name: string) => page.getByRole('button', { name, exact: true })
  const equals = button('equals')
  const footer = page.getByRole('alert')

  return {
    input,
    button,
    equals,
    footer,
    open: async () => {
      await page.goto('/')
      await expect(input).toBeEnabled()
    },
    press: async (keys: string) => {
      for (const key of keys) await button(KEY_NAMES[key] ?? key).click()
    },
  }
}
