/**
 * Global type augmentations for EIP-1193 out-of-band RPC calls.
 *
 * Background: wagmi/viem/frame-sdk in this app reach for the raw EIP-1193
 * provider on `window.ethereum` for low-level RPC (chain switching,
 * transaction submission, `eth_call` reads for mint-price discovery).
 *
 * Earlier wagmi majors shipped a global Window augmentation that typed
 * this for us. wagmi v3 (the current major) dropped that coupling.
 *
 * TypeScript has three quirks that shape this augmentation:
 *
 * 1. Global mutable properties (`window.ethereum`) lose narrowing across
 *    `await` boundaries AND inside closure captures. To avoid forcing a
 *    per-file local-constant pattern at every call site, we declare
 *    `ethereum` as NON-optional. The runtime still gates access with
 *    `if (!window.ethereum)` checks throughout the codebase; the type
 *    just promises it exists. (Server-side renders never touch this
 *    path — wagmi/connectkit/frame-sdk providers are mounted under
 *    `next/dynamic({ ssr: false })`.)
 *
 * 2. EIP-1193 returns are method-specific (string for `eth_chainId`,
 *    string[] for `eth_requestAccounts`, hex tx-hash for
 *    `eth_sendTransaction`, hex bytes for `eth_call`, etc.). A precise
 *    overload surface would require ~6 method-named overloads on
 *    `request()`. Per ENHANCEMENT FIRST we use `Promise<any>` and let
 *    existing inline `as string` / `as string[]` narrows continue to
 *    compile without new casts.
 *
 * 3. The provider surfaces a Node-style EventEmitter (used here for
 *    `chainChanged`). `(...args: any[])` keeps caller-declared handler
 *    signatures (`(chainIdHex: string) => void`) assignable without
 *    forcing caller code to declare `unknown` parameters.
 *
 * When the five consuming components (NetworkHandlers, MintHandlers,
 * MintBaseNFTButton, MintScrollifyNFTButton, MintMantleifyButton) are
 * later migrated to wagmi hooks (`useSwitchChain`, `useWriteContract`,
 * `useReadContract`) this file can be deleted without other code changes.
 */

declare global {
  interface Window {
    /**
     * EIP-1193 Ethereum provider injected by the user's browser wallet
     * (MetaMask, Brave Wallet, Coinbase Wallet extension, etc.). Declared
     * non-optional — runtime guards remain in every consumer.
     */
    ethereum: {
      /** Submit an EIP-1193 RPC request. Returns method-specific shapes. */
      request(args: { method: string; params?: any }): Promise<any>;

      /**
       * Node-style EventEmitter surface for provider events. Only the
       * two members actually consumed by the 6 callers (`on` for
       * `chainChanged` subscription, `removeListener` for cleanup) are
       * declared. `addListener`/`removeAllListeners`/`emit` are not
       * declared — YAGNI per the CLEAN principle; consumers are
       * encouraged to migrate to wagmi hooks (`useChainId`,
       * `useConfig` event subscription) instead of reaching for raw
       * EventEmitter APIs.
       */
      on(event: string, handler: (...args: any[]) => void): void;
      removeListener(event: string, handler: (...args: any[]) => void): void;

      /** Provider identification (used for UX branching, not security). */
      isMetaMask?: boolean;
      isConnected?: () => boolean;
    };
  }
}

export {};
