# AGENTS.md — wowowify contributor guide

Single source of truth for how humans and AI agents collaborate on this codebase. If you find yourself repeating a rule, add it here.

## Core principles (enforced)

1. **ENHANCEMENT FIRST** — extend existing components before creating new ones.
2. **CONSOLIDATION** — delete code, never deprecate it (deprecation = debt).
3. **PREVENT BLOAT** — auditing > features.
4. **DRY** — single source of truth (`src/lib/env.ts` is the canonical APP_URL/APP_ORIGIN/IS_PRODUCTION home; `src/lib/web3/config.ts` owns the Wagmi chain list + ConnectKit theme; never hardcode literals in components or routes).
5. **CLEAN** — explicit dependencies, no hidden coupling via globals.
6. **MODULAR** — small, independently-testable units.
7. **PERFORMANT** — Vercel cold starts matter; prefer fire-and-return over polling.
8. **ORGANIZED** — domain-driven directory layout (commands, services, components, providers, ui).

## Bot name

**`@toka`** is the canonical name across the UI, webhook help text, Frame API embed, scripts/intro casts, and user-facing docs. Do not use "Snel" anywhere new — historical references in `docs/`, code comments, and `README.md` quickstart should remain `@toka`.

## Pre-commit hooks (active)

Every commit runs **`lint-staged`** via `.husky/pre-commit`:

| Staged file pattern | Command |
|---|---|
| `*.{js,jsx,ts,tsx,mjs}` | `eslint --fix` (flat config: `eslint.config.mjs`) |
| All staged text files | `secretlint` (rules preset: aws / gcp / github tokens / private keys / npm tokens) |

**Escape hatches** (use sparingly — every `--no-verify` is a CI signal):
- `HUSKY=0 git commit ...` — skip the hook entirely
- `git commit --no-verify` — same, single-shot
- `SKIP_LINT_STAGED=1` — skip lint-staged only

**Why secretlint?** Catches AWS keys (AKIA…), GCP API keys (AIza…), GitHub PATs (ghp_/gho_/ghu_/ghs_/ghr_), PEM private keys, and `.npmrc` tokens before they reach the remote. Public-safe files (`package-lock`, `bun.lock`, `public/.well-known/farcaster.json`, test fixtures under `scripts/`) are in `.secretlintrc.json` `ignores`.

## Supply-chain safety

We use **Socket firewall** to wrap installs:

```bash
npm run install:safe            # == socket npm install (uses local @socketsecurity/cli)
npm run socket -- <args>        # pass-through for anything Socket supports
npm run vercel-install          # build-time install; uses Socket + legacy peer deps
```

`install:safe`, `vercel-install`, and `socket` all flow through `@socketsecurity/cli` which scans the dependency graph for known-malicious / suspicious packages before they're written to `package-lock.json`.

## Validation matrix

| Check | When | Command |
|---|---|---|
| TypeScript | Precommit (CI only) → CI | `npm run validate:types` |
| ESLint | Precommit (staged only) | `npm run lint`, `npm run lint:fix` |
| Secretlint | Precommit (staged only) | `npm run secrets:scan` |
| Vitest | Precommit skipped (CI only) | `npm run test` |
| Full precommit suite | CI | `npm run validate` |

`npm run validate` is what CI runs — use it locally before opening a PR.

## File ownership (DRY)

| Concern | Single source |
|---|---|
| `APP_URL`, `APP_ORIGIN`, `IS_PRODUCTION`, `APP_ICON_URL` | `src/lib/env.ts` |
| Wagmi chain list + RPC transports + ConnectKit theme | `src/lib/web3/config.ts` |
| `/api/replicate` ↔ castHash bookkeeping | `src/lib/predictions.ts` |
| Toast surface | `src/components/ui/Toast.tsx` (`useToast()` hook) |
| HMAC verification | `crypto.timingSafeEqual` with length guard — never `===` |
| Replicate fire-and-return | `src/lib/services/ghibli-service.ts` (Replicate webhooks ack via `/api/replicate/webhook`) |
| Overlay config (SVGs, blend modes) | `src/lib/config/overlays.ts` |
| Farcaster MiniApp context | `src/lib/miniapp.ts` (`getUserContext`, `isInMiniApp`) |
| Rate limiter | `src/lib/rate-limiter.ts` |

If you find yourself importing the same boilerplate in two files, the third file is the trigger to consolidate.

## House style

- **Imports**: `@/lib/...` for internal; `zustand`-style order: external, internal, types.
- **Logging**: always via `logger` from `@/lib/logger`; never `console.log` in route handlers.
- **Errors**: throw typed errors (`RedisUnavailableError` etc.); outer catch logs + appropriate HTTP status. Never use `alert()` in components — `useToast().showError(...)` instead.
- **Object URLs**: track in `useRef<Set<string>>` and revoke on unmount + mode swap.

## Don't

- Don't reimplement providers split across multiple files (we have one `providers/Web3Provider.tsx`).
- Don't hardcode URLs — import from `@/lib/env`.
- Don't bring back the 10-minute self-recursive Replicate poll — it's forbidden by Vercel function timeouts.
- Don't `console.error` in production routes — use `logger.error` with structured context.
