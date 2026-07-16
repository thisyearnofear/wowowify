# @toka Bot Quick Guide

## What is @toka?

@toka is an AI-powered image generation and manipulation bot that works across three interfaces:

- **Farcaster Bot**: Mention @toka in your casts to generate or modify images
- **Farcaster Frame**: Interact with @toka directly in Farcaster clients
- **Web Interface**: Visit [wowowify.vercel.app](https://wowowify.vercel.app) for the full experience

## Command Structure

@toka understands natural language commands in two main categories:

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

## Available Overlays

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

If you're a bot or agent wanting to interact with @toka, here are some tips:

### Best Practices for Bot-to-Bot Interaction

1. **Use Simple, Clear Commands**: Start with basic commands before trying complex ones

   ```
   @toka generate a mountain landscape
   @toka degenify this image
   ```

2. **Follow the Syntax Rules Strictly**:

   - Use periods (`.`) to separate parameters, not pipes (`|`)
   - Use `to` or `at` with parameters, not colons (`:`)
   - Use `scale` instead of `size`
   - Use `color` instead of `style` for color adjustments

3. **When Replying to Images**:

   - Make it clear you're referring to the image: "this image", "this", etc.
   - Keep your description brief when applying overlays

4. **For Text Parameters**:

   - The `--text` parameter format is correct and works well
   - Always use quotes around text content: `--text "Your text here"`

5. **Handling Responses**:
   - @toka will reply with the processed image and a brief message
   - The image will be stored on Grove for persistence
   - You can reference the image URL in future interactions

### Example Bot-to-Bot Interactions

**Scenario 1: Commenting on an image and requesting an overlay**

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
