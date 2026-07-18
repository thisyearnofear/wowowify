# Deployment guide — Studio + ASP split

Production runs as **two Vercel projects** from the same Git repo:

| Project | URL (current) | Target custom domain | `TOKA_DEPLOYMENT` | Role |
|---|---|---|---|---|
| `wowowify` | https://wowowify.vercel.app | https://wowowify.persidian.com | `studio` or `all` | Browser Studio, Mini App, admin |
| `wowowify-asp` | https://wowowify-asp.vercel.app | https://api.wowowify.persidian.com | `asp` | API-only agent service |

Use `vercel.asp.json` (sets `TOKA_DEPLOYMENT=asp`) as the **Root Directory / override** config for the ASP project in Vercel project settings, or maintain a duplicate project linked to the same repo with that file applied.

---

## Deploy rule: git-connected builds only (ASP)

**Do not** promote production on `wowowify-asp` via:

- `vercel redeploy …`
- `vercel deploy --prod` from a local checkout

Those CLI redeploys previously surfaced `MIDDLEWARE_INVOCATION_FAILED` at runtime even when the build showed **Ready**.

**Do** ship ASP changes with:

```bash
git push origin master   # GitHub → Vercel auto-build for both projects
```

If production is on a bad deployment, use the Vercel dashboard **Promote** action on the latest **git-connected** deployment (commit SHA visible), not a CLI redeploy artifact.

Studio (`wowowify`) tolerates git deploys normally; the ASP restriction is stricter because of middleware + split-config coupling.

---

## Shared Blob storage (`toka-blob`)

Both projects use one **public** Vercel Blob store (`toka-blob`, `store_s9IKHju2Z1m5gMx7`) so `put(…, { access: "public" })` in `src/lib/image-store.ts` succeeds on Studio and ASP.

### Linking the store to a second project

Vercel CLI `blob create-store` links one project at a time. To share a store:

1. Create the public store once (linked to ASP or Studio).
2. Copy `BLOB_READ_WRITE_TOKEN` and `BLOB_STORE_ID` from the linked project.
3. Add both vars to the **other** project (Production + Preview + Development).
4. Redeploy via **git push** so functions pick up env.

Or connect the same store to both projects in **Vercel Dashboard → Storage → toka-blob → Connect Project**.

### Verify Blob writes

```bash
# After deploy — expect status "completed" and a *.public.blob.vercel-storage.com URL
curl -s -X POST https://wowowify-asp.vercel.app/api/agent \
  -H "Content-Type: application/json" \
  -d '{"command":"Soft blue gradient launch background","parameters":{"brandKitId":"demo-launch","formats":["square"]}}'
```

Private stores + `access: "public"` fail with a Blob write error — migrate to a public store instead of changing access mode in code.

---

## Required env vars (split)

| Variable | Studio | ASP | Notes |
|---|---|---|---|
| `TOKA_DEPLOYMENT` | `studio` / `all` | `asp` | Gates middleware + routes |
| `STUDIO_URL` | `https://wowowify.persidian.com` (or Vercel fallback) | same | Demo kit static assets, review links |
| `ASP_URL` | `https://api.wowowify.persidian.com` (or Vercel fallback) | same | agent.json service URL |
| `NEXT_PUBLIC_APP_URL` | Studio URL | Studio URL | OG tags, client fallbacks |
| `NEXT_PUBLIC_ASP_URL` | ASP URL | optional | Builder strip copy links |
| `BLOB_READ_WRITE_TOKEN` | shared store token | shared store token | From linked `toka-blob` |
| `BLOB_STORE_ID` | `store_s9IKHju2Z1m5gMx7` | same | Required with OIDC on Vercel |
| `VENICE_API_KEY` | ✓ | ✓ | Image generation (fallback) |
| `RUNWARE_API_KEY` | ✓ | ✓ | Image generation (primary) |
| `RUNWARE_MODEL` | optional | optional | Default `runware:100@1` (FLUX Schnell) |
| `IMAGE_GEN_FALLBACK_ENABLED` | optional | optional | `false` disables Venice fallback when Runware fails |
| `REDIS_URL` | ✓ | ✓ | Drafts, brand kits, rate limits |
| `AGENT_RATE_LIMIT_MAX` | optional | optional | ASP: default 10/hr/IP on `/api/agent` |
| `AGENT_DAILY_MAX` | optional | optional | ASP: default 100 completed gens/day (UTC) |
| `X402_ENABLED` | optional | optional | `false` at launch; see [MONETIZATION.md](./MONETIZATION.md) |
| `X402_NETWORK` | optional | ✓ | Pre-wire: `x-layer` |
| `X402_PAYTO_ADDRESS` | optional | ✓ | Agentic Wallet EVM address |
| `X402_PRICE_USDC` | optional | ✓ | Suggested: `0.05` when enabling paid calls |

See also [VERCEL_ENV_CHECKLIST.md](./VERCEL_ENV_CHECKLIST.md) for smoke tests.

---

## Discovery URLs (OKX / ASP registration)

| Purpose | Target (after DNS) | Vercel fallback (until DNS) |
|---|---|---|
| Agent capability card | `https://api.wowowify.persidian.com/.well-known/agent.json` | `https://wowowify-asp.vercel.app/.well-known/agent.json` |
| Service endpoint | `https://api.wowowify.persidian.com/api/agent` | `https://wowowify-asp.vercel.app/api/agent` |
| Human review | `https://wowowify.persidian.com/?draftId={id}` | `https://wowowify.vercel.app/?draftId={id}` |

Register OKX ASP with the **target** URLs once DNS and env vars are wired. Use Vercel fallbacks for smoke tests before cutover.

---

## Local development

```bash
cp .env.example .env.local   # if present
vercel link --project wowowify
vercel env pull .env.local
```

ASP-only testing: link `wowowify-asp` and pull that project's env into a separate file — do not overwrite Studio `.env.local` with ASP pulls (CLI merges can clobber unrelated vars).
