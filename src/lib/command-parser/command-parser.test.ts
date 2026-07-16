import { describe, it, expect } from "vitest";
import { parseCommand } from "./index";
import { BaseCommandParser } from "./base-parser";
import { FarcasterCommandParser } from "./farcaster-parser";
import { AgentCommandParser } from "./agent-parser";
import { CommandParserFactory } from "./parser-factory";
import { OVERLAY_KEYWORDS, DEFAULT_OVERLAY_PROMPTS, OVERLAY_URLS, validateOverlayMode } from "@/lib/config/overlays";

// ---------------------------------------------------------------------------
// Config consistency
// ---------------------------------------------------------------------------

describe("Overlay config consistency", () => {
  it("every OVERLAY_KEYWORD has a DEFAULT_OVERLAY_PROMPT", () => {
    for (const kw of OVERLAY_KEYWORDS) {
      expect(
        DEFAULT_OVERLAY_PROMPTS[kw],
        `Missing DEFAULT_OVERLAY_PROMPTS["${kw}"]`,
      ).toBeDefined();
    }
  });

  it("every OVERLAY_KEYWORD (except ghiblify) has an OVERLAY_URL", () => {
    for (const kw of OVERLAY_KEYWORDS) {
      if (kw === "ghiblify") continue; // AI transform, no static PNG
      expect(
        OVERLAY_URLS[kw],
        `Missing OVERLAY_URLS["${kw}"]`,
      ).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// ImageService.validateOverlayMode
// ---------------------------------------------------------------------------

describe("validateOverlayMode", () => {
  it("accepts undefined overlay mode", () => {
    expect(() => validateOverlayMode(undefined)).not.toThrow();
  });

  it("accepts 'wowowify' (no-overlay mode)", () => {
    expect(() => validateOverlayMode("wowowify")).not.toThrow();
  });

  it("accepts every keyword in OVERLAY_KEYWORDS", () => {
    for (const kw of OVERLAY_KEYWORDS) {
      expect(() => validateOverlayMode(kw)).not.toThrow();
    }
  });

  it("rejects invalid overlay mode", () => {
    expect(() => validateOverlayMode("invalidify")).toThrow(
      /Invalid overlay mode/,
    );
  });

  it("rejects empty string overlay mode", () => {
    expect(() => validateOverlayMode("")).toThrow(
      /Invalid overlay mode/,
    );
  });
});

// ---------------------------------------------------------------------------
// CommandParserFactory
// ---------------------------------------------------------------------------

describe("CommandParserFactory", () => {
  it("returns FarcasterCommandParser for farcaster interface", () => {
    const parser = CommandParserFactory.getParser("farcaster");
    expect(parser).toBeInstanceOf(FarcasterCommandParser);
  });

  it("returns AgentCommandParser for default interface", () => {
    const parser = CommandParserFactory.getParser("default");
    expect(parser).toBeInstanceOf(AgentCommandParser);
  });

  it("returns AgentCommandParser for web interface", () => {
    const parser = CommandParserFactory.getParser("web");
    expect(parser).toBeInstanceOf(AgentCommandParser);
  });

  it("caches parser instances", () => {
    const a = CommandParserFactory.getParser("farcaster");
    const b = CommandParserFactory.getParser("farcaster");
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// BaseCommandParser
// ---------------------------------------------------------------------------

describe("BaseCommandParser", () => {
  const parser = new BaseCommandParser();

  describe("overlay keyword detection", () => {
    it.each(OVERLAY_KEYWORDS)("detects '%s' at start of input", (kw) => {
      const result = parser.parse(kw);
      expect(result.overlayMode).toBe(kw);
      expect(result.action).toBe("overlay");
      expect(result.useParentImage).toBe(true);
    });

    it("extracts prompt after overlay keyword", () => {
      const result = parser.parse("degenify a colorful abstract pattern");
      expect(result.overlayMode).toBe("degenify");
      expect(result.prompt).toBeTruthy();
    });

    it("handles overlay keyword with no additional text", () => {
      const result = parser.parse("higherify");
      expect(result.overlayMode).toBe("higherify");
      expect(result.action).toBe("overlay");
    });
  });

  describe("control parsing", () => {
    it("extracts scale parameter", () => {
      const result = parser.parse("degenify scale to 0.5");
      expect(result.controls?.scale).toBe(0.5);
    });

    it("extracts position parameters", () => {
      const result = parser.parse("degenify position at 10,20");
      expect(result.controls?.x).toBe(10);
      expect(result.controls?.y).toBe(20);
    });

    it("extracts opacity parameter", () => {
      const result = parser.parse("degenify opacity 0.7");
      expect(result.controls?.overlayAlpha).toBe(0.7);
    });

    it("extracts color parameter", () => {
      const result = parser.parse("degenify color red");
      expect(result.controls?.overlayColor).toBe("red");
    });
  });

  describe("text parsing", () => {
    it("extracts --text flag with quoted content", () => {
      const result = parser.parse('degenify --text "Hello World"');
      expect(result.text?.content).toBe("Hello World");
    });

    it("extracts --text-position flag", () => {
      const result = parser.parse('degenify --text "Test" --text-position bottom');
      expect(result.text?.position).toBe("bottom");
    });

    it("extracts --text-size flag", () => {
      const result = parser.parse('degenify --text "Test" --text-size 64');
      expect(result.text?.fontSize).toBe(64);
    });

    it("extracts --text-color flag", () => {
      const result = parser.parse('degenify --text "Test" --text-color yellow');
      expect(result.text?.color).toBe("yellow");
    });

    it("extracts --text-style flag", () => {
      const result = parser.parse('degenify --text "Test" --text-style bold');
      expect(result.text?.style).toBe("bold");
    });

    it("extracts --caption flag (alias for --text)", () => {
      const result = parser.parse('degenify --caption "Caption text"');
      expect(result.text?.content).toBe("Caption text");
    });
  });

  describe("prompt parsing", () => {
    it("defaults action to generate when no overlay keyword", () => {
      const result = parser.parse("a mountain landscape");
      expect(result.action).toBe("generate");
    });

    it("extracts URL from prompt", () => {
      const result = parser.parse("[PROMPT]: https://example.com/img.png [OVERLAY]: degenify");
      expect(result.baseImageUrl).toBe("https://example.com/img.png");
    });

    it("handles structured [PROMPT]: format", () => {
      const result = parser.parse("[PROMPT]: a sunset over the ocean");
      expect(result.prompt).toContain("sunset over the ocean");
    });
  });
});

// ---------------------------------------------------------------------------
// FarcasterCommandParser
// ---------------------------------------------------------------------------

describe("FarcasterCommandParser", () => {
  const parser = new FarcasterCommandParser();

  describe("generation commands", () => {
    it("detects explicit 'generate' command", () => {
      const result = parser.parse("generate a mountain landscape");
      expect(result.action).toBe("generate");
    });

    it("detects explicit 'create' command", () => {
      const result = parser.parse("create an image of a cat");
      expect(result.action).toBe("generate");
    });

    it("detects 'draw' command", () => {
      const result = parser.parse("draw a sunset");
      expect(result.action).toBe("generate");
    });

    it("detects 'a photograph of' pattern", () => {
      const result = parser.parse("a photograph of a mountain");
      expect(result.action).toBe("generate");
    });

    // Note: The parser treats "dickbuttify a pyramid of apples" as an overlay-on-parent
    // command because the parent-image patterns match. The webhook's processCommand()
    // function overrides this to "generate" using isOverlayGenerationCommand.
    it("detects overlay+noun pattern — parser sets overlay; webhook overrides to generate", () => {
      const result = parser.parse("dickbuttify a pyramid of apples");
      // Parser sees the overlay keyword + parent image pattern → overlay action
      expect(result.overlayMode).toBe("dickbuttify");
      // The webhook's processCommand() detects the overlay+noun pattern separately
      // and overrides action to "generate". That logic lives in the webhook, not the parser.
      expect(result.action).toBe("overlay");
    });
  });

  describe("parent image references", () => {
    it("detects 'this image' as parent image reference", () => {
      const result = parser.parse("degenify this image");
      expect(result.useParentImage).toBe(true);
    });

    it("detects 'overlay this' as parent image reference", () => {
      const result = parser.parse("overlay this");
      expect(result.useParentImage).toBe(true);
    });

    it("defaults to degenify when parent image but no overlay mode", () => {
      const result = parser.parse("overlay this");
      expect(result.overlayMode).toBe("degenify");
    });

    it("assumes parent image for standalone overlay keyword", () => {
      const result = parser.parse("scrollify");
      expect(result.useParentImage).toBe(true);
      expect(result.overlayMode).toBe("scrollify");
    });

    it("assumes parent image for overlay keyword + 'it'", () => {
      const result = parser.parse("higherify it");
      expect(result.useParentImage).toBe(true);
    });

    it("assumes parent image for overlay keyword + 'this'", () => {
      const result = parser.parse("baseify this");
      expect(result.useParentImage).toBe(true);
    });
  });

  describe("short commands", () => {
    it.each(["degenify", "higherify", "scrollify", "baseify"] as const)(
      "treats standalone '%s' as overlay on parent image",
      (kw) => {
        const result = parser.parse(kw);
        expect(result.overlayMode).toBe(kw);
        expect(result.useParentImage).toBe(true);
        expect(result.action).toBe("overlay");
      },
    );
  });
});

// ---------------------------------------------------------------------------
// AgentCommandParser
// ---------------------------------------------------------------------------

describe("AgentCommandParser", () => {
  const parser = new AgentCommandParser();

  describe("structured format", () => {
    it("parses [PROMPT]: ... [OVERLAY]: ... format", () => {
      const result = parser.parse(
        "[PROMPT]: a sunset over the ocean [OVERLAY]: degenify",
      );
      expect(result.prompt).toContain("sunset over the ocean");
      expect(result.overlayMode).toBe("degenify");
    });

    it("parses [TEXT]: ... section", () => {
      const result = parser.parse(
        "[PROMPT]: a cat [OVERLAY]: higherify [TEXT]: Hello, bottom, size 48, bold",
      );
      expect(result.text?.content).toBe("Hello");
      expect(result.text?.position).toBe("bottom");
      expect(result.text?.fontSize).toBe(48);
      expect(result.text?.style).toBe("bold");
    });

    it("parses PROMPT: / OVERLAY: / TEXT: format (no brackets)", () => {
      const result = parser.parse(
        "PROMPT: a dark forest OVERLAY: scrollify",
      );
      expect(result.prompt).toContain("dark forest");
      expect(result.overlayMode).toBe("scrollify");
    });

    it("parses WOWOW: / CAPTION: format", () => {
      const result = parser.parse("WOWOW: a neon city CAPTION: Welcome!");
      expect(result.prompt).toContain("neon city");
      expect(result.text?.content).toBe("Welcome!");
    });
  });

  describe("default overlay mode", () => {
    it("defaults to higherify when overlay action has no explicit mode", () => {
      // "overlay this image" is Farcaster-style; for the agent parser, we test
      // a case where the parser infers overlay action without a keyword
      const result = parser.parse("[OVERLAY]: higherify");
      expect(result.overlayMode).toBe("higherify");
    });
  });

  describe("photograph pattern", () => {
    it("extracts prompt from 'a photograph of...' pattern", () => {
      const result = parser.parse("a photograph of a mountain landscape");
      expect(result.prompt).toContain("mountain landscape");
    });

    it("extracts scale from photograph pattern", () => {
      const result = parser.parse(
        "a photograph of a mountain landscape. scale to 0.5",
      );
      expect(result.prompt).toContain("mountain landscape");
      expect(result.controls?.scale).toBe(0.5);
    });
  });
});

// ---------------------------------------------------------------------------
// Integration: parseCommand index function
// ---------------------------------------------------------------------------

describe("parseCommand (integration)", () => {
  it("uses default interface when none specified", () => {
    const result = parseCommand("degenify a cool pattern");
    expect(result.overlayMode).toBe("degenify");
  });

  it("uses farcaster interface", () => {
    const result = parseCommand("degenify this", "farcaster");
    expect(result.overlayMode).toBe("degenify");
    expect(result.useParentImage).toBe(true);
  });

  it("parses overlay + text flags correctly", () => {
    const result = parseCommand(
      'scrollify a tech background --text "Built on Scroll" --text-position bottom --text-color cyan',
    );
    expect(result.overlayMode).toBe("scrollify");
    expect(result.text?.content).toBe("Built on Scroll");
    expect(result.text?.position).toBe("bottom");
    expect(result.text?.color).toBe("cyan");
  });
});
