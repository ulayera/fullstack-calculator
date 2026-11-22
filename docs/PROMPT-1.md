# Skeleton

The current task at hand is to create the skeleton, a hello world app that is deployable and sets the right base project for the rest of the requirements:

- Rest API with backend health endpoint
- React latest frontend (Typescript) with responsive mobile-first responsive UI, verified at an iPhone 17 viewport equivalent in browser.
- Go latest, with latest Gin.
- Production ready docker compose, local env docker compose, frontend/backend in separate services sharing network. healthchecks expect /api/v1/healthz
- hello world checks health endpoint (hello world! status: {status})
- api endpoints:
GET /api/v1/healthz    #returns 200, { "status": "ok" }
- updates docs/openapi.yaml
- concise README.md file (use humanized skill) with title, description, how-to run locally, 1 example of each api resource.

Structure: (backend/ frontend/ docs/openapi.yaml, docker-compose(.local).yml, .github/workflows/ci.yml).