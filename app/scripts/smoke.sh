#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

log_ok(){ printf "✅ %s\n" "$1"; }
log_fail(){ printf "❌ %s\n" "$1"; exit 1; }

echo "[smoke] GET /api/health"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" || true)
if [ "$code" = "200" ] || [ "$code" = "204" ]; then
  log_ok "health $code"
else
  log_fail "health $code"
fi

echo "[smoke] GET /api/admin/ping (no token)"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/ping" || true)
[ "$code" = "401" ] && log_ok "admin/ping unauth 401" || log_fail "admin/ping unauth $code"

echo "[smoke] GET /api/admin/ping (with token)"
code=$(curl -s -H "Authorization: Bearer smoke" -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/ping" || true)
[ "$code" = "200" ] && log_ok "admin/ping auth 200" || log_fail "admin/ping auth $code"

echo "[smoke] GET /doors"
html=$(curl -sS "$BASE_URL/doors" || true)
echo "$html" | grep -q 'data-smoke="compat-active"' && log_ok "/doors SSR marker present" || log_fail "/doors SSR marker missing"

echo "[SMOKE] exports/doors/{kp,invoice,factory} — strict JSON contract"
check_export () {
  local path="$1"; local expected="$2"
  local resp
  resp=$(curl -sS -X POST -H 'Content-Type: application/json' -d '{}' "$BASE_URL$path" || true)
  echo "$resp" | jq -e ".ok == true and .type == \"$expected\"" >/dev/null 2>&1 \
    && printf "✅ OK POST %s (ok:true,type:%s)\n" "$path" "$expected" \
    || { printf "❌ FAIL %s — unexpected body: %s\n" "$path" "$resp"; exit 1; }
}

check_export "/api/cart/export/doors/kp" kp
check_export "/api/cart/export/doors/invoice" invoice
check_export "/api/cart/export/doors/factory" factory

echo "[SMOKE] Import Doors CSV"
resp=$(curl -sS -H "Authorization: Bearer smoke" \
  -F "file=@/etc/hosts;filename=test.csv;type=text/csv" \
  "$BASE_URL/api/admin/import/doors" || true)
echo "$resp" | jq -e ".ok == true" >/dev/null 2>&1 \
  && printf "✅ OK POST /api/admin/import/doors (ok:true)\n" \
  || { printf "❌ FAIL import/doors — unexpected body: %s\n" "$resp"; exit 1; }

echo "[SMOKE] Media Upload (Doors)"
resp=$(curl -sS -H "Authorization: Bearer smoke" \
  -F "model=PO Base 1/1" \
  -F "file=@/etc/hosts;filename=example.jpg;type=image/jpeg" \
  "$BASE_URL/api/admin/media/upload" || true)
echo "$resp" | jq -e ".files[0].url | contains(\"PO%20Base%201%2F1\")" >/dev/null 2>&1 \
  && printf "✅ OK POST /api/admin/media/upload (file saved)\n" \
  || { printf "❌ FAIL media/upload — unexpected body: %s\n" "$resp"; exit 1; }

echo "SMOKE OK"
