/**
 * Structured custom theme shape for ConnectKit.
 *
 * Re-declared locally because ConnectKit v1.9 has a TYPE COLLISION on `Theme`
 * (top-level is a preset union; structured is deep internal). Additionally,
 * ConnectKit's package exports map blocks the deep import under Next.js 15
 * `moduleResolution: "bundler"`.
 *
 * Future path: When ConnectKit exports the structured type from its root,
 * this file becomes a one-line re-export.
 */
export interface ConnectKitTheme {
  buttons?: {
    primary?: {
      color?: string;
      background?: string;
      hover?: {
        background?: string;
      };
    };
  };
}
