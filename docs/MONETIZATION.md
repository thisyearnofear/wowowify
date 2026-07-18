# Monetization & cost control — Wowowify ASP

Wowowify is listed on OKX.AI as **A2MCP / API service / 0 USDT** while we prove demand. This doc covers **cost guardrails now** and **revenue paths after traction**.

---

## Current state (launch)

| Layer | Setting |
|---|---|
| OKX listing | **#6462** — free (0 USDT), listing under review |
| x402 | **Off** (`X402_ENABLED` unset / false) |
| ASP rate limit | **10 req/hour/IP** (default on `TOKA_DEPLOYMENT=asp`) |
| Daily cap | **100 completed generations/day** (ASP default) |
| Studio | **20 req/hour/IP**, no daily cap |

Every free marketplace call still costs **Runware/Venice + Vercel compute** — guardrails limit runaway spend, not unit economics.

---

## Your COGS (cost of goods sold)

| Input | Typical driver |
|---|---|
| **Venice API** | Dominant — one image generation per agent run |
| **Vercel ASP** | ~2–3 min serverless time per full kit |
| **Vercel Blob** | Stored PNG URLs (public, persistent) |
| **Upstash** | Drafts + rate limits + usage counters (free tier → pay-as-you-go) |

**Monitor:**

```bash
# Usage snapshot (includes completed generations today)
curl -s https://api.wowowify.persidian.com/api/metrics | jq '.agentUsage'
```

Set a **Venice dashboard spend alert** manually (Venice console) — the repo cannot do this for you.

### Image generation reliability

| Provider | Role | Model | ~Cost @ 512² |
|---|---|---|---|
| **Runware** | Primary | `runware:100@1` (FLUX Schnell) | ~$0.0006 |
| **Venice** | Fallback | `venice-sd35` | ~$0.02–0.05 (verify dashboard) |
| Runware alt | Faster / prompt-tight | `prunaai:1@1` (P-Image) | ~$0.0044 @ 1024² |

Pipeline: `generateImageWithFallback()` tries Runware first; on failure uses Venice when `VENICE_API_KEY` is set. Set `IMAGE_GEN_FALLBACK_ENABLED=false` to disable fallback.

**Runware wallet:** API key auth works before credits are loaded; generations return `Insufficient credits` until you top up at [my.runware.ai/wallet](https://my.runware.ai/wallet).

Other Runware models worth knowing (not wired as defaults):

| Model ID | Best for | Price signal |
|---|---|---|
| `runware:101@1` | FLUX Dev — higher quality, slower | Higher than Schnell |
| `recraft:v4.1-pro@0` | Brand/design polish, logos | ~$0.21 / image |
| `xai:grok-imagine@image-quality` | Premium creative | ~$0.05 / image |

For Wowowify campaign **backgrounds** (logo composited separately), FLUX Schnell is the right fallback: fast, cheap, no embedded text.

---

## Env vars (ASP production)

| Variable | Launch value | Purpose |
|---|---|---|
| `AGENT_RATE_LIMIT_MAX` | `10` | Per-IP hourly cap on `POST /api/agent` |
| `AGENT_RATE_LIMIT_WINDOW` | `3600` | Window seconds (default 1h) |
| `AGENT_DAILY_MAX` | `100` | Global completed generations per UTC day |
| `X402_ENABLED` | `false` | Keep off until you flip monetization |
| `X402_NETWORK` | `x-layer` | Pre-wire for OKX Payment SDK |
| `X402_PAYTO_ADDRESS` | Agentic Wallet EVM address | Where USDC lands |
| `X402_PRICE_USDC` | `0.05` | Suggested starting price (multi-format kits) |
| `ADMIN_API_KEY` | secret | Bypass rate limits for your own demos |

Trusted callers can send `x-api-key: $ADMIN_API_KEY` for higher throughput during sales demos.

---

## Monetization phases

### Phase 0 — Prove demand (now → OKX approval)

- **Price:** free on OKX + free API
- **Goal:** listing approval, 10–50 successful agent calls from real users/agents
- **Metrics:** OKX `soldCount`, `/api/metrics` completions, Venice spend
- **Guardrails:** daily cap 100, 10/hr/IP — raise only when you intend to subsidize more

### Phase 1 — Soft paywall (first traction)

**Trigger:** ~500+ successful off-OKX calls/month OR Venice > $50/mo OR abuse signals.

1. Enable x402 on ASP only:
   ```bash
   X402_ENABLED=true
   X402_NETWORK=x-layer
   X402_PAYTO_ADDRESS=0x5e32740122999bb98a50055d68593f94d2a0711e
   X402_PRICE_USDC=0.05
   ```
2. Update OKX service fee from `0` → `0.05` via `onchainos agent update` (keep endpoint same)
3. Keep **10 free calls/day** option: raise `AGENT_DAILY_MAX` and exempt paid x402 calls (future enhancement) OR offer a separate demo API key

**Pricing anchor:** multi-format campaign kit ≈ one Venice gen + composition → **$0.05–0.15 USDT** per call if Venice ≈ $0.02–0.05.

### Phase 2 — Tiered SKUs (proven OKX volume)

| SKU | Delivery | Price idea |
|---|---|---|
| **Single format** | `formats: ["square"]` | 0.03 USDT |
| **Campaign kit** | square + landscape + portrait | 0.08 USDT |
| **Brand kit + review** | + `draftId` / Studio link | bundled in kit price |

Implementation paths:

- **One endpoint, price by `parameters.formats`** (simplest — extend x402 check)
- **Multiple OKX services** on same ASP (#6462) — one A2MCP entry per SKU
- **A2A escrow jobs** for custom brand retainers (high ticket, manual scope)

### Phase 3 — Enterprise / Persidian portfolio

- **Private API keys** per customer (`x-api-key` + higher limits)
- **Dedicated brand kits** in Redis with SLA
- **Off-chain provenance receipts** (`POST /api/provenance`) as upsell for compliance teams
- **Studio seats** — human approval workflow (not chain-gated today)

---

## Unit economics cheat sheet

Assume Venice **$0.03** per generation (verify in your dashboard):

| Price/call | 1,000 calls/mo revenue | Est. Venice COGS | Gross before Vercel |
|---|---|---|---|
| $0 (now) | $0 | ~$30 | **−$30** |
| $0.05 | ~$50 | ~$30 | ~$20 |
| $0.10 | ~$100 | ~$30 | ~$70 |

Multi-format is **not** 3× Venice (one gen + crops) — price the **kit**, not the pixel.

---

## When to flip x402 (decision checklist)

- [ ] OKX listing **approved**
- [ ] 7-day average **>20 completions/day** without you driving every call
- [ ] Venice line item **predictable** (you know $/image)
- [ ] `X402_PAYTO_ADDRESS` funded / receipt tested with `X402_STUB_ACCEPT=true` on preview
- [ ] OKX service fee updated to match `X402_PRICE_USDC`
- [ ] `AGENT_DAILY_MAX` raised or removed for paid callers

---

## x402 smoke test (preview / before flip)

```bash
# Should return 402 + x402 challenge when enabled
curl -s -X POST https://api.wowowify.persidian.com/api/agent \
  -H "Content-Type: application/json" \
  -d '{"command":"test","parameters":{"brandKitId":"demo-launch","formats":["square"]}}' | jq .

# Dev bypass (preview only — never in production)
X402_STUB_ACCEPT=true
X402_DEV_TOKEN=your-test-token
# curl -H "X-PAYMENT: your-test-token" ...
```

Full OKX Payment SDK verification is required for production paid calls — stub is for wiring tests only.

---

## What not to do early

- **A2A escrow** before A2MCP volume — ops-heavy (negotiation, disputes, 5% arbitration deposit)
- **NFT / mint every PNG** — no entitlement story; breaks enterprise positioning
- **Unlimited free API** after OKX approval — Venice bill scales linearly
- **Underpricing** below Venice COGS to “win marketplace” — OKX `soldCount` ≠ profit

---

## Related

- [WOWOWIFY_GUIDE.md](./WOWOWIFY_GUIDE.md) — API contract
- [DEPLOYMENT.md](./DEPLOYMENT.md) — env wiring
- [VERCEL_ENV_CHECKLIST.md](./VERCEL_ENV_CHECKLIST.md) — smoke tests
