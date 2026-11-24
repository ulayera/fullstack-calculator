#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/docs/coverage-report"
rm -rf "$out"
mkdir -p "$out/backend" "$out/frontend"

cd "$root/backend"
go test ./... -coverpkg=./internal/... -coverprofile=coverage.out >/dev/null
go tool cover -func=coverage.out >"$out/backend/summary.txt"
go tool cover -html=coverage.out -o "$out/backend/index.html"
rm coverage.out

cd "$root/frontend"
NO_COLOR=1 npx vitest run --coverage --coverage.reporter=html --coverage.reporter=text \
  --coverage.reportsDirectory="$out/frontend" | sed -n '/Coverage report/,$p' >"$out/frontend.txt"
mv "$out/frontend.txt" "$out/frontend/summary.txt"

echo "Coverage report written to docs/coverage-report"
tail -n 1 "$out/backend/summary.txt"
grep -E "^(Statements|Branches|Functions|Lines)" "$out/frontend/summary.txt"
