import { expect, test } from '@playwright/test'

const shot = (name: string) => `../tmp/e2e/screenshots/${test.info().project.name}-${name}.png`

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

  test('wrong method on healthz returns 405', async ({ request }) => {
    const response = await request.post('/api/v1/healthz')

    expect(response.status()).toBe(405)
  })
})

test.describe('hello world page', () => {
  test('greets and shows the live backend status', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'hello world!' })).toBeVisible()
    await expect(page.getByRole('status')).toHaveText('status: ok')
    await page.screenshot({ path: shot('healthy'), fullPage: true })
  })

  test('fits the viewport without horizontal scroll', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('status')).toHaveText('status: ok')

    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
  })

  test('shows unavailable when the backend is down', async ({ page }) => {
    await page.route('**/api/v1/healthz', (route) => route.fulfill({ status: 503, body: 'down' }))

    await page.goto('/')

    await expect(page.getByRole('status')).toHaveText('status: unavailable')
    await page.screenshot({ path: shot('unavailable'), fullPage: true })
  })

  test('serves index.html for client-side routes', async ({ page }) => {
    await page.goto('/some/deep/link')

    await expect(page.getByRole('heading', { name: 'hello world!' })).toBeVisible()
  })
})
