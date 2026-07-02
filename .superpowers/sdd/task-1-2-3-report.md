# Task 1+2+3 Report

**Status: DONE**

## Files Modified

| File | Action |
|------|--------|
| `package.json` | Updated `dev` script: added `--port 3019` |
| `.env` | Added `BACKEND_URL=http://localhost:4019`, updated `NEXTAUTH_URL` to port 3019, updated `AUTH_SECRET`, kept OAuth keys |
| `src/configs/auth.config.ts` | Replaced Credentials `authorize()` to call real backend; added `jwt` callback; updated `session` callback; removed `validateCredential` import |

## Files Created

| File | Purpose |
|------|---------|
| `src/app/api/proxy/[...path]/route.ts` | Catch-all proxy: reads session, injects Bearer token, forwards to `BACKEND_URL/api/v1/...` |
| `src/constants/api.constant.ts` | `API_ENDPOINTS` object with all backend route constants |
| `src/constants/route.constant.ts` | Replaced `ROOT = '/'` with full `ROUTES` object |
| `src/utils/error.util.ts` | `parseApiError()` for Axios error normalization |
| `src/utils/formatNumber.ts` | `formatRupiah()` and `formatNum()` utilities |

## TypeScript Check

`npx tsc --noEmit` — **0 errors** (clean output).

## Notes

- `validateCredential.ts` was NOT deleted — only its import was removed from `auth.config.ts`.
- `src/utils/` directory did not exist prior to this task; created with two new files.
- `src/constants/` directory already existed (contained `route.constant.ts`); added `api.constant.ts` alongside it.
- The `params` in the proxy route handler is correctly typed as `Promise<{ path: string[] }>` and awaited per NextAuth v5 / Next.js 15 conventions.
