# Vercel Env-Verification Checklist

**Run before flipping DNS / announcing the soft launch.** Each env var below is a known fixed dependency of a route in `src/app/api/`. Production fails LOUD if any required env is missing (see `src/lib/image-store.ts` for the loud-fail pattern), so a missing env surfaces as a 500 with a clear error message — not silent data loss.

---

## 1 · Confirm all 7 env vars are present in Vercel

Vercel dashboard → Project → Settings → Environment Variables. For each var below, verify:
- **Value** matches what the corresponding service expects
- **Scope** is `Production` (testnet is fine for soft launch)
- **Sensitive values** are NOT visible to anyone but Vercel

| # | Env var | Required for | Where to get it | Vercel dashboard status (✓ / ✗) |
|---|---------|--------------|-----------------|-------------------------------|
| 1 | `VENICE_API_KEY` | `/api/generate` (image generation) | https://venice.ai → API keys | |
| 2 | `NEYNAR_API_KEY` | `/api/farcaster/webhook` (cast mentioned) | https://neynar.com → Developer Portal → API keys | |
| 3 | `FARCASTER_BOT_FID` | `/api/farcaster/webhook` (bot identity) | Your bot's FID on Warpcast | |
| 4 | `FARCASTER_SIGNER_UUID` | `/api/farcaster/webhook` (publishing replies) | https://neynar.com → Signers | |
| 5 | `NEYNAR_WEBHOOK_SECRET` | `/api/farcaster/webhook` (HMAC signature) | Set when configuring webhook URL in Neynar dashboard | |
| 6 | `BLOB_READ_WRITE_TOKEN` | Image archive → Vercel Blob | https://vercel.com/dashboard → Storage → Create Blob store | |
| 7 | `UPSTASH_REDIS_REST_URL` | Rate-limit + history | https://console.upstash.com → Create Redis DB | |
| 8 | `UPSTASH_REDIS_REST_TOKEN` | Rate-limit + history | Same as above | |

---

## 2 · Smoke-test each motion surface against production

Each smoke test is one curl/click. Expected behavior is documented; deviations need patch before soft launch.

### 2.1 · Storage wiring (image archive)

```bash
curl -sI "https://wowowify.vercel.app/api/image?id=smoke-test-$RANDOM"
```

**Expected**: 404 (id doesn't exist, but route returns — meaning BLOB + dev-fallback wiring is healthy). 500 means BLOB_READ_WRITE_TOKEN isn't configured. 200 with bytes means the ID unexpectedly exists, but that's a benign pass-through.

### 2.2 · Webhook signature enforcement

```bash
# Valid path: missing signature → 401
curl -sI -X POST "https://wowowify.vercel.app/api/farcaster/webhook" \
  -H "Content-Type: application/json" -d '{}'
```

**Expected**: 401 (signature required in production per `verifyWebhookSignature()` in the route). 200 means the signature check is gated off — investigate before launch.

### 2.3 · Webhook happy-path (manual end-to-end)

In a Warpcast client connected to the @toka bot, post a cast mentioning `@toka lensify a mountain landscape` and confirm:
- Bot replies with "Processing..." within ~3 seconds
- Image arrives within ~30 seconds
- Image is correctly overlay-stamped

**Expected**: full flow. Any 500 between steps means a route failed — check `/_logs` (admin pages exist) or Vercel function logs.

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
