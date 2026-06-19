# BBOX: Universal Registry for Verified Software

**BBOX** is a universal coordination layer and sovereign registry for high-integrity open-source software.
It accepts apps that interact with Bitcoin, other chains, or no chain at all: privacy tools, developer utilities, safe AI applications, infrastructure projects, wallets, social protocols, and public-good software.

BBOX uses the **Bitcoin App Registry (BAR)** protocol as an immutable coordination anchor. Publishers retain control over their metadata while every canonical registration and update can be audited through a public Bitcoin Layer 1 history.

## Vision

BBOX is a parallel distribution and funding infrastructure for software that should remain verifiable, fundable, and permanent.

- Register open-source apps across Bitcoin, multi-chain, and off-chain ecosystems.
- Preserve canonical app metadata through publisher-controlled BAR records.
- Help users, contributors, investors, and grant committees screen real developer proof-of-work.
- Coordinate milestone-based funding for public goods, research, and production software.
- Support specialized work such as Bitcoin L2s, privacy tools, safe AI, and post-quantum Bitcoin research.

## Core Features

| Feature | Description |
| --- | --- |
| **Universal App Index** | Registry for verified open-source software across chains and independent off-chain tools. |
| **BAR Anchoring** | Bitcoin App Registry records provide immutable, publisher-controlled app history on Bitcoin L1. |
| **Milestone Funding** | Smart-contract flows release funds only after visible development stages are completed. |
| **Developer Proof-of-Work** | Public profiles, source links, reviews, and history help evaluate builder seniority. |
| **Sovereign Distribution** | A no-gatekeeper directory for software that should remain discoverable and censorship resistant. |
| **Community Coordination** | A shared surface for users, builders, DAOs, grant programs, and investors to inspect progress. |

## Architecture

- **Frontend:** Next.js / React / Tailwind
- **Contracts:** Clarity on Stacks for current listing and funding flows
- **Registry:** BAR metadata anchored to Bitcoin L1
- **Storage:** IPFS + GitHub metadata
- **Indexing:** BBOX APIs, Hiro APIs, and BAR-compatible indexers
- **Governance:** Multisig and DAO-oriented grant workflows

## Setup

### Prerequisites

- Node.js >= 20
- Clarinet >= 2.0
- Git + pnpm or npm

### Installation

```bash
git clone https://github.com/zuyux/bbox.git
cd bbox
npm install
npm run dev
```

## Roadmap

| Phase | Focus | Status |
| --- | --- | --- |
| **v0.1** | Public app index + metadata | Done |
| **v0.2** | On-chain listings and milestone funding | In progress |
| **v0.3** | BAR indexing, grant review, and governance workflows | Planned |
| **v1.0** | Fully decentralized BBOX registry and funding layer | Planned |

## Contributors

BBOX is developed by **ZUYUX**, a research and development collective.

Lead: [@fabohax](https://github.com/fabohax)
Contributors: [@anthozg](https://github.com/anthozg), [@stackslabs](https://stackslabs.com)

## License

MIT 2025 zuyux.
Free to use, modify, and distribute under open-source terms.

## Links

- [bbox.lol](https://bbox.lol)
- [@zuyuxxyz](https://x.com/zuyuxxyz)
