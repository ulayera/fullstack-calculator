import { expect, test } from '@playwright/test'

test.skip(!!process.env.SKIP_NGINX_CHECKS, 'nginx-only checks')

const securityHeaders = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
}

test('nginx sends security headers on pages, assets and api', async ({ page, request }) => {
  const assets: string[] = []
  page.on('response', (r) => r.url().includes('/assets/') && assets.push(new URL(r.url()).pathname))
  await page.goto('/')
  await expect(page.getByRole('status')).toHaveText('status: ok')

  for (const path of ['/', '/api/v1/healthz', ...assets]) {
    const headers = (await request.get(path)).headers()
    expect(headers, path).toMatchObject(securityHeaders)
  }
  expect(assets.length).toBeGreaterThan(0)
})
