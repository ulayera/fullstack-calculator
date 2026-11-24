import { expect, test } from '@playwright/test'
import { calculator, shot } from './support/calculator'

test.describe('calculator ui', () => {
  test('lays out the input, clear, digits and operators', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()

    const box = async (name: string) => (await calc.button(name).boundingBox())!
    const [seven, nine, zero, equals, plus, minus, open, close, clear, input] = await Promise.all(
      ['7', '9', '0', 'equals', 'plus', 'minus', 'open parenthesis', 'close parenthesis', 'clear'].map(box).concat(
        calc.input.boundingBox().then((b) => b!),
      ),
    )
    expect(seven.y).toBeCloseTo(nine.y, 0)
    expect(zero.y).toBeCloseTo(equals.y, 0)
    expect(equals.x).toBeGreaterThan(zero.x)
    expect(plus.x).toBeGreaterThan(nine.x)
    expect(minus.x).toBeGreaterThan(plus.x)
    expect(close.y).toBeGreaterThan(plus.y)
    expect(open.x).toBeCloseTo(plus.x, 0)
    expect(clear.x).toBeGreaterThan(input.x + input.width - 1)
    expect(seven.x).toBeGreaterThan(input.x + 20)
    await expect(page.getByTestId('advanced-column')).toBeHidden()
    await page.screenshot({ path: shot('layout'), fullPage: true })
  })

  test('fits the viewport without horizontal scroll', async ({ page }) => {
    await calculator(page).open()

    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
  })

  for (const [expression, result] of [
    ['1/3', '0.3333333333333333'],
    ['2/3', '0.6666666666666667'],
    ['0.1+0.2', '0.3'],
    ['1/3*3', '1'],
    ['8/2*4', '16'],
    ['2+3*4', '14'],
    ['-(2+3)', '-5'],
    ['2*-3', '-6'],
    ['2--2', '4'],
    ['.5*4', '2'],
  ]) {
    test(`buttons compute ${expression} = ${result}`, async ({ page }) => {
      const calc = calculator(page)
      await calc.open()

      await calc.press(expression)
      await expect(calc.input).toHaveValue(expression)
      await expect(calc.equals).toBeEnabled()
      await calc.equals.click()

      await expect(calc.input).toHaveValue(result)
      await expect(calc.footer).toHaveCount(0)
    })
  }

  test('typing blocks disallowed characters, repeated operators and extra periods', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()

    await calc.input.pressSequentially('a2 ^+*+3e%1..2.5')

    await expect(calc.input).toHaveValue('2+31.25')
    await calc.input.fill('')
    await calc.button('clear').click()
    await calc.input.pressSequentially('5.+---2')
    await expect(calc.input).toHaveValue('5.2')
  })

  test('paste is blocked', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are chromium-only')
    const calc = calculator(page)
    await calc.open()
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.evaluate(() => navigator.clipboard.writeText('1+1'))

    await calc.input.focus()
    await page.keyboard.press('ControlOrMeta+V')

    await expect(calc.input).toHaveValue('')
  })

  test('buttons insert at the caret', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()
    await calc.press('12')

    await calc.input.evaluate((el: HTMLInputElement) => el.setSelectionRange(1, 1))
    await calc.press('+3')

    await expect(calc.input).toHaveValue('1+32')
  })

  for (const [expression, error] of [
    ['3*', "Incomplete expression: missing operand after '*' at position 2"],
    ['2(3)', 'Implicit multiplication is not allowed at position 2'],
    ['(2+3', "Unclosed '(' at position 1"],
    ['5.', "Number '5.' at position 1 cannot end with a decimal point"],
    ['()', 'Empty parentheses at position 1'],
  ]) {
    test(`shows the broken rule for ${expression} and keeps equals disabled`, async ({ page }) => {
      const calc = calculator(page)
      await calc.open()

      await calc.press(expression)

      await expect(calc.footer).toHaveText(error)
      await expect(calc.equals).toBeDisabled()
      await page.screenshot({ path: shot(`error-${expression.replace(/[^0-9a-z]/gi, '_')}`), fullPage: true })
    })
  }

  test('division by zero shows undefined and the next digit starts fresh', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()

    await calc.press('7/0')
    await calc.equals.click()
    await expect(calc.input).toHaveValue('undefined')
    await page.screenshot({ path: shot('undefined'), fullPage: true })

    await calc.press('*)+')
    await expect(calc.input).toHaveValue('undefined')
    await calc.press('4')
    await expect(calc.input).toHaveValue('4')
  })

  test('Enter calculates and clear resets', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()
    await calc.input.pressSequentially('6*7')
    await expect(calc.equals).toBeEnabled()

    await calc.input.press('Enter')
    await expect(calc.input).toHaveValue('42')

    await calc.button('clear').click()
    await expect(calc.input).toHaveValue('')
    await expect(calc.equals).toBeDisabled()
  })

  test('chaining reuses the exact value while the result is untouched', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()
    const sent: string[] = []
    page.on('request', (r) => r.url().endsWith('/api/v1/calculate') && sent.push(r.postDataJSON().expression))

    await calc.press('1/3')
    await calc.equals.click()
    await expect(calc.input).toHaveValue('0.3333333333333333')
    await calc.press('*3')
    await expect(calc.equals).toBeEnabled()
    await calc.equals.click()

    await expect(calc.input).toHaveValue('1')
    expect(sent).toEqual(['1/3', '0.3333333333333333333333333333333333*3'])
    await page.screenshot({ path: shot('chained'), fullPage: true })
  })

  test('chaining sends the screen value once the result digits were edited', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()
    const sent: string[] = []
    page.on('request', (r) => r.url().endsWith('/api/v1/calculate') && sent.push(r.postDataJSON().expression))

    await calc.press('1/3')
    await calc.equals.click()
    await expect(calc.input).toHaveValue('0.3333333333333333')
    await calc.input.focus()
    await page.keyboard.press('Backspace')
    await calc.press('3*3')
    await expect(calc.equals).toBeEnabled()
    await calc.equals.click()

    await expect(calc.input).toHaveValue('0.9999999999999999')
    expect(sent).toEqual(['1/3', '0.3333333333333333*3'])
  })
})
