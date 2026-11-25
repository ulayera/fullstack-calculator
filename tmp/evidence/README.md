# Evidence (prompt 2: calculator with + - * /)

- api.txt: curl transcript against the docker compose stack: valid, invalid, undefined, malformed and 405 cases.
- api-after-review.txt: the fixes from the review (significant-digit division, parenthesis errors listed first).
- backend-tests.txt: gofmt, go vet, race-enabled verbose tests, 100% coverage.
- frontend-check.txt: eslint, vitest with coverage (100%), production build.
- e2e.txt: Playwright on iphone-17 (webkit) and desktop-chrome: 113 passed, 1 skipped (clipboard paste runs on chromium only).
- e2e-flaky-run.txt: one earlier run with 2 failures. Its trace shows that page timers stalled for about 18s: one healthz request at load, no 3s polls, and validate fired 18s after typing. That points to CPU starvation with parallel webkit and chromium workers next to Docker, not to app logic. Four later full runs passed.
- outage.txt plus outage-1/2 PNGs: the backend container was really stopped. The UI disabled itself with "Service unavailable momentarily" and recovered after `docker compose start backend`.
- Screenshots per device: ../e2e/screenshots (layout, errors, undefined, chained, unavailable).
