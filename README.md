# Fullstack Calculator

A web calculator split into a Go (Gin) REST API and a React + TypeScript frontend. Right now it is a skeleton: the frontend greets you and shows the backend health status. Arithmetic operations come next.

## Layout

```
backend/              Go API (cmd/server, internal/{handler,service,router})
frontend/             React + Vite app, served by nginx in production
e2e/                  Playwright tests (iPhone 17 and desktop Chrome)
docs/openapi.yaml     API contract
docker-compose.yml        production stack
docker-compose.local.yml  local stack with hot reload
```

## Run locally

You need Docker with Compose v2.

Production-like stack, where nginx serves the built app and proxies `/api` to the backend:

```sh
docker compose up -d --build --wait
open http://localhost:8080
```

Set `APP_PORT` to use a port other than 8080. The frontend healthcheck goes through nginx to the backend, so it reports unhealthy while the backend is down.

Development stack, with Vite and air reloading on file changes:

```sh
docker compose -f docker-compose.local.yml up -d --build --wait
open http://localhost:5173
```

The local backend is also published directly on http://localhost:8081.

Without Docker, run `go run ./cmd/server` in `backend/` and `npm install && npm run dev` in `frontend/`. Vite proxies `/api` to `localhost:8080`.

## API

The OpenAPI spec is in [docs/openapi.yaml](docs/openapi.yaml).

```sh
$ curl -s http://localhost:8080/api/v1/healthz
{"status":"ok"}
```

Unknown routes return 404 and wrong methods return 405.

## Tests and coverage

Backend unit tests, with coverage measured over `internal/` (`cmd/server` only wires dependencies):

```sh
cd backend
go test ./... -coverpkg=./internal/... -coverprofile=coverage.out
go tool cover -func=coverage.out
go tool cover -html=coverage.out
```

Frontend lint, unit tests and build. Coverage must stay at 100% or the run fails; the HTML report lands in `frontend/coverage/index.html`.

```sh
cd frontend
npm ci
npm run lint
npm run coverage
npm run build
```

`npm run check` runs all three.

End-to-end tests run against a running stack (port 8080 by default, or set `BASE_URL`):

```sh
docker compose up -d --build --wait
cd e2e
npm ci
npx playwright install webkit chromium
npm run typecheck
npx playwright test
SKIP_NGINX_CHECKS=1 BASE_URL=http://localhost:5173 npx playwright test
```

Screenshots, traces and the HTML report are written to `tmp/e2e/`.

CI (`.github/workflows/ci.yml`) runs the backend and frontend checks, lints the OpenAPI spec, then runs the e2e suite against the production compose stack.
