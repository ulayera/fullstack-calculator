import { expect, test } from '@playwright/test'

test.describe('calculator api', () => {
  const post = (request: import('@playwright/test').APIRequestContext, path: string, expression: unknown) =>
    request.post(`/api/v1/${path}`, { data: { expression } })

  test('validate answers Ok for a valid expression', async ({ request }) => {
    const response = await post(request, 'validate', '4+5')

    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ result: 'Ok' })
  })

  for (const [expression, error] of [
    ['3*', "Incomplete expression: missing operand after '*' at position 2"],
    ['--3', 'Minus sign at position 2 repeats a sign; only one is allowed'],
    ['2(3)', 'Implicit multiplication is not allowed at position 2'],
    ['5.', "Number '5.' at position 1 cannot end with a decimal point"],
    ['1.2.3', "Number '1.2.3' at position 1 has more than one decimal point"],
    ['(2', "Unclosed '(' at position 1"],
    ['2)', "Unmatched ')' at position 2"],
    ['2a', "Invalid character 'a' at position 2"],
    ['', 'Expression is empty'],
  ]) {
    test(`validate rejects ${JSON.stringify(expression)}`, async ({ request }) => {
      const response = await post(request, 'validate', expression)

      expect(response.status()).toBe(400)
      expect(await response.json()).toEqual({ errors: [error] })
    })
  }

  test('validate lists every detectable error', async ({ request }) => {
    const response = await post(request, 'validate', '1..2*+3-')

    expect(response.status()).toBe(400)
    expect((await response.json()).errors).toHaveLength(3)
  })

  for (const [expression, result, exact] of [
    ['1/3', '0.3333333333333333', '0.3333333333333333333333333333333333'],
    ['2/3', '0.6666666666666667', '0.6666666666666666666666666666666667'],
    ['0.1+0.2', '0.3', '0.3'],
    ['1/3*3', '1', '0.9999999999999999999999999999999999'],
    ['8/2*4', '16', '16'],
    ['2+3*4', '14', '14'],
    ['-(2+3)', '-5', '-5'],
    ['2*-3', '-6', '-6'],
    ['2--2', '4', '4'],
    ['.5+.5', '1', '1'],
  ]) {
    test(`calculate ${expression} = ${result}`, async ({ request }) => {
      const response = await post(request, 'calculate', expression)

      expect(response.status()).toBe(200)
      expect(await response.json()).toEqual({ result, exact })
    })
  }

  test('calculate answers undefined on division by zero', async ({ request }) => {
    const response = await post(request, 'calculate', '1/(2-2)')

    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ result: 'undefined' })
  })

  test('calculate rejects invalid expressions with errors', async ({ request }) => {
    const response = await post(request, 'calculate', '2(3)')

    expect(response.status()).toBe(400)
    expect(await response.json()).toEqual({ errors: ['Implicit multiplication is not allowed at position 2'] })
  })

  test('malformed bodies are rejected', async ({ request }) => {
    for (const path of ['validate', 'calculate']) {
      const response = await post(request, path, 42)

      expect(response.status()).toBe(400)
      expect(await response.json()).toEqual({
        errors: ["Request body must be a JSON object with a string 'expression'"],
      })
    }
  })
})
