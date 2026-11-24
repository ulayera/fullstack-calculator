# Fullstack Calculator

A web calculator split into a Go (Gin) REST API and a React + TypeScript frontend. It supports addition, subtraction, multiplication and division with parentheses and a unary minus. The backend does all arithmetic with `shopspring/decimal`.

## Layout

```
backend/              Go API (cmd/server, internal/{expression,handler,service,router,server})
frontend/             React + Vite app, served by nginx in production
e2e/                  Playwright tests (iPhone 17 and desktop Chrome)
docs/openapi.yaml     API contract
docs/coverage-report/ committed coverage snapshot (backend and frontend)
scripts/              helper scripts
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

## Calculator behaviour

- The input accepts digits, `.`, `+ - * /` and `( )` only. Anything else is ignored silently, and paste and drop are blocked.
- A binary operator needs a left operand, and only one can sit between operands. The exception is a single minus sign: `2--2` is two minus negative two, while `--3` and `2---2` are blocked.
- Numbers may start with a period (`.5`) and hold one period at most. A number can never end in a period: `5.` is reported as incomplete, and an operator or parenthesis typed right after a `.` is ignored.
- Keyboard and buttons insert at the caret and follow the same rules. Deletions always go through.
- Each change is validated by `POST /validate` after a 250ms debounce. Broken rules show in the footer, and `=` (or Enter) is enabled only once the backend says the current expression is valid.
- Precedence from highest to lowest: parentheses, unary minus, `* /`, `+ -`. Implicit multiplication like `2(3)` is rejected.
- Division keeps 34 decimal places. The final result is rounded once to 16 places, half away from zero, with trailing zeros stripped. `1/3*3 = 1`, `0.1+0.2 = 0.3`.
- Division by zero shows `undefined`. The next digit, `.`, `(` or `-` starts fresh; other operators are ignored.
- `=` replaces the input with the result and remembers its exact value. If the input still starts with that untouched result followed by an operator, the exact value is sent instead, so `1/3 = *3 =` gives `1`. Editing the result digits or pressing clear drops it.
- The frontend polls `/healthz` every 3s. A failed health check, a timed out request (5s) or a 5xx response disables the input and buttons with "Service unavailable momentarily" until health returns 200.

## API

The OpenAPI spec is in [docs/openapi.yaml](docs/openapi.yaml).

```sh
$ curl -s localhost:8080/api/v1/healthz
{"status":"ok"}
$ curl -s localhost:8080/api/v1/validate -d '{"expression":"4+5"}'
{"result":"Ok"}
$ curl -s localhost:8080/api/v1/validate -d '{"expression":"3*"}'
{"errors":["Incomplete expression: missing operand after '*' at position 2"]}
$ curl -s localhost:8080/api/v1/calculate -d '{"expression":"1/3"}'
{"result":"0.3333333333333333","exact":"0.3333333333333333333333333333333333"}
$ curl -s localhost:8080/api/v1/calculate -d '{"expression":"1/0"}'
{"result":"undefined"}
```

Rule violations and malformed bodies return 400 with every detectable error in `errors`. Unknown routes return 404 and wrong methods return 405.

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

A coverage snapshot for the assignment is committed in [docs/coverage-report](docs/coverage-report): `backend/index.html` and `frontend/index.html`, each with a `summary.txt`. Regenerate it with:

```sh
./scripts/coverage-report.sh
```

CI (`.github/workflows/ci.yml`) runs the backend and frontend checks, lints the OpenAPI spec, then runs the e2e suite against the production compose stack.
