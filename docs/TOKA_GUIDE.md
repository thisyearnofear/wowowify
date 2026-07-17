# @toka Bot Quick Guide

## What is @toka?

@toka is an agentic brand studio that combines generative imagery with exact logo and text composition. It helps agents and people turn a creative brief into publication-ready social artwork without asking an image model to redraw or distort the supplied brand mark.

@toka works through two equal production interfaces and one distribution channel:

- **Studio for people**: Visit [wowowify.vercel.app](https://wowowify.vercel.app) to create, inspect, refine, and share artwork.
- **Service for agents**: Call `POST /api/agent` to create the same artwork programmatically.
- **Farcaster distribution**: Mention @toka or open the Mini App to start a composition from Farcaster.

The Studio supports bring-your-own-logo composition. External agents can provide a public `logoUrl` to `POST /api/agent`, upload a logo first via `POST /api/upload-logo`, or reference a saved `brandKitId`. Community overlays remain available as quick-start presets. Agents can hand a draft to a person for final review in Studio.

Wallet interaction is optional and reserved for future campaign payment, entitlement, or delivery receipts on a deployment-configured chain. It is not required to create or share artwork.

## Agent API (preferred for bots)

Discover the service card at `GET /api/agent` or `GET /.well-known/agent.json`.

### Brand kit + logo (recommended)

```bash
curl -X POST https://your-asp-host/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Generate a vibrant community launch visual",
    "parameters": {
      "brandKitId": "demo-launch",
      "formats": ["square", "landscape", "portrait"],
      "text": {
        "content": "THE FUTURE SHIPS TODAY",
        "position": "bottom",
        "style": "bold"
      }
    }
  }'
```

### Logo URL or upload

1. **Public URL** — pass `parameters.logoUrl` (HTTPS).
2. **Upload first** — `POST /api/upload-logo` with multipart field `logo`, then use returned `logoUrl` in `POST /api/agent`.

`logoUrl` always wins over community preset stamps — the mark is composited exactly, never redrawn.

### Human approval drafts

Successful `POST /api/agent` responses include:

- `draftId` — persisted review record (7-day TTL)
- `studioReviewUrl` — open in Studio, e.g. `/?draftId=…`

Fetch draft details with `GET /api/drafts/{id}` (brief, kit, logo, copy, formats, preview URL).

### Multi-format export

Pass `parameters.formats`: `square`, `landscape`, `portrait`, `story`, `banner`. Response includes an `assets` array. Studio and the Mini App can download a single ZIP when multiple formats are selected.

### Optional commerce & provenance

Commerce is **chain-agnostic** — set env vars per deployment. Example for [OKX AI ASP](https://www.okx.ai/tutorial/asp): register A2MCP with this service, use x402 on your chosen network (e.g. X Layer).

- **x402** — set `X402_ENABLED=true` on ASP; paid calls require `X-PAYMENT` header (`X402_NETWORK` names the settlement chain).
- **Entitlements** — `POST /api/entitlements` with `{ "draftId": "…" }` records an optional delivery receipt stub (`ENTITLEMENT_NETWORK`).
- **Provenance** — `POST /api/provenance` with `{ "draftId": "…" }` returns an off-chain specHash + assetHash receipt (`PROVENANCE_NETWORK`, default `offchain`).

## Farcaster bot commands

@toka on Farcaster still accepts natural language in two main categories:

### 1. Generate New Images

```
@toka generate a mountain landscape with higherify
@toka create a futuristic city with scrollify
@toka higherify a beach sunset
```

### 2. Apply Overlays to Existing Images

Reply to a cast containing an image with:

```
@toka degenify this image
@toka apply scrollify to this
@toka higherify
```

## Community preset reference

These preset names work in Farcaster commands or as `parameters.overlayMode` in the agent API. Prefer `brandKitId` + `logoUrl` for brand-safe campaigns.

- `wowowify` - No overlay stamp — generates an AI image only (use with a color tint for background effects)
- `degenify` - Degen-style overlay
- `higherify` - Higher-style overlay
- `scrollify` - Scroll-style overlay
- `lensify` - Lens-style overlay
- `baseify` - Base-style overlay
- `dickbuttify` - Dickbutt-style overlay
- `mantleify` - Mantle-style overlay
- `nounify` - Nouns-style overlay
- `nikefy` - Nike-style overlay
- `higherise` - Higherise-style overlay
- `clankerify` - Clanker-style overlay
- `ghiblify` - AI transformation into Studio Ghibli art style

## Customization Options

Adjust overlays with these parameters:

```
@toka higherify a mountain landscape. scale to 0.5
@toka scrollify this image. position at 10,20
@toka degenify this. color to blue
@toka baseify this. opacity to 0.7
```

- **Scale**: `scale to 0.5` (values 0.1-2.0)
- **Position**: `position at 10,20` (x,y coordinates)
- **Color**: `color to blue` or `color to #FF5500`
- **Opacity**: `opacity to 0.7` (values 0.0-1.0)

## Adding Text

Add text to images with these parameters:

```
@toka generate a beach sunset --text "Summer Vibes" --text-position bottom
@toka higherify this --text "HIGHER" --text-size 48 --text-color white --text-style bold
```

## AI Transformations

Transform images into different art styles:

```
@toka ghiblify this image
@toka ghiblify a serene natural landscape
```

- `--text "Your text here"` - The text content
- `--text-position [position]` - Position (top, bottom, center, top-left, etc.)
- `--text-size [size]` - Font size (numeric value)
- `--text-color [color]` - Text color (name or hex code)
- `--text-style [style]` - Text style (serif, monospace, handwriting, bold, thin)

## Common Mistakes to Avoid

❌ **Don't use pipe separators**:

```
@toka dickbuttify this | position: 10,20 | scale: 1.5
```

✅ **Use periods or commas instead**:

```
@toka dickbuttify this. position at 10,20. scale to 1.5
```

❌ **Don't use colons for parameters**:

```
@toka higherify this image. scale: 0.5
```

✅ **Use "to" or "at" instead**:

```
@toka higherify this image. scale to 0.5
```

❌ **Don't use "style" for color**:

```
@toka degenify this. style: #ff5500
```

✅ **Use "color" instead**:

```
@toka degenify this. color to #ff5500
```

### Example: Fixing a Complex Command

This command won't work:

```
@toka dickbuttify this scene with more vibrant colors | position: 10,-20 | size: 1.5 | style: #ff69b4
--text "dickbutt dominance" --text-position top --text-size 40 --text-style bold
```

Here's the correct version:

```
@toka dickbuttify this scene with more vibrant colors. position at 10,-20. scale to 1.5. color to #ff69b4
--text "dickbutt dominance" --text-position top --text-size 40 --text-style bold
```

Key fixes:

- Replaced pipe (`|`) separators with periods (`.`)
- Changed `position: 10,-20` to `position at 10,-20`
- Changed `size: 1.5` to `scale to 1.5`
- Changed `style: #ff69b4` to `color to #ff69b4`
- Kept the text parameters as they were (these were correct)

### Making Generation Intent Clear

When you want to generate a new image with an overlay (rather than applying an overlay to an existing image), make your intent clear by:

❌ **Ambiguous generation intent**:

```
@toka dickbuttify a pyramid of apples
```

This might be interpreted as applying dickbuttify to an existing image of a pyramid of apples.

✅ **Clear generation intent**:

```
@toka generate a pyramid of apples with dickbuttify overlay
```

✅ **Alternative clear structure**:

```
@toka create an image of a pyramid of apples. dickbuttify
```

If @toka responds with "I couldn't find an image in the parent cast," it means your command was interpreted as an overlay request rather than a generation request.

## Examples of Working Commands

### Generating New Images

```
@toka generate a mountain landscape
@toka create a futuristic city with scrollify
@toka higherify a beach sunset. scale to 0.5
@toka dickbuttify a meme background. position at 10,20. color to pink
```

### Applying Overlays to Existing Images

```
@toka degenify this
@toka scrollify this image. scale to 0.7
@toka higherify. position at 20,30. opacity to 0.8
@toka baseify this photo. color to blue
```

### Adding Text

```
@toka generate a beach sunset --text "Summer Vibes" --text-position bottom
@toka higherify this --text "HIGHER" --text-size 48 --text-color white
@toka degenify this image --text "DEGEN" --text-position top --text-style bold
```

## Troubleshooting

If @toka doesn't respond to your command:

1. **Check your command structure** - Make sure you're using the correct syntax
2. **Keep it simple** - Start with basic commands and add complexity gradually
3. **Be specific** - For generation, provide clear descriptions
4. **Check for images** - When applying overlays, make sure you're replying to a cast with an image

For more detailed documentation, visit [wowowify.vercel.app/docs](https://wowowify.vercel.app/docs)

## For Other Bots/Agents

If you're a bot or agent integrating with @toka programmatically:

1. **Start with `brandKitId` + optional `logoUrl`** — see [Agent API](#agent-api-preferred-for-bots) above.
2. **Persist drafts for humans** — share `studioReviewUrl` from the agent response; no Farcaster or wallet required.
3. **Upload logos** when you don't have a public URL — `POST /api/upload-logo` → use returned `logoUrl`.
4. **Use Farcaster syntax** only when posting casts — the pipe/colon rules below apply to @toka mentions, not `POST /api/agent`.

### Farcaster syntax rules (casts only)

- Use periods (`.`) to separate parameters, not pipes (`|`)
- Use `to` or `at` with parameters, not colons (`:`)
- Use `scale` instead of `size`
- Use `color` instead of `style` for color adjustments
- Always quote text: `--text "Your text here"`

### Example cast interactions

```
@toka This landscape photo is beautiful! The mountains and sky create a perfect harmony.
Could you please degenify this image? Scale to 0.8 and position at center.
```

**Scenario 2: Requesting a new image generation with specific parameters**

```
@toka I'd like to see a futuristic cityscape with flying cars and tall skyscrapers.
Generate this with scrollify overlay. Scale to 0.6 and add some blue color tint.
--text "FUTURE CITY" --text-position bottom --text-size 60 --text-style bold
```

For more detailed documentation, visit [wowowify.vercel.app/docs](https://wowowify.vercel.app/docs)
