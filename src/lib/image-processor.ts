import { logger } from "./logger";
import canvas from "canvas";
import { CanvasRenderingContext2D as NodeCanvasRenderingContext2D } from "canvas";
import fs from "fs";
import path from "path";
import https from "https";

// Add type declarations for canvas
const { createCanvas, loadImage, registerFont } = canvas;

// Font paths for bundled fonts
const FONT_DIRECTORY = path.join(process.cwd(), "public/fonts");
const ROBOTO_REGULAR_PATH = path.join(FONT_DIRECTORY, "Roboto-Regular.ttf");
const ROBOTO_BOLD_PATH = path.join(FONT_DIRECTORY, "Roboto-Bold.ttf");
const ROBOTO_MONO_PATH = path.join(FONT_DIRECTORY, "RobotoMono-Regular.ttf");

// Font URLs from Google Fonts - using TTF files for better compatibility
const ROBOTO_REGULAR_URL =
  "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf";
const ROBOTO_BOLD_URL =
  "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc-.ttf";
const ROBOTO_MONO_URL =
  "https://fonts.gstatic.com/s/robotomono/v22/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vq_SuW4.ttf";

// Flag to track if fonts have been registered
let fontsRegistered = false;

// Function to download and register fonts
export async function ensureFontsAreRegistered() {
  // If fonts are already registered, don't try again
  if (fontsRegistered) {
    return true;
  }

  try {
    // In production (Vercel), use a memory-based approach
    if (process.env.VERCEL === "1") {
      try {
        // In Vercel, we'll use the system fonts directly
        logger.info("Running in Vercel environment, using system fonts");

        // Register system fonts as fallbacks
        registerFont(
          path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf"),
          {
            family: "Roboto",
            weight: "normal",
          }
        );

        registerFont(path.join(process.cwd(), "public/fonts/Roboto-Bold.ttf"), {
          family: "Roboto",
          weight: "bold",
        });

        registerFont(
          path.join(process.cwd(), "public/fonts/RobotoMono-Regular.ttf"),
          {
            family: "RobotoMono",
          }
        );

        fontsRegistered = true;
        logger.info(
          "Successfully registered bundled fonts in Vercel environment"
        );
        return true;
      } catch (vercelError) {
        logger.error("Error registering bundled fonts in Vercel", {
          error:
            vercelError instanceof Error
              ? vercelError.message
              : "Unknown error",
        });
        // Continue with system fonts
        fontsRegistered = true;
        return true;
      }
    }

    // For local development, use the file-based approach
    // Create font directory if it doesn't exist
    if (!fs.existsSync(FONT_DIRECTORY)) {
      fs.mkdirSync(FONT_DIRECTORY, { recursive: true });
      logger.info("Created font directory", { path: FONT_DIRECTORY });
    }

    try {
      // Download and register Roboto Regular if needed
      if (!fs.existsSync(ROBOTO_REGULAR_PATH)) {
        await downloadFont(ROBOTO_REGULAR_URL, ROBOTO_REGULAR_PATH);
        logger.info("Downloaded Roboto Regular font", {
          path: ROBOTO_REGULAR_PATH,
        });
      }

      // Download and register Roboto Bold if needed
      if (!fs.existsSync(ROBOTO_BOLD_PATH)) {
        await downloadFont(ROBOTO_BOLD_URL, ROBOTO_BOLD_PATH);
        logger.info("Downloaded Roboto Bold font", {
          path: ROBOTO_BOLD_PATH,
        });
      }

      // Download and register Roboto Mono if needed
      if (!fs.existsSync(ROBOTO_MONO_PATH)) {
        await downloadFont(ROBOTO_MONO_URL, ROBOTO_MONO_PATH);
        logger.info("Downloaded Roboto Mono font", {
          path: ROBOTO_MONO_PATH,
        });
      }

      // Register fonts with canvas
      registerFont(ROBOTO_REGULAR_PATH, { family: "Roboto", weight: "normal" });
      registerFont(ROBOTO_BOLD_PATH, { family: "Roboto", weight: "bold" });
      registerFont(ROBOTO_MONO_PATH, { family: "RobotoMono" });

      fontsRegistered = true;
      logger.info("Successfully registered fonts for canvas");
    } catch (downloadError) {
      logger.error(
        "Error downloading or registering fonts, using embedded fallback",
        {
          error:
            downloadError instanceof Error
              ? downloadError.message
              : "Unknown error",
        }
      );

      // Use embedded fallback fonts if downloading fails
      try {
        // Register the default sans-serif font as a fallback
        logger.info("Using system fonts as fallback");
        fontsRegistered = true;
      } catch (fallbackError) {
        logger.error("Failed to use fallback fonts", {
          error:
            fallbackError instanceof Error
              ? fallbackError.message
              : "Unknown error",
        });
      }
    }

    return fontsRegistered;
  } catch (error) {
    logger.error("Error in font registration process", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

// Function to download a font file
function downloadFont(url: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(destination, () => {}); // Delete the file if there's an error
        reject(err);
      });
  });
}

// Try to register fonts on module load
ensureFontsAreRegistered().catch((err) => {
  logger.error("Failed to register fonts on startup", {
    error: err instanceof Error ? err.message : String(err),
  });
});


/**
 * Download an image from a URL
 */
export async function downloadImage(url: string): Promise<Buffer> {
  logger.info("Downloading image", { url });

  try {
    // Set a timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        throw new Error("Image download timed out");
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    logger.error("Error downloading image", {
      error: error instanceof Error ? error.message : "Unknown error",
      url,
    });
    throw error;
  }
}

/**
 * Adds text to an image
 * @param imageBuffer The image buffer to add text to
 * @param text The text to add
 * @param options Text options including position, font, color, etc.
 * @returns A buffer containing the image with text
 */
export async function addTextToImage(
  imageBuffer: Buffer,
  text: string,
  options: {
    x?: number | "center" | "left" | "right";
    y?: number | "center" | "top" | "bottom";
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    color?: string;
    strokeColor?: string;
    strokeWidth?: number;
    backgroundColor?: string;
    padding?: number;
    maxWidth?: number;
    lineHeight?: number;
    align?: "left" | "center" | "right";
    rotation?: number;
    shadow?: {
      color: string;
      offsetX: number;
      offsetY: number;
      blur: number;
    };
  } = {}
): Promise<Buffer> {
  // Ensure fonts are registered before proceeding
  await ensureFontsAreRegistered();

  // Load the image
  const image = await loadImage(imageBuffer);

  // Create a canvas with the same dimensions as the image
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");

  // Draw the original image on the canvas
  ctx.drawImage(image, 0, 0, image.width, image.height);

  // Set default options
  const {
    x = "center",
    y = "center",
    fontSize = 32,
    fontFamily = "sans-serif", // Use system sans-serif font
    fontWeight = "bold",
    color = "white",
    strokeColor,
    strokeWidth = 0,
    backgroundColor,
    padding = 10,
    maxWidth = image.width - 40,
    lineHeight = 1.2,
    align = "center",
    rotation = 0,
    shadow,
  } = options;

  // Map style to system fonts or our registered fonts
  let actualFontFamily = "sans-serif";

  // Try to use our registered Roboto fonts first
  if (fontFamily.toLowerCase().includes("mono")) {
    actualFontFamily = "RobotoMono, monospace";
  } else if (
    fontFamily.toLowerCase().includes("serif") &&
    !fontFamily.toLowerCase().includes("sans")
  ) {
    actualFontFamily = "serif";
  } else {
    // Default to Roboto for sans-serif
    actualFontFamily = "Roboto, sans-serif";
  }

  // Set font - use system fonts only
  try {
    // Calculate font size that will fit the image width
    let adaptedFontSize = fontSize;

    // Set initial font to measure text
    ctx.font = `${fontWeight} ${fontSize}px ${actualFontFamily}`;

    // Measure the text width
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;

    // If text is too wide, scale down the font
    if (textWidth > maxWidth) {
      adaptedFontSize = Math.floor(fontSize * (maxWidth / textWidth) * 0.9); // 0.9 for some margin
      adaptedFontSize = Math.max(12, adaptedFontSize); // Don't go below 12px
    }

    // Set the adapted font
    ctx.font = `${fontWeight} ${adaptedFontSize}px ${actualFontFamily}`;

    // Log the font being used
    logger.info("Setting font for text overlay", {
      fontString: ctx.font,
      fontSize: adaptedFontSize,
      originalFontSize: fontSize,
      fontFamily: actualFontFamily,
      fontWeight,
      textWidth,
      maxWidth,
    });
  } catch (error) {
    // Fallback to a very basic font if there's an error
    logger.error("Error setting font, using fallback", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    ctx.font = `${fontSize}px sans-serif`;
  }

  // Set text alignment
  ctx.textAlign = align as CanvasTextAlign;
  ctx.textBaseline = "middle";

  // Apply shadow if specified
  if (shadow) {
    ctx.shadowColor = shadow.color;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
    ctx.shadowBlur = shadow.blur;
  }

  // Calculate position with better precision
  let posX: number;
  if (x === "center") {
    posX = image.width / 2;
  } else if (x === "left") {
    posX = padding;
    ctx.textAlign = "left";
  } else if (x === "right") {
    posX = image.width - padding;
    ctx.textAlign = "right";
  } else {
    posX = x;
  }

  let posY: number;
  if (y === "center") {
    posY = image.height / 2;
  } else if (y === "top") {
    posY = padding + fontSize / 2;
  } else if (y === "bottom") {
    posY = image.height - padding - fontSize / 2;
  } else {
    posY = y;
  }

  // Apply rotation if specified
  if (rotation !== 0) {
    ctx.save();
    ctx.translate(posX, posY);
    ctx.rotate((rotation * Math.PI) / 180);
    posX = 0;
    posY = 0;
  }

  // Split text into lines if it exceeds maxWidth
  const lines = wrapText(ctx, text, maxWidth);
  const totalHeight = lines.length * fontSize * lineHeight;

  // Draw background if specified
  if (backgroundColor) {
    const bgPadding = padding;
    const bgX =
      align === "left"
        ? posX
        : align === "right"
        ? posX - maxWidth
        : posX - maxWidth / 2;
    const bgY = posY - totalHeight / 2 - bgPadding;
    const bgWidth = maxWidth + bgPadding * 2;
    const bgHeight = totalHeight + bgPadding * 2;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
  }

  // Draw each line of text
  ctx.fillStyle = color;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineY =
      posY - totalHeight / 2 + i * fontSize * lineHeight + fontSize / 2;

    // Draw stroke if specified
    if (strokeColor && strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.strokeText(line, posX, lineY);
    }

    // Draw text
    ctx.fillText(line, posX, lineY);
  }

  // Restore context if rotated
  if (rotation !== 0) {
    ctx.restore();
  }

  // Convert canvas to buffer
  return canvas.toBuffer("image/png");
}

/**
 * Wraps text to fit within a maximum width
 * @param ctx Canvas context
 * @param text Text to wrap
 * @param maxWidth Maximum width in pixels
 * @returns Array of lines
 */
function wrapText(
  ctx: NodeCanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && i > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
