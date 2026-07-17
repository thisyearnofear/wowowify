# Legacy Web3 & NFT Integration (archived)

This document preserves historical integration notes removed from the main README during the @toka Agentic Brand Studio pivot. **NFT minting UI and wallet flows are no longer part of the Studio product.** Wallet interaction remains optional and reserved for future campaign entitlements on X Layer.

## Grove Integration

The application integrates with Grove for optional persistent storage on Farcaster bot replies and lensify flows.

1. Image is processed as usual
2. Optionally uploaded to Grove via `@lens-chain/storage-client`
3. Response may include Grove URI/URL for long-lived links

## Mantle NFT Integration (removed from Studio)

- **Contract**: `0x8b62d610c83c42ea8a8fc10f80581d9b7701cd37` (Mantle Sepolia)
- **Token**: MantleifyNFT (ERC-721, symbol MANTLE)
- Previously: mint from mantleify overlay + Grove URL reference

## Base NFT Integration (removed from Studio)

### HigherBaseOriginals

- **Contract**: `0xF90552377071C01B8922c4879eA9E20A39476998` (Base Sepolia)
- ERC-721, symbol HBO, 0.05 ETH testnet mint price
- Supported overlays: Higher, Base, Dickbuttify

### HigherBaseEditions

- **Contract**: `0x6A0E6D188cFca3FdCcB7b68352B849b133eD74C9` (Base Sepolia)
- ERC-1155 editions at 0.01 ETH, max 100 per original

## Scroll NFT Integration (removed from Studio)

- **Contract**: `0xf230170c3afd6bea32ab0d7747c04a831bf24968` (Scroll Sepolia)
- Scrollify Originals ERC-721, 0.01 ETH testnet mint price

## Farcaster Frames (legacy notes)

Earlier frame docs referenced wallet connect and in-frame minting. The current Mini App focuses on brief → generate → export. See `/frames` and `src/lib/miniapp.ts` for the current embed contract.
