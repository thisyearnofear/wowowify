# Vercel Env-Verification Checklist

**Run before flipping DNS / announcing the soft launch.** See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the Studio + ASP split, shared `toka-blob` store, and **git-only deploy rule for ASP** (do not use CLI `vercel redeploy` on `wowowify-asp`).

Each env var below is a known fixed dependency of a route in `src/app/api/`. Production fails LOUD if any required env is missing (see `src/lib/image-store.ts` for the loud-fail pattern), so a missing env surfaces as a 500 with a clear error message — not silent data loss.

---

## 0 · Two Vercel projects

| Project | Role | `TOKA_DEPLOYMENT` |
|---|---|---|
| `wowowify` | Studio + Mini App | `studio` or `all` |
| `wowowify-asp` | API-only ASP | `asp` |

Both projects should use **`toka-blob`** (public) — same `BLOB_READ_WRITE_TOKEN` + `BLOB_STORE_ID`. The legacy private `wowowify-blob` store was removed; do not recreate a private store for this app.

---

## 1 · Confirm env vars are present in Vercel

Vercel dashboard → Project → Settings → Environment Variables. For each var below, verify on **both** projects where marked:
- **Value** matches what the corresponding service expects
- **Scope** is `Production` (testnet is fine for soft launch)
- **Sensitive values** are NOT visible to anyone but Vercel

| # | Env var | Studio | ASP | Required for |
|---|---------|:--:|:--:|---|
| 1 | `VENICE_API_KEY` | ✓ | ✓ | `/api/generate`, agent pipeline |
| 2 | `BLOB_READ_WRITE_TOKEN` | ✓ | ✓ | Image archive → shared public `toka-blob` |
| 3 | `BLOB_STORE_ID` | ✓ | ✓ | `store_s9IKHju2Z1m5gMx7` (with OIDC on Vercel) |
| 4 | `STUDIO_URL` | ✓ | ✓ | Review links, demo kit static assets |
| 5 | `ASP_URL` | ✓ | ✓ | agent.json service URL |
| 6 | `TOKA_DEPLOYMENT` | ✓ | ✓ | Route / middleware gating |
| 7 | `REDIS_URL` | ✓ | ✓ | Drafts, brand kits, rate limits |
| 8 | `NEYNAR_API_KEY` | ✓ | — | `/api/farcaster/webhook` (Studio only) |
| 9 | `FARCASTER_BOT_FID` | ✓ | — | Farcaster bot identity |
| 10 | `FARCASTER_SIGNER_UUID` | ✓ | — | Neynar signer |
| 11 | `NEYNAR_WEBHOOK_SECRET` | ✓ | — | Webhook HMAC |

---

## 2 · Smoke-test each motion surface against production

Each smoke test is one curl/click. Expected behavior is documented; deviations need patch before soft launch.

### 2.1 · Storage wiring (image archive)

```bash
# ASP agent end-to-end — expect status "completed" and a public Blob URL
curl -s -X POST "https://wowowify-asp.vercel.app/api/agent" \
  -H "Content-Type: application/json" \
  -d '{"command":"Soft blue gradient launch background","parameters":{"brandKitId":"demo-launch","formats":["square"]}}'
```

```bash
curl -sI "https://wowowify.vercel.app/api/image?id=smoke-test-$RANDOM"
```

**Expected**: Agent POST returns `completed` with `*.public.blob.vercel-storage.com` URLs. Image route 404 for unknown id is healthy; 500 means Blob env is misconfigured (often private store + `access: "public"`).

### 2.2 · Webhook signature enforcement (Farcaster — deferred)

Routes remain deployed; skip live bot smoke tests until Farcaster relaunch.

```bash
# Valid path: missing signature → 401
curl -sI -X POST "https://wowowify.vercel.app/api/farcaster/webhook" \
  -H "Content-Type: application/json" -d '{}'
```

**Expected**: 401 (signature required in production per `verifyWebhookSignature()` in the route). 200 means the signature check is gated off — investigate before Farcaster relaunch.

### 2.3 · Farcaster bot happy-path (skip until relaunch)

When the bot is live again, post a cast with a wowowify command (e.g. `wowowify a mountain landscape with higherify`) and confirm reply + image delivery. Defer this until ASP is on `api.wowowify.persidian.com`.

### 2.4 · Rate-limit wiring

Hit `/api/generate` 21 times in a row from the same IP.

**Expected**: first 20 succeed (or return real validation errors), 21st returns 429 with `Retry-After` header. If the 21st succeeds, Redis isn't wired and rate-limiting silently fails-open (acceptable but flag).

### 2.5 · Frame embeds (CSP)

Visit `https://wowowify.vercel.app/frames` from inside a Warpcast client — confirm the frame renders. If Warpcast's iframe CSP rejects, check:
- `frame-ancestors` in `next.config.mjs` includes `warpcast.com` (it should, derived from `APP_ORIGIN`)
- Browser DevTools shows a CSP violation block

### 2.6 · Manifest

Visit `https://wowowify.vercel.app/.well-known/farcaster.json` → expect valid JSON with `accountAssociation.header` matching `wowowify.vercel.app` decoded.

---

## 3 · Confirm pre-commit hooks are wired (one-time, after first clone)

Even though this is a Vercel-side checklist, the build pipeline depends on local hooks being in place. After any clone or fresh setup:

```bash
ls -la .husky/pre-commit           # should exist and be -rwxr-xr-x
cat .husky/pre-commit             # should print (the husky script)
npm run lint-staged               # exercises eslint + secretlint on staged files
```

**Expected**: husky pre-commit runs `npx --no-install lint-staged`, which runs eslint + secretlint on staged files. If unrelated bypass (`HUSKY=0`) test passes the script silently.

---

## 4 · Soft-launch definition

Vercel env wiring is a yes/no gate, not a soft approval. Once the above checklist is fully checked, the app is launchable per:

- **Soft launch (recommended)**: post the frame in a private Warpcast channel (`/channels/wowowify-soft-launch`) with 10–30 trusted casters. Watch `/api/metrics` + `/api/logs` for 24h. Pivot issues into the next launch pass.
- **Public launch**: requires the soft-launch observation window to close without P0 / P1 issues.

Both launches are gated on this checklist, not on CI alone.

---

## 5 · When this checklist changes

Add new env vars here as they are introduced. Update `src/lib/env.ts` for any rename. Audit cadence: every quarter, even if no changes.
