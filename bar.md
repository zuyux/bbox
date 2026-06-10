---
title: "Bitcoin App Registry (BAR) – BRC-APP Protocol v1"
sub: "A Permissionless, Publisher-Controlled On-Chain Registry for Open-Source Applications on Bitcoin L1"
date: "2026-04-19"
author: "40230"
---

### Introduction: Why We Need BAR

The removal of **Bitchat** — Jack Dorsey’s decentralized, Bluetooth-mesh messaging app — from Apple’s China App Store this April 2026 was a stark reminder of a fundamental problem: centralized app stores are single points of failure.

Apple and Google control distribution to billions of devices. A single regulatory request from China’s Cyberspace Administration of China (CAC) was enough to make the app disappear in one of the world’s largest markets. No appeal. No transparency. This is not an isolated incident — it is the predictable behavior of gatekept platforms that must comply with local laws to stay in business.

Bitcoin was created to be **permissionless money**. Its ecosystem now needs **permissionless software distribution**. BAR (Bitcoin App Registry) is a direct response: a pure Bitcoin Layer 1, no-gatekeeper registry where open-source app publishers retain full control over their entries while the history remains immutable and publicly verifiable.
BAR uses the **Ordinals inscription** mechanism — the most mature metadata standard available on Bitcoin L1 today — to create an append-only, publisher-owned directory of applications.

### Core Design Philosophy

BAR is built on four non-negotiable principles:

1. **No Gatekeepers** — No company, DAO, multisig, or third party can block, censor, or delete an app entry.
2. **Publisher Sovereignty** — Only the current owner (controlled by their private key) can update metadata or transfer ownership.
3. **Immutable History** — Every change creates a new inscription. The full audit trail is preserved forever on Bitcoin.
4. **Decentralized Verification** — Anyone can run an independent indexer following deterministic rules. There is no central source of truth.

### Protocol Overview

**Name:** Bitcoin App Registry (BAR)  
**Protocol Identifier:** `brc-app`  
**Underlying Technology:** Bitcoin Taproot inscriptions (Ordinals)

The registry is anchored to a **single canonical Taproot address**:

**`bc1p0saw6z028y7h6eag3w6hx5an6mk5ta8qk7wx2d3gtqtrty243uvqvjzvew`**

This address serves purely as a discovery and coordination point. All genesis and related inscriptions are linked to it for easy indexing.

### JSON Schema (v1)

Every inscription must contain valid JSON with the following structure:

```json
{
  "p": "brc-app",
  "op": "genesis" | "register" | "update" | "transfer",
  "app_id": "string",                    // Permanent unique identifier (e.g. "bitchat", "sparrow-wallet")
  "owner": "bc1p...taproot-address",     // Current publisher's Taproot address
  "name": "string",
  "repo": "string (GitHub / GitLab / other URL)",
  "description": "string",
  "license": "string (e.g. MIT, GPL-3.0)",
  "version": "string (semantic versioning recommended)",
  "build_hash": "string (recommended: sha256:... for reproducible builds)",
  "platform": ["android", "ios", "web", "linux", "windows", ...],
  "chain_layer": "none" | "BTC" | "LN" | "Stacks" | "Rootstock" | "Starknet" | "other",
  "previous": "string (previous inscription ID)" | null,
  "timestamp": number (Unix timestamp, recommended)
}
```

#### Field Notes
- `chain_layer` indicates the primary blockchain or layer the app integrates with (or `"none"` for general open-source tools).
- `previous` creates a verifiable chain linking each state to its predecessor.
- Small inscriptions keep fees low — typically a few dollars at current network conditions (often under $10 for <800-byte JSON at low fee rates).

### Supported Operations

1. **Genesis** (`op: "genesis"`)  
   One-time inscription that defines the registry.

2. **Register** (`op: "register"`)  
   Creates a new app entry. `previous` can be `null` or reference the genesis.

3. **Update** (`op: "update"`)  
   Modifies any metadata (new version, updated build hash, changed description, etc.). Must be inscribed from the current `owner` address and correctly reference the previous inscription.

4. **Transfer** (`op: "transfer"`)  
   Changes ownership to a new Taproot address. After transfer, only the new owner can perform updates or further transfers.

### Validation Rules for Indexers

Any developer or project can build their own BAR indexer. The rules are intentionally simple and deterministic:

- The Taproot address that created the inscription must match the `owner` field.
- For `update` and `transfer`, the `previous` field must point to the last valid inscription for that `app_id`.
- Only the **latest valid inscription** per `app_id` represents the current canonical state.
- Full historical chain remains publicly auditable on any Ordinals explorer.

This design ensures that even if some indexers are malicious or offline, honest ones will converge on the same truth.

### Practical Considerations

**Cost**  
Inscriptions are small JSON documents. At typical 2026 fee levels (~1 sat/vB during low congestion), registering or updating an app usually costs between **$3 and $15**. This makes frequent updates affordable for open-source maintainers.

**Wallets & Tools**  
Supported today by Unisat, Xverse, Sparrow Wallet (with Ordinals plugin), and other Taproot-compatible wallets.

**Integration**  
- BBOX (bbox.lol) and Zapstore can automatically pull the latest state from this L1 registry.
- Frontends can filter by `chain_layer`, platform, license, or owner.
- The registry is designed to complement — not replace — existing open-source stores like F-Droid or Nostr-based platforms.

### Long-Term Vision

BAR v1 is intentionally minimal and focused on rapid deployment. Future versions could add:
- Recursive inscriptions for attaching screenshots or verifiable build proofs.
- Optional community signaling mechanisms (still publisher-controlled).

### Why This Matters

The Bitchat ban showed that relying on Apple or Google for distribution of freedom-oriented tools is unsustainable. BAR provides a parallel infrastructure where the canonical record of an open-source app lives directly on Bitcoin — the most secure and decentralized network in existence.

Once an app is registered, its metadata can be updated by the publisher at any time, ownership can be transferred, and the complete history remains visible to anyone. No government or corporation can erase it.

This is not just another directory.  
It is **digital sovereignty infrastructure** for the open-source ecosystem.
