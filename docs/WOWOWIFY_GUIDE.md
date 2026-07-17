# Wowowify — Agent Guide

> **Wowowify** is a [Persidian](https://persidian.com) agent for brand-safe campaign creative.  
> **Deploying?** See [DEPLOYMENT.md](./DEPLOYMENT.md) for the Studio + ASP split and custom domains (`wowowify.persidian.com` / `api.wowowify.persidian.com`).

## What is Wowowify?

Wowowify combines generative imagery with exact logo and text composition. AI generates the scene; **wowowify** composes your real mark and copy — never redrawn, never hallucinated.

Two production interfaces:

- **Studio** (humans): `https://wowowify.persidian.com` — create, refine, export
- **Agent API** (machines): `POST /api/agent` on the ASP host — same pipeline, returns `draftId` + `studioReviewUrl`

Bring-your-own-logo: pass `parameters.logoUrl`, upload via `POST /api/upload-logo`, or use `brandKitId` (demo: `demo-launch`).

Wallet / chain interaction is optional (x402, entitlements, provenance) — not required to create artwork.

See **[docs/MONETIZATION.md](./docs/MONETIZATION.md)** for cost guardrails, x402 pricing, and phased monetization after OKX traction.

## Agent API (primary integration)

Discover the capability card:

```bash
curl -s https://api.wowowify.persidian.com/.well-known/agent.json
# or current Vercel ASP host until DNS is wired
```

### Example request

```bash
curl -X POST https://api.wowowify.persidian.com/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Soft blue gradient launch background",
    "parameters": {
      "brandKitId": "demo-launch",
      "formats": ["square", "landscape", "portrait"],
      "text": {
        "content": "SHIPS TODAY",
        "position": "bottom",
        "style": "bold"
      }
    }
  }'
```

### Response fields

| Field | Meaning |
|---|---|
| `status` | `completed` \| `processing` \| `failed` |
| `assets[]` | Multi-format crops when `parameters.formats` is set |
| `draftId` | Persisted review record (7-day TTL) |
| `studioReviewUrl` | Human approval deep link in Studio |

Fetch draft: `GET /api/drafts/{id}`

### Logo

1. **HTTPS URL** — `parameters.logoUrl`
2. **Upload** — `POST /api/upload-logo` (multipart `logo`) → use returned URL

### OKX ASP registration

- **Discovery:** `GET /.well-known/agent.json`
- **Service:** `POST /api/agent`
- **Name:** Wowowify (Persidian)
- Tutorial: [okx.ai/tutorial/asp](https://www.okx.ai/tutorial/asp)

### Optional commerce

| Feature | Env | Notes |
|---|---|---|
| x402 paid calls | `X402_ENABLED`, `X402_NETWORK` | `X-PAYMENT` header |
| Entitlements | `ENTITLEMENT_NETWORK` | `POST /api/entitlements` |
| Provenance | `PROVENANCE_NETWORK` | Off-chain receipt by default |

## Farcaster (deferred)

Farcaster bot and Mini App integration is **paused** while ASP goes live on Persidian domains. Code paths under `/frames` and `/api/farcaster/webhook` remain for a future `@wowowify` (or similar) relaunch.

When re-enabled, cast syntax will follow the same command vocabulary as `POST /api/agent`.

## Community overlay presets

Legacy preset names (`higherify`, `scrollify`, `degenify`, etc.) remain in the composition engine as quick-start stamps. Primary workflow is **bring-your-own-logo** + brief.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Draft not found` | Ensure `REDIS_URL` is set on both Studio and ASP |
| Blob write failed | Use shared public Blob store — see DEPLOYMENT.md |
| Logo 404 on ASP | Static assets live on Studio URL (`STUDIO_URL/demo/…`) |

Legacy Farcaster command reference moved out of this guide; use the Agent API for all new integrations.
