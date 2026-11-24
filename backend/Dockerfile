FROM golang:1.27-alpine AS base
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

FROM base AS dev
RUN go install github.com/air-verse/air@v1.67.4
CMD ["air", "--build.cmd", "go build -o ./tmp/server ./cmd/server", "--build.entrypoint", "./tmp/server", "--build.exclude_dir", "tmp", "--build.poll", "true"]

FROM base AS build
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM alpine:3.23 AS prod
RUN adduser -D -H -u 10001 app
COPY --from=build /out/server /usr/local/bin/server
USER app
ENV GIN_MODE=release PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/v1/healthz || exit 1
ENTRYPOINT ["server"]
