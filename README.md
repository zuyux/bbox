# BBOX

**Bitcoin-Anchored Registry and Funding Layer for Open-Source Software**

BBOX is an open-source coordination layer for discovering, verifying, funding, and maintaining high-integrity software.

Its first focus is the Bitcoin ecosystem: Bitcoin apps, Lightning tools, Nostr clients, wallets, privacy software, developer utilities, Bitcoin L2s, infrastructure projects, safe AI tools, and public-good research. The registry is designed to be universal, supporting desktop, Android, iOS, web, CLI, protocol, and infrastructure software.

BBOX uses the **Bitcoin App Registry / BAR** protocol as a sovereign metadata layer. Publishers keep control over their project records while canonical registrations and updates can be anchored to Bitcoin Layer 1, creating an auditable history of software identity, maintainers, releases, funding milestones, and project evolution.

---

## Why BBOX?

Open-source software is difficult to evaluate, fund, and preserve.

Users need to know which apps are real, maintained, and safe.
Developers need visibility, contributors, and sustainable funding.
Grant committees and funders need better ways to inspect proof-of-work.
Communities need a shared surface to coordinate public-good development.

BBOX exists to make open-source software more discoverable, verifiable, fundable, and permanent.

---

## Core Thesis

BBOX is not just an app store.

BBOX is a **Bitcoin-anchored coordination registry** for the people, projects, releases, and funding flows behind open-source software.

Where traditional app stores focus on installation, BBOX focuses on:

* software provenance;
* developer proof-of-work;
* public project metadata;
* milestone-based funding;
* contributor coordination;
* Bitcoin-native public-good infrastructure;
* long-term discoverability and preservation.

## Core Features

| Feature                          | Description                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Universal App Index**          | Registry for open-source software across desktop, Android, iOS, web, CLI, protocol, and infrastructure projects.        |
| **Bitcoin-First Scope**          | Initial focus on Bitcoin, Lightning, Nostr, privacy, wallets, Bitcoin L2s, and public-good developer tools.             |
| **BAR Anchoring**                | Bitcoin App Registry records provide canonical, publisher-controlled metadata anchored to Bitcoin L1.                   |
| **Developer Proof-of-Work**      | Public profiles display repositories, contributions, releases, funding history, milestones, and community attestations. |
| **Milestone Funding**            | Funding flows can be linked to visible development stages, deliverables, reviews, and payout conditions.                |
| **Sovereign Distribution Layer** | Projects remain discoverable through an open registry rather than relying only on centralized app stores or platforms.  |
| **Community Coordination**       | Users, builders, DAOs, investors, and grant committees can inspect software progress in one shared surface.             |
| **Public-Good Discovery**        | Helps surface valuable open-source tools that are often buried across GitHub, Nostr, forums, grants, and communities.   |

---

## Bitcoin App Registry / BAR

BAR is the registry protocol used by BBOX to preserve canonical software metadata.

A BAR record can represent:

* an application;
* a library;
* a protocol;
* a wallet;
* a developer tool;
* a research project;
* a public-good software initiative;
* an infrastructure component.

Each BAR record is publisher-controlled and can include metadata such as:

* project name;
* description;
* repositories;
* releases;
* maintainers;
* supported platforms;
* license;
* cryptographic signatures;
* funding links;
* milestone status;
* Nostr identity;
* website;
* documentation;
* audit references;
* community reviews.

Canonical registrations and updates can be anchored to Bitcoin L1, giving every project a public history that can be independently audited.

---

## Example BAR Metadata

```json
{
  "bar_version": "0.1",
  "name": "Mostro",
  "slug": "mostro",
  "description": "Nostr and Lightning-based peer-to-peer exchange protocol.",
  "category": "P2P Exchange",
  "software_type": "protocol",
  "platforms": ["web", "android", "cli"],
  "ecosystems": ["bitcoin", "lightning", "nostr"],
  "repository": "https://github.com/MostroP2P/mostro",
  "website": "https://mostro.network",
  "license": "MIT",
  "maintainers": [
    {
      "name": "Maintainer Name",
      "github": "github-user",
      "nostr": "npub..."
    }
  ],
  "funding": {
    "lightning_address": "builder@getalby.com",
    "bitcoin_address": "",
    "grants": [],
    "milestones": [
      {
        "title": "Improve mobile client integration",
        "status": "seeking_funding",
        "amount_sats": 5000000
      }
    ]
  },
  "proof_of_work": {
    "repositories": [],
    "merged_prs": [],
    "releases": [],
    "community_attestations": []
  },
  "bar_anchor": {
    "bitcoin_txid": "",
    "timestamp": ""
  }
}
```

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
Contributors: [@anthozg](https://github.com/anthozg), [@ronoel](https://github.com/ronoel)

Previous Grants: [@degrants](https://degrants.xyz)

Interested in helping? See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, workflow, pull request, documentation, and security guidelines.

## License

MIT 2025 zuyux.
Free to use, modify, and distribute under open-source terms.

## Links

- [bbox.lol](https://bbox.lol)
- [@zuyuxxyz](https://x.com/zuyuxxyz)
