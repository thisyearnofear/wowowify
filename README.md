# Wowowify — Persidian Agent

**Wowowify** turns an exact logo and a creative brief into publication-ready social artwork. AI generates the scene; you **wowowify** your mark onto it — composited exactly, never redrawn.

Part of **[Persidian](https://persidian.com)** — enterprise AI agents for teams.

## Product Vision

Autonomous agents can write announcements and plan campaigns, but generative image models are unreliable at exact logos, typography, and brand placement. Wowowify is the brand-safe production layer between a campaign brief and finished creative:

1. Generate a visual or start from an existing image.
2. Wowowify your original logo without regenerating or distorting it.
3. Control placement, scale, tint, opacity, and campaign copy.
4. Return a persistent asset that an agent can publish or hand to a human reviewer.

## Product Strategy

One creative engine, two interfaces:

- **Studio** (`wowowify.persidian.com`) — humans create, refine, and export.
- **Agent API** (`api.wowowify.persidian.com`) — agents call the same contract via A2MCP.

Agents return `studioReviewUrl` so collaborators approve in Studio. Farcaster distribution is deferred until ASP is live on custom domains.

The product promise: AI creates the visual world; **Wowowify** preserves the exact logo, campaign copy, and composition rules.

## Ecosystem & commerce (chain-agnostic)

Wowowify is **chain-agnostic by design**. Generation, composition, drafts, and human approval work without a wallet.

Optional onchain layers are **deployment-specific** — configure env vars per marketplace or partner:

| Concern | Env var | Example (OKX AI) |
|---|---|---|
| Paid agent calls (x402) | `X402_ENABLED`, `X402_NETWORK`, `X402_PAYTO_ADDRESS` | `X402_NETWORK=x-layer` |
| Delivery / entitlement receipt | `ENTITLEMENT_NETWORK` | `ENTITLEMENT_NETWORK=x-layer` |
| Campaign provenance label | `PROVENANCE_NETWORK` | `PROVENANCE_NETWORK=offchain` (default) |

**OKX AI ASP** is the primary agent marketplace integration path: register as **A2MCP** with `GET /.well-known/agent.json` and `POST /api/agent`. See [okx.ai/tutorial/asp](https://www.okx.ai/tutorial/asp). Free endpoints return results directly; paid endpoints use x402 (OKX Payment SDK on your chosen network).

We do not mint every image or force users through a wallet flow. Onchain actions must represent a concrete entitlement, payment, or verifiable delivery event — never “mint this PNG.”

Future deployments on other chains (e.g. Lisk) reuse the same ASP contract; only commerce env vars and marketplace registration change.

## Delivery Roadmap

1. Ship the human Studio and public brand-safe A2MCP service from the same composition contract.
2. Add saved brand kits and multi-format campaign output.
3. Let agents create drafts that open in Studio for human approval.
4. Add paid agent usage through ACP/x402 and optional entitlement receipts (network via env).
5. Add campaign provenance receipts where customers need verifiable delivery metadata.

## Deployment Boundary

The Studio and the public ASP share composition logic, but do not need the same runtime dependencies. The Studio keeps optional distribution integrations such as the Farcaster Mini App. The ASP deployment stays dependency-minimal and contains only the API route, composition services, storage, rate limiting, and observability required to produce brand-safe creative reliably. This keeps agent availability independent from optional client integrations.

### Split deploy (production)

See **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** for the full runbook: shared public Blob store (`toka-blob`), git-only ASP deploys (avoid CLI `vercel redeploy`), and env wiring.

| Variable | Studio | ASP |
|---|---|---|
| `TOKA_DEPLOYMENT` | `studio` or `all` (default) | `asp` |
| `ASP_URL` | public ASP host (for agent.json) | this deployment's URL |
| `STUDIO_URL` | this deployment's URL | public Studio host |

Point `GET /.well-known/agent.json` → `endpoints.service` at the ASP host. Humans open drafts on `STUDIO_URL/?draftId=…`.

Use `vercel.asp.json` (sets `TOKA_DEPLOYMENT=asp`) for a minimal ASP Vercel project. Studio keeps frames, Mini App, and admin history.

**Farcaster SDK note:** `@farcaster/miniapp-sdk@0.3.0` is the current release. Socket currently flags a UUID dependency introduced by its optional Solana/Jayson transitive path. Do not downgrade the SDK, force a cross-major UUID override, or disable Socket; keep the Mini App in the Studio deployment and exclude it from the focused ASP runtime.

## Quick Start

See **[docs/WOWOWIFY_GUIDE.md](./docs/WOWOWIFY_GUIDE.md)** for Agent API examples, OKX ASP registration URLs, and deployment notes.

## Agent Integration

External agents can generate brand-safe artwork without interacting with the UI. A custom `logoUrl` takes precedence over a preset `overlayMode`, ensuring the supplied mark is composited exactly as provided.

`GET /api/agent` returns the service capability card for discovery. `POST /api/agent` creates the asset.

```bash
# Generate campaign artwork and preserve the supplied logo
curl -X POST https://your-app.com/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Generate a futuristic launch visual",
    "parameters": {
      "logoUrl": "https://example.com/brand-logo.png",
      "text": {
        "content": "THE FUTURE SHIPS TODAY",
        "position": "bottom",
        "style": "bold"
      },
      "controls": {
        "scale": 0.5,
        "x": 0,
        "y": -40
      },
      "formats": ["square", "landscape", "portrait"]
    }
  }'
```

When `formats` is supplied, Wowowify generates the visual world once, then returns an `assets` array with deterministic crops and logo/text composition for each requested format.

The agent understands commands like:

- "Generate an image of [description]"
- "Apply the [style] overlay" (styles: degenify, higherify, scrollify, lensify, higherise, dickbuttify, nikefy, nounify, baseify, clankerify, mantleify, ghiblify)
- "Generate an image without overlay" (wowowify mode — AI image only, no stamp overlay)
- "Position at [x], [y]"
- "Scale to [size]"
- "Set color to [color]"
- "Set opacity to [value]"
- "Add text [content]"
- "Text position [position]"
- "Text size [size]"
- "Text color [color]"
- "Text style [style]"

### Text Commands

To add text to images, use the following command syntax:

```
Generate a beach sunset --text "Summer Vibes" --text-position bottom --text-size 48 --text-color blue
```

The text commands use a clear, flag-based syntax that's easy to understand:

- `--text "Your text here"` - Adds text to the image
- `--text-position [position]` - Sets the position (top, bottom, left, right, center, etc.)
- `--text-size [size]` - Sets the font size
- `--text-color [color]` - Sets the text color
- `--text-style [style]` - Sets the text style (serif, monospace, handwriting, thin, bold)

You can also use `--caption` as an alternative to `--text`:

```
Generate a mountain landscape --caption "Adventure Awaits" --caption-position bottom --caption-size 60
```

This flag-based approach ensures that text parameters are clearly separated from other commands and won't be misinterpreted.

### Text Overlay System

The text overlay system provides robust text rendering capabilities with the following features:

#### Font Support

- **Default Font**: Roboto (sans-serif)
- **Font Families**:
  - Sans-serif: Roboto (default)
  - Serif: System serif font
  - Monospace: Roboto Mono
  - Handwriting: Fallback to Roboto with stylistic adjustments

#### Text Positioning

- **Predefined Positions**:
  - `top`: Aligns text at the top center of the image
  - `bottom`: Aligns text at the bottom center of the image
  - `center`: Centers text both horizontally and vertically
  - `left`: Aligns text at the left center of the image
  - `right`: Aligns text at the right center of the image
  - `top-left`: Positions text at the top left corner
  - `top-right`: Positions text at the top right corner
  - `bottom-left`: Positions text at the bottom left corner
  - `bottom-right`: Positions text at the bottom right corner
- **Custom Positioning**: Supports exact x,y coordinates for precise placement

#### Text Styling

- **Font Size**: Any numeric value (default: 48px)
- **Font Weight**: normal or bold
- **Text Color**: Any valid color name or hex code
- **Text Alignment**: left, center, or right
- **Background**: Optional colored background behind text
- **Padding**: Adjustable padding around text
- **Line Height**: Configurable line spacing for multi-line text
- **Text Wrapping**: Automatic wrapping for long text to fit within image boundaries
- **Rotation**: Optional text rotation in degrees

#### Advanced Text Effects

- **Stroke/Outline**: Add outlines to text for better visibility
- **Shadow Effects**: Add drop shadows with configurable:
  - Shadow color
  - Shadow offset (X and Y)
  - Shadow blur radius
- **Adaptive Sizing**: Automatically adjusts font size to fit available space

#### Implementation Details

- **Font Registration**: Fonts are bundled with the application and registered at runtime
- **Serverless Compatibility**: Optimized for Vercel serverless environment
- **Error Handling**: Graceful fallbacks if specific fonts aren't available
- **Performance**: Efficient text rendering even with complex styling

### Structured Command Format

For more complex commands, you can still use a structured format with section markers, but the flag-based syntax is recommended for text parameters:

```
[PROMPT]: beach sunset
[OVERLAY]: scrollify, scale 0.5, position 10 20
--text "Summer Vibes" --text-position bottom --text-size 48 --text-color blue
```

Alternative formats are also supported:

```
PROMPT: beach sunset
OVERLAY: scrollify, scale 0.5, position 10 20
--text "Summer Vibes" --text-position bottom --text-size 48 --text-color blue
```

Or even more concise:

```
beach sunset.
WOWOW: scrollify, scale 0.5, opacity 0.4.
--caption "stunning" --caption-position bottom --caption-style handwriting
```

This structured approach helps avoid confusion between different parts of the command and ensures that text parameters aren't misinterpreted.

### Text Customization Options

When adding text to images, you can customize:

- **Position**: top, bottom, left, right, center, top-left, top-right, bottom-left, bottom-right
- **Size**: Any numeric value (e.g., size 48)
- **Color**: Any color name or hex code (e.g., color blue, color #FF5500)
- **Style**: serif, monospace, handwriting, thin, bold
- **Background**: Optional background color with transparency (e.g., rgba(0,0,0,0.5))
- **Effects**: Stroke/outline and shadow effects for better visibility

Example:

```
[PROMPT]: mountain landscape
[TEXT]: Adventure Awaits, bottom, size 60, color white, style bold
```

You can also provide structured parameters to override NLP extraction:

```json
{
  "command": "Generate a futuristic city",
  "parameters": {
    "overlayMode": "degenify",
    "controls": {
      "scale": 1.2,
      "x": 0,
      "y": 0,
      "overlayColor": "#ffffff",
      "overlayAlpha": 0.8
    },
    "text": {
      "content": "FUTURE CITY",
      "position": "bottom",
      "fontSize": 48,
      "color": "white",
      "style": "bold",
      "backgroundColor": "rgba(0,0,0,0.5)"
    }
  }
}
```

### Text Overlay Examples

Here are some examples of text overlay commands:

1. **Simple Caption**:

   ```
   Generate a beach sunset --text "Summer Vibes"
   ```

2. **Positioned Text**:

   ```
   Generate a mountain landscape --text "ADVENTURE" --text-position top
   ```

3. **Styled Text**:

   ```
   Generate a cityscape --text "METROPOLIS" --text-position bottom --text-size 72 --text-color white --text-style bold
   ```

4. **Text with Background**:

   ```
   Generate a forest scene --text "NATURE" --text-position center --text-color white --text-background-color "rgba(0,0,0,0.7)"
   ```

5. **Multiple Text Elements** (using structured format):
   ```json
   {
     "command": "Generate a beach scene",
     "parameters": {
       "text": {
         "content": "PARADISE",
         "position": "top",
         "fontSize": 60,
         "color": "white"
       },
       "secondaryText": {
         "content": "Summer 2024",
         "position": "bottom-right",
         "fontSize": 24,
         "color": "white",
         "style": "italic"
       }
     }
   }
   ```

## Features

- AI image generation (Venice AI) from a campaign brief
- Exact logo composition — brand marks are never redrawn by the model
- Campaign copy overlay (position, size, color, style)
- Community preset stamps (degenify, higherify, scrollify, etc.) as quick-start shortcuts
- Multi-format campaign kits via `parameters.formats` (square, landscape, portrait)
- Studio (browser), Command page, Farcaster bot, and `POST /api/agent` on one composition contract
- Rate limiting, Redis-backed history, Vercel Blob persistence, structured logging
- Optional Grove storage for Farcaster bot replies
- AI style transforms (ghiblify via Replicate)

## Environment Setup

The application requires the following environment variables:

```bash
VENICE_API_KEY=your_venice_api_key
REDIS_URL=rediss://<user>:<token>@<host>.upstash.io:6379
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token  # Required for production image persistence
NEYNAR_API_KEY=your_neynar_api_key
NEYNAR_WEBHOOK_SECRET=your_neynar_webhook_secret
FARCASTER_BOT_FID=your_bot_fid
FARCASTER_SIGNER_UUID=your_farcaster_signer_uuid
NEXT_PUBLIC_ADMIN_PASSWORD=your_admin_password  # Optional, defaults to "wowowify"

# ASP / Studio split (optional)
TOKA_DEPLOYMENT=all          # all | asp | studio
ASP_URL=https://your-asp-host
STUDIO_URL=https://your-studio-host

# Optional commerce — chain-agnostic; set per marketplace deployment
X402_ENABLED=false
X402_NETWORK=                # e.g. x-layer for OKX AI
X402_PAYTO_ADDRESS=
X402_PRICE_USDC=0.01
ENTITLEMENT_NETWORK=           # e.g. x-layer when recording delivery receipts
PROVENANCE_NETWORK=offchain    # label on provenance receipts

# Pre-launch hardening walkthrough: see docs/VERCEL_ENV_CHECKLIST.md.
```

You can obtain these from:

- Venice AI API key: [Venice AI Dashboard](https://venice.ai)
- Upstash Redis: [Upstash Console](https://console.upstash.com) — copy the **Redis URL** (`rediss://…`) into `REDIS_URL`
- Vercel Blob token: [Vercel Blob Dashboard](https://vercel.com/dashboard/stores) — create a Blob store and copy the read/write token
- Neynar API key: [Neynar Developer Portal](https://neynar.com)
- Webhook secret: set when configuring webhook URL in Neynar dashboard

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with your environment variables
4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Endpoints

### POST /api/generate

Generate an AI image with the following parameters:

```json
{
  "prompt": "your image description",
  "model": "stable-diffusion-3.5" | "fluently-xl",
  "hide_watermark": boolean
}
```

Rate limits:

- 20 requests per hour per IP
- Response headers include rate limit information

### POST /api/agent

Process natural language commands to generate and manipulate images:

```json
{
  "command": "your natural language command",
  "parameters": {
    "baseImageUrl": "optional URL to an existing image",
    "logoUrl": "optional public HTTP(S) URL for an exact custom logo; overrides overlayMode",
    "prompt": "optional prompt to override NLP extraction",
    "overlayMode": "degenify" | "higherify" | "wowowify" /* no overlay stamp, AI image only */ | "scrollify" | "lensify" | "higherise" | "dickbuttify" | "nikefy" | "nounify" | "baseify" | "clankerify" | "mantleify" | "ghiblify",
    "controls": {
      "scale": 1.2,
      "x": 0,
      "y": 0,
      "overlayColor": "#ffffff",
      "overlayAlpha": 0.8
    }
  },
  "callbackUrl": "optional URL for async processing"
}
```

Response:

```json
{
  "id": "unique_request_id",
  "status": "processing" | "completed" | "failed",
  "resultUrl": "URL to the processed image (Blob URL or /api/image?id=...)",
  "previewUrl": "URL to a preview of the processed image (Blob URL or /api/image?id=...)",
  "error": "Error message if status is failed",
  "groveUri": "Optional Grove URI for lensify overlay",
  "groveUrl": "Optional Grove URL for lensify overlay"
}
```

Rate limits:

- 20 requests per hour per IP
- Response headers include rate limit information

## Deployment

The application is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Deployment Considerations

When deploying to Vercel or other serverless environments, keep these important points in mind:

1. **Serverless Function Timeouts**:

   - Vercel functions have a default timeout of 10 seconds (Hobby plan) or 60 seconds (Pro plan)
   - Our application implements its own timeout handling to prevent hanging requests
   - If you experience timeouts, consider upgrading to a Pro plan

2. **Image Storage**:

   - When `BLOB_READ_WRITE_TOKEN` is set, images are stored in **Vercel Blob** for persistent, serverless-friendly storage
   - Without the Blob token, images fall back to in-memory storage (ephemeral — lost on cold starts, dev-only)
   - The `/api/image` endpoint uses a 3-tier lookup: in-memory Blob tracking → in-memory store → Redis history redirect
   - All image IDs (requestId, resultId, previewId) are stored in Redis-backed image history for URL resolution after cold starts
   - Users should download images they want to keep when running without Blob storage

3. **Error Handling**:

   - The application implements robust error handling for API responses
   - Frontend code checks content types before parsing JSON
   - Detailed error messages are provided to help diagnose issues

4. **Architecture Notes**:

   - The agent route directly calls the Venice API to reduce API hops
   - Overlay images are loaded from public URLs rather than the filesystem
   - All image processing happens within a single serverless function

5. **Troubleshooting**:
   - If you see "Unexpected token" errors, it's likely a JSON parsing issue
   - Check that all API responses are properly formatted as JSON
   - Ensure timeouts are properly handled with AbortController
   - Verify that all environment variables are correctly set in Vercel


## Storage

- **Production**: Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set
- **Farcaster bot**: optional Grove uploads for persistent cast reply links (see [docs/archive/LEGACY_WEB3.md](./docs/archive/LEGACY_WEB3.md) for historical Web3/NFT integration notes)

## Farcaster Integration (deferred)

Farcaster bot and Mini App distribution are **deferred** until Wowowify ASP is live on custom domains (`api.wowowify.persidian.com`). The Studio still ships `/frames` and webhook routes for a future relaunch.

When re-enabled:

- Bot webhook: `cast.created` → `/api/farcaster/webhook`
- Mini App: `/frames` (campaign brief + export without leaving Warpcast)
- Setup: Neynar API key, signer UUID, webhook secret — see [WOWOWIFY_GUIDE.md](./docs/WOWOWIFY_GUIDE.md)

Natural-language commands use the **wowowify** verb (e.g. "wowowify a mountain landscape with higherify") instead of a Farcaster handle mention.

## Ghibli Style Integration

The application now includes a Ghibli-style transformation feature powered by the Replicate API. This allows users to transform their images into a Studio Ghibli-inspired art style.

### How It Works

1. When a user requests an image with the "ghiblify" overlay, the application sends the image to the Replicate API
2. The API processes the image using a pre-trained model that applies the Ghibli art style
3. The transformed image is then stored on Grove (if a wallet address is provided)
4. The result is returned to the user with both the direct URL and Grove URL (if available)

### Using Ghiblify

You can use the ghiblify feature in several ways:

1. **Through the Agent API or Studio** — use `overlayMode: "ghiblify"` in `POST /api/agent`, or pick the ghiblify preset in Studio.

2. **Through Farcaster (when relaunched)**:

   ```
   wowowify this image with ghiblify
   ```

   When replying to a cast with an image, or:

   ```
   wowowify a mountain landscape with ghiblify
   ```

   To generate and transform a new image

3. **Through the API**:
   ```json
   {
     "command": "ghiblify this image",
     "parameters": {
       "baseImageUrl": "https://example.com/image.jpg",
       "overlayMode": "ghiblify"
     }
   }
   ```

### Setup

1. Get a Replicate API token from [replicate.com](https://replicate.com)
2. Add the token to your environment variables:
   ```bash
   REPLICATE_API_TOKEN=your_replicate_api_token
   ```

### Technical Details

The ghiblify feature uses the following Replicate model:

- Model: `grabielairu/ghibli`
- Version: `4b82bb7dbb3b153882a0c34d7f2cbc4f7012ea7eaddb4f65c257a3403c9b3253`

The model is optimized for:

- Landscapes and nature scenes
- Character illustrations
- Architectural scenes
- General artwork transformation

## Technologies Used

- [Next.js 15](https://nextjs.org/)
- [Redis](https://redis.io/) via [ioredis](https://github.com/redis/ioredis)
- [Venice AI API](https://venice.ai)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Canvas](https://www.npmjs.com/package/canvas) for image processing
- [Grove](https://grove.storage) for Web3 storage

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [Venice AI Documentation](https://docs.venice.ai)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Grove Documentation](https://docs.grove.storage)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
