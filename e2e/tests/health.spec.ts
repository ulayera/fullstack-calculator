import { expect, test } from '@playwright/test'
import { calculator, shot } from './support/calculator'

test.describe('health api', () => {
  test('GET /api/v1/healthz returns 200 with ok status', async ({ request }) => {
    const response = await request.get('/api/v1/healthz')

    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  test('unknown api route returns 404', async ({ request }) => {
    const response = await request.get('/api/v1/unknown')

    expect(response.status()).toBe(404)
  })

  test('wrong methods return 405', async ({ request }) => {
    expect((await request.post('/api/v1/healthz')).status()).toBe(405)
    expect((await request.get('/api/v1/validate')).status()).toBe(405)
    expect((await request.get('/api/v1/calculate')).status()).toBe(405)
  })
})

test.describe('availability', () => {
  test('enables the calculator once the backend is healthy', async ({ page }) => {
    const calc = calculator(page)

    await calc.open()

    await expect(calc.footer).toHaveCount(0)
  })

  test('disables input and buttons while healthz fails and recovers when it returns 200', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()
    await page.route('**/api/v1/healthz', (route) => route.fulfill({ status: 503, body: 'down' }))

    await expect(calc.input).toBeDisabled({ timeout: 10_000 })
    await expect(calc.footer).toHaveText('Service unavailable momentarily')
    for (const b of await page.getByRole('button').all()) await expect(b).toBeDisabled()
    await page.screenshot({ path: shot('unavailable'), fullPage: true })

    await page.unroute('**/api/v1/healthz')
    await expect(calc.input).toBeEnabled({ timeout: 10_000 })
    await expect(calc.footer).toHaveCount(0)
  })

  test('disables the calculator when validate times out', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()
    await page.route('**/api/v1/validate', (route) => route.abort('timedout'))

    await calc.press('1')

    await expect(calc.input).toBeDisabled()
    await expect(calc.footer).toHaveText('Service unavailable momentarily')
  })

  test('disables the calculator when calculate times out', async ({ page }) => {
    const calc = calculator(page)
    await calc.open()
    await page.route('**/api/v1/calculate', (route) => route.abort('timedout'))
    await calc.press('1+1')
    await expect(calc.equals).toBeEnabled()

    await calc.equals.click()

    await expect(calc.input).toBeDisabled()
    await expect(calc.footer).toHaveText('Service unavailable momentarily')
  })

  test('serves index.html for client-side routes', async ({ page }) => {
    await page.goto('/some/deep/link')

    await expect(page.getByRole('heading', { name: 'Calculator' })).toBeVisible()
  })
})
