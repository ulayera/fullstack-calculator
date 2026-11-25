import { expect, test } from '@playwright/test'
import { calculator, shot } from './support/calculator'

const LIMIT_ERROR = 'power operation refused due to computation limit exceeded'
const IMAGINARY_ERROR = 'imaginary numbers not supported'

test.describe('advanced operations ui', () => {
  for (const [expression, result] of [
    ['2^3^2', '512'],
    ['-2^2', '-4'],
    ['2^-1', '0.5'],
    ['√4*4', '8'],
    ['√16^0.5', '2'],
    ['10%200', '20'],
    ['5+10%50', '10'],
    ['100/10%50', '5'],
    ['10%2^3', '0.8'],
    ['20%300', '60'],
    ['2^32', '4294967296'],
    ['√2', '1.414213562373095'],
    ['√(3^2+4^2)', '5'],
    ['0^0', '1'],
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

  test('typing V turns into √ and the result computes', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()

    await calc.input.pressSequentially('V16^0.5+v4')
    await expect(calc.input).toHaveValue('√16^0.5+√4')
    await expect(calc.equals).toBeEnabled()
    await calc.input.press('Enter')

    await expect(calc.input).toHaveValue('4')
    await page.screenshot({ path: shot('advanced-v-converted'), fullPage: true })
  })

  test('typing blocks repeated binary operators around ^ and %', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()

    await calc.input.pressSequentially('^2^^%3%*^4')

    await expect(calc.input).toHaveValue('2^3%4')
  })

  for (const [expression, error, name] of [
    ['2^', "Incomplete expression: missing operand after '^' at position 2", 'incomplete-power'],
    ['20%', "Incomplete expression: missing operand after '%' at position 3", 'incomplete-percent'],
    ['√', "Incomplete expression: missing operand after '√' at position 1", 'incomplete-root'],
    ['2√4', 'Implicit multiplication is not allowed at position 2', 'implicit-root'],
    ['√-4', IMAGINARY_ERROR, 'imaginary-root'],
    ['(-8)^0.5', IMAGINARY_ERROR, 'imaginary-power'],
    ['10^100001', LIMIT_ERROR, 'power-limit'],
    ['2^3^20', LIMIT_ERROR, 'power-limit-tower'],
  ]) {
    test(`shows "${error}" for ${expression} and keeps equals disabled`, async ({ page }) => {
      const calc = calculator(page)
      await calc.open()

      await calc.press(expression)

      await expect(calc.footer).toHaveText(error)
      await expect(calc.equals).toBeDisabled()
      await page.screenshot({ path: shot(`advanced-error-${name}`), fullPage: true })
    })
  }

  test('0^-1 shows undefined and √ starts fresh', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()

    await calc.press('0^-1')
    await calc.equals.click()
    await expect(calc.input).toHaveValue('undefined')

    await calc.press('^%')
    await expect(calc.input).toHaveValue('undefined')
    await calc.press('√9')
    await expect(calc.input).toHaveValue('√9')
  })

  test('the result of 10^100000 is computed at the limit', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()

    await calc.press('10^100000')
    await expect(calc.equals).toBeEnabled()
    await calc.equals.click()

    await expect(calc.input).toHaveValue('1' + '0'.repeat(100000))
  })

  test('chains a power onto an exact square root', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()
    const sent: string[] = []
    page.on('request', (r) => r.url().endsWith('/api/v1/calculate') && sent.push(r.postDataJSON().expression))

    await calc.press('√2')
    await calc.equals.click()
    await expect(calc.input).toHaveValue('1.414213562373095')
    await calc.press('^2')
    await calc.equals.click()

    await expect(calc.input).toHaveValue('2')
    expect(sent).toEqual(['√2', '1.414213562373095048801688724209698^2'])
    await page.screenshot({ path: shot('advanced-chained'), fullPage: true })
  })
})

test.describe('advanced operations api', () => {
  const post = (request: import('@playwright/test').APIRequestContext, path: string, expression: string) =>
    request.post(`/api/v1/${path}`, { data: { expression } })

  for (const [expression, result, exact] of [
    ['2^3^2', '512', '512'],
    ['-2^2', '-4', '-4'],
    ['2^-1', '0.5', '0.5'],
    ['V4*4', '8', '8'],
    ['√4*4', '8', '8'],
    ['V16^0.5', '2', '2'],
    ['10%200', '20', '20'],
    ['5+10%50', '10', '10'],
    ['100/10%50', '5', '5'],
    ['10%2^3', '0.8', '0.8'],
    ['√2', '1.414213562373095', '1.414213562373095048801688724209698'],
    ['2^0.5', '1.414213562373095', '1.414213562373095048801688724209698'],
    ['3^-1', '0.3333333333333333', '0.3333333333333333333333333333333333'],
  ]) {
    test(`calculate ${expression} = ${result}`, async ({ request }) => {
      const response = await post(request, 'calculate', expression)

      expect(response.status()).toBe(200)
      expect(await response.json()).toEqual({ result, exact })
    })
  }

  for (const [expression, error] of [
    ['10^100001', LIMIT_ERROR],
    ['2^332193', LIMIT_ERROR],
    ['10^-100001', LIMIT_ERROR],
    ['√-4', IMAGINARY_ERROR],
    ['(-8)^0.5', IMAGINARY_ERROR],
  ]) {
    for (const path of ['validate', 'calculate']) {
      test(`${path} refuses ${expression} with 422`, async ({ request }) => {
        const response = await post(request, path, expression)

        expect(response.status()).toBe(422)
        expect(await response.json()).toEqual({ errors: [error] })
      })
    }
  }

  test('refuses expressions whose evaluation would outgrow the limit, quickly', async ({ request }) => {
    for (const expression of [
      Array(1000).fill('9^99999').join('*'),
      Array(900).fill('2^332192-2^332192').join('+'),
      '(1+10^-400)^(10^390)',
    ]) {
      const started = Date.now()
      const response = await post(request, 'validate', expression)

      expect(response.status(), expression.slice(0, 30)).toBe(422)
      expect(await response.json()).toEqual({ errors: [LIMIT_ERROR] })
      expect(Date.now() - started).toBeLessThan(1000)
    }
  })

  test('keeps integer powers exact up to the limit and accepts lowercase v', async ({ request }) => {
    const power = await (await post(request, 'calculate', '11^60000')).json()
    const root = await (await post(request, 'calculate', 'v4')).json()

    expect(power.exact).toHaveLength(62484)
    expect(power.exact.endsWith('1')).toBe(true)
    expect(root).toEqual({ result: '2', exact: '2' })
  })

  test('validate accepts powers right at the limit', async ({ request }) => {
    for (const expression of ['10^100000', '2^332192', '0.1^-100000']) {
      const response = await post(request, 'validate', expression)

      expect(response.status(), expression).toBe(200)
    }
  })

  for (const [expression, error] of [
    ['2^^3', "Operator '^' at position 3 is missing its left operand"],
    ['2%*3', "Operator '*' at position 3 is missing its left operand"],
    ['3*', "Incomplete expression: missing operand after '*' at position 2"],
    ['2^', "Incomplete expression: missing operand after '^' at position 2"],
  ]) {
    test(`validate rejects ${expression} with 400`, async ({ request }) => {
      const response = await post(request, 'validate', expression)

      expect(response.status()).toBe(400)
      expect(await response.json()).toEqual({ errors: [error] })
    })
  }
})
