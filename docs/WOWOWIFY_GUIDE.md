# Wowowify — Agent Guide

> **Wowowify Brand Kit v1** is a [Persidian](https://persidian.com) agent for brand-exact, multi-format campaign production.  
> **Deploying?** See [DEPLOYMENT.md](./DEPLOYMENT.md) for the Studio + ASP split and custom domains (`wowowify.persidian.com` / `api.wowowify.persidian.com`).

## What is Brand Kit v1?

**Upload once. Every call returns on-brand kits.**

A Brand Kit stores your **logo URL**, **placement controls**, **campaign copy defaults**, and **output formats**. Studio and agents reference the same `brandKitId` — so launch pipelines, OKX agents, and human reviewers share one brand contract.

ChatGPT can generate a picture. Wowowify ships **publication-ready campaign kits**:

- **Brand-exact** — your real logo composited, never AI-redrawn  
- **Multi-format** — square, landscape, portrait from one pipeline  
- **Agent-callable** — `POST /api/agent` with `parameters.brandKitId`  
- **Human review** — every run can end with `studioReviewUrl`  
- **Optional provenance** — receipt tying asset → brief → kit → logo  

Two production interfaces:

- **Studio** (humans): `https://wowowify.persidian.com` — load/save kits, wowowify, refine, export  
- **Agent API** (machines): `POST /api/agent` on the ASP host — same kit contract, returns `draftId` + `studioReviewUrl`

Demo kit: `demo-launch` (three formats, bundled logo on Studio).

Wallet / chain interaction is optional (x402, entitlements, provenance) — not required to create artwork.

See **[docs/MONETIZATION.md](./MONETIZATION.md)** for cost guardrails, x402 pricing, and phased monetization after OKX traction.

## Agent API (primary integration)

Discover the capability card:

```bash
curl -s https://api.wowowify.persidian.com/.well-known/agent.json
# or current Vercel ASP host until DNS is wired
```

The card includes a top-level `brandKit` object — guarantees, endpoints, and demo id.

### Example request (Brand Kit v1)

```bash
curl -X POST https://api.wowowify.persidian.com/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Soft blue gradient launch background",
    "parameters": {
      "brandKitId": "demo-launch",
      "formats": ["square", "landscape", "portrait"]
    }
  }'
```

Logo and copy come from the kit unless you override with `parameters.logoUrl` or `parameters.text`.

### Brand Kit API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/brand-kits` | List saved kits (+ demo seed) |
| `GET` | `/api/brand-kits/{id}` | Load one kit |
| `POST` | `/api/brand-kits` | Save kit from Studio (name, logoUrl, text, controls, formats) |

### Response fields

| Field | Meaning |
|---|---|
| `status` | `completed` \| `processing` \| `failed` |
| `assets[]` | Multi-format crops when `parameters.formats` is set |
| `draftId` | Persisted review record (7-day TTL) |
| `studioReviewUrl` | Human approval deep link in Studio |

Fetch draft: `GET /api/drafts/{id}`

### Logo overrides

1. **Brand Kit** — `parameters.brandKitId` (preferred)  
2. **HTTPS URL** — `parameters.logoUrl`  
3. **Upload** — `POST /api/upload-logo` (multipart `logo`) → use returned URL in kit or request  

### OKX ASP registration

- **Discovery:** `GET /.well-known/agent.json`
- **Service:** `POST /api/agent`
- **Positioning:** Brand Kit v1 — agent-callable campaign production (not generic image gen)
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

Legacy preset names (`higherify`, `scrollify`, `degenify`, etc.) remain in the composition engine as quick-start stamps. Primary workflow is **Brand Kit** + brief.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Draft not found` | Ensure `REDIS_URL` is set on both Studio and ASP |
| Blob write failed | Use shared public Blob store — see DEPLOYMENT.md |
| Logo 404 on ASP | Static assets live on Studio URL (`STUDIO_URL/demo/…`) |

Legacy Farcaster command reference moved out of this guide; use the Agent API for all new integrations.
