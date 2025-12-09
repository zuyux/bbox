# 🟧 BBOX — The Open Bitcoin App Store

**BBOX** is a decentralized app directory and funding layer for Bitcoin and its Layer-2 ecosystems (Stacks, Lightning, Runes, etc.).  
It helps users discover, evaluate, and fund open-source Bitcoin applications through transparent milestones and smart contracts.

---

## 🚀 Vision

BBOX aims to become the **App Store of the Bitcoin economy** — permissionless, open-source, and community-governed.

- Curate and verify apps built on Bitcoin L1 + L2 networks.  
- Enable milestone-based funding and bounties in BTC, STX, or other Bitcoin-anchored assets.  
- Provide a unified UX for builders, users, and DAOs to coordinate development transparently.  
- Support local Bitcoin communities and hackathons through **BBOX Grants**.

---

## 🧩 Core Features

| Feature | Description |
|----------|-------------|
| **App Index** | Decentralized registry of Bitcoin and Layer-2 applications. |
| **Milestone Funding** | Clarity smart contracts release funds only after milestone completion. |
| **DAO Governance** | Multisig or quadratic voting for project curation and grants. |
| **Profiles & Badges** | Developer and project verification via GitHub or Stacks ID. |
| **Bridge SDK** | Integration layer for apps to register metadata or trigger BBOX events. |
| **Privacy Layer (coming soon)** | Optional zk-proof system for KYC-less funding approvals. |

---

## 🧱 Architecture

- **Frontend:** Next.js / React / Tailwind  
- **Contracts:** Clarity (Stacks network)  
- **Storage:** IPFSs + GitHub metadata  
- **Indexing:** Hiro API + BBOX Registry  
- **Governance:** sBTC multisig DAO (Zuyux DAO prototype)

---

## 📦 Repository Structure

```

bbox/
├── contracts/        # Clarity smart contracts (funding, registry, dao)
├── web/              # Next.js frontend
├── api/              # API routes and middleware
├── scripts/          # Deployment and verification scripts
├── docs/             # Specs and architecture docs
├── tests/            # Unit and integration tests
└── README.md

````

---

## ⚙️ Setup

### Prerequisites
- Node.js ≥ 20  
- Clarinet ≥ 2.0  
- Git + pnpm  

### Installation

```bash
git clone https://github.com/zuyux/bbox.git
cd bbox
npm install
npm run dev
````

### Email configuration

Set the following variables in `.env.local` (or your deployment provider) so transactional emails go through Resend:

```
RESEND_API_KEY="your_resend_key"
RESEND_FROM_EMAIL="BBOX <noreply@bbox.app>"
```

**Important:**
- Use a **Live** Resend API key (`re_live_…`). Test keys (`re_test_…`) never deliver to real inboxes even though the API returns success.
- `RESEND_FROM_EMAIL` must match a domain you have verified inside Resend (or use an `@yourdomain.onresend.com` address while testing). If it’s missing, the app will skip sending and log a warning.
- When either value is missing during development, the app logs the email contents instead of sending so you can still test the flow.

### Deploy contracts

```bash
clarinet deploy --network=testnet
```

---

## 🧪 Development Roadmap

| Phase    | Focus                            | Status         |
| -------- | -------------------------------- | -------------- |
| **v0.1** | Static app index + metadata      | ✅ Done         |
| **v0.2** | Smart contract milestone funding | 🚧 In progress |
| **v0.3** | DAO governance + grant voting    | 🕒 Planned     |
| **v1.0** | Fully decentralized BBOX dApp    | 🔜 Q2 2026     |

---

## 👥 Contributors

BBOX is developed by **Zuyux** — a research & development collective in Lima, Peru.
Lead: [@fabohax](https://github.com/fabohax)
Contributors: [@ronoelc](https://github.com/ronoelc), [@stackslabs](https://stackslabs.com)

---

## 🪙 License

MIT © 2025 Zuyux DAO
Free to use, modify, and distribute under open-source terms.

---

## 🌐 Links

* Website: [bbox.app](https://bbox.app) *(coming soon)*
* Twitter/X: [@zuyuxdao](https://x.com/zuyuxdao)
* Docs: `/docs`
* Telegram: [t.me/zuyuxdao](https://t.me/zuyuxdao)

```

