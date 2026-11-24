# Skeleton

The current task at hand is to create the skeleton, a hello world app that is deployable and sets the right base project for the rest of the requirements:

- Rest API with backend health endpoint
- React latest frontend (Typescript) with responsive basic-mobile  UI, verified at an iPhone 17 viewport equivalent in browser. Vite + React + Vitest + React Testing Library. Build with lint test.
- Go latest, with latest Gin. Go test with coverage. Layered (cmd/server/main.go, internal/**/[handler/service/router])
- Production ready docker compose, local env docker compose, frontend/backend in separate services sharing network. nginx serves static resources and prxies /api. healthchecks expect /api/v1/healthz
- hello world checks health endpoint (hello world! status: {status})
- api endpoints:
GET /api/v1/healthz    #returns 200, { "status": "ok" }
- updates docs/openapi.yaml
- concise README.md file (use humanized skill) with title, description, how-to run locally, 1 example of each api resource.

Structure: (backend/ frontend/ docs/openapi.yaml, docker-compose(.local).yml, .github/workflows/ci.yml).