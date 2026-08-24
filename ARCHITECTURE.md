# BBOXX Architecture

BBOXX is a Next.js application for discovering, submitting, reviewing, and funding open-source Bitcoin ecosystem software. The product combines a web registry, Supabase-backed operational data, IPFS/Vercel Blob media storage, browser and imported wallet flows, and Stacks/Clarity contract helpers for decentralized app listings.

The README explains the product thesis. This document explains how the codebase fits together.

## Runtime Shape

- **Framework:** Next.js App Router with React client components and server-side API routes.
- **UI:** Tailwind CSS, local UI primitives in `components/ui`, Radix primitives, Lucide/Tabler icons, and a few animation/media helpers.
- **Data:** Live records in Supabase tables, and IPFS/Blob URLs for uploaded assets.
- **Wallets:** Browser wallet connections for Stacks wallets, plus an encrypted local imported wallet/session system.
- **Chain integration:** Stacks network helpers, Hiro API clients, and `contracts/bbox.clar` for the current registry contract model.
- **Deployment:** Vercel-oriented Next app with Vercel Blob support and API route runtimes where needed.

At a high level:

```text
Browser UI
  -> React pages/components
  -> local wallet/session state
  -> Next API routes
      -> Supabase
      -> Pinata/IPFS
      -> Vercel Blob
      -> Resend/GitHub/Hiro APIs
  -> Stacks wallet or local encrypted wallet signing
      -> Hiro/Stacks API and Clarity contracts
```

## Directory Map

### `app/`

Next.js App Router entry points live here.

- `app/layout.tsx` defines the shared shell: global fonts, `WalletProvider`, UI providers, loading provider, global error handling, navbar, footer, and toast host.
- `app/page.tsx` is the home/discovery experience. It loads app data, renders category and feature sections, and routes users into app or developer flows.
- `app/apps`, `app/apps/[id]`, and `app/preview/[id]` render registry browsing and app detail surfaces.
- `app/submit`, `app/submit/review`, `app/submit/success`, and `app/admin/submit` handle app submission and review workflows.
- `app/account`, `app/settings`, `app/wallet`, `app/wallet-connect`, and `app/wallet-recovery` handle account, wallet, and recovery flows.
- `app/[address]`, `app/users`, and profile-related routes expose public user/developer profile views.
- `app/api/**/route.ts` contains server-side route handlers for database writes, upload helpers, profile operations, comments, GitHub OAuth, email, and proxy endpoints.

Most pages that need browser APIs are client components. API routes are the boundary for privileged operations such as Supabase service-role writes, Pinata uploads, Vercel Blob token generation, email sends, and OAuth callbacks.

### `components/`

Reusable UI and stateful client features live here.

- `components/ui` contains local shadcn/Radix-style primitives such as buttons, cards, inputs, tabs, sheets, tooltips, and typography.
- `Navbar`, `Footer`, `SearchModal`, `GetInModal`, `ConnectWallet`, and related components make up the global navigation and wallet onboarding surface.
- `WalletProvider` stores the currently connected address and wallet type in local storage for Leather, Xverse, and imported wallet flows.
- `EncryptedWalletProvider` manages encrypted imported-wallet state, passphrase unlock, session locking, cross-tab updates, and devnet fallback wallets.
- Upload and media components such as `BannerImageUpload`, `ProfilePictureUpload`, `IPFSImage`, and optimized image wrappers centralize rendering and upload UX.
- App-specific components such as `AppDetailClient`, `SubmissionComments`, `ReviewModal`, and `FundPublisherButton` compose the registry and funding experiences.

### `lib/`

Core application logic and integrations live here.

- `appsUtils.ts` defines the `BitcoinApp` shape used by the seed registry and provides category, search, featured-app, and stats helpers.
- `supabaseClient.ts` creates the browser Supabase client and server-only `supabaseAdmin` client. API routes use the admin client for trusted database operations.
- `network.ts`, `stacks-api.ts`, `contracts.ts`, and `bbox-contract.ts` encapsulate Stacks network selection, Hiro API URLs, sBTC contract constants, and BBOXX contract calls.
- `encryptedStorage.ts`, `encryptedWalletSigning.ts`, `walletUnlock.ts`, and wallet-specific helpers implement imported-wallet storage, signing, and unlock behavior.
- `profileApi.ts`, `allProfilesApi.ts`, `connectedAccountsApi.ts`, `emailVerification.ts`, and `commentSigning.ts` are client/server API helpers around user data and signed actions.
- `pinata.ts`, `pinataUpload.ts`, `directPinataUpload.ts`, `ipfs-utils.ts`, and `ipfs-metadata.ts` handle IPFS URL generation and Pinata upload conventions.
- `bitcoinWallet.ts`, `bitcoinTransfer.ts`, `stacksWallet.ts`, and address utilities provide chain-specific wallet helpers.

### `utils/`

Small shared utilities live here. Notably:

- `config.ts` wraps Pinata file and JSON uploads with environment validation and error handling.
- `IDB.ts`, `AssetPreloader.ts`, and `localStorageUtils.ts` support browser storage and asset-loading behavior.

### `db/`

Database seed and schema artifacts live here.

- `apps.json` is the local seeded registry used by `lib/appsUtils.ts`.
- `bbox_apps.sql` defines the current compact Supabase table used by `/api/submit-app` and `/api/bbox-apps`.
- The `db/hooks` folder appears to contain duplicated hook files and is not part of the primary runtime path.

### `contracts/`

`contracts/bbox.clar` contains the Clarity registry contract. It stores compact on-chain app state:

- publisher principal
- IPFS metadata hash
- status, verification, and featured flags
- vote/rating aggregates
- timestamps and publisher-to-app indexes

Descriptive app metadata is expected to live off-chain in IPFS JSON. The contract records the metadata hash and essential state transitions.

### `public/`

Static assets for icons, screenshots, logos, fonts, manifests, and model/audio files live here. App listings commonly reference IPFS CIDs or these local assets through the media helpers.

## Data Flow

### App Discovery

The discovery surface can use two sources:

1. `db/apps.json` imported through `lib/appsUtils.ts` for seeded/default app data.
2. Supabase `bbox_apps` records exposed through API routes for submitted or live app data.

Client pages and components call helper functions such as `getFeaturedApps`, `getAppsByCategory`, `searchApps`, and `getAppStats` to derive display state. Image CIDs are resolved through IPFS/Pinata URL helpers before rendering.

### App Submission

The current submission flow is split across client pages and API routes:

1. A user fills the submission UI under `app/submit`.
2. Media can be uploaded through Vercel Blob or Pinata/IPFS routes.
3. Metadata can be posted to `/api/upload-metadata`, which pins JSON to Pinata and returns an IPFS hash.
4. `/api/submit-app` validates required fields and inserts a compact record into Supabase `bbox_apps`.
5. Contract helpers in `lib/bbox-contract.ts` support the on-chain version of the flow, where a submitted app stores an IPFS hash in `contracts/bbox.clar`.

There is also `/api/apps`, which targets a broader `apps` table shape with richer fields and pending review status. The project currently contains both the broader app schema flow and the compact `bbox_apps` flow, so contributors should check which route a page uses before changing database columns.

### Profiles, Accounts, And Comments

Profile data is stored in Supabase through profile API routes:

- `/api/profile` upserts the current profile by wallet address.
- `/api/profile/[address]` and related profile endpoints fetch, link, update avatar/banner media, check email availability, and toggle developer mode.
- `/api/comments` stores signed submission comments in the `submission_comments` table.

Comment creation requires a wallet address, message, signature, signed payload, and wallet type. The API persists those fields but does not perform full cryptographic verification in the route itself.

### Uploads And Media

BBOXX uses two upload paths:

- **Pinata/IPFS:** `/api/upload-metadata`, Pinata helpers, and IPFS URL utilities are used for durable metadata and CID-based media references.
- **Vercel Blob:** `/api/upload-to-blob` creates presigned upload tokens for larger user media, validating file type and size before generating a client upload token.

`proxy.ts` adds broad CORS headers and long-lived cache headers for image-like paths and IPFS-related requests.

## Wallet And Session Model

BBOXX has two wallet layers:

1. **Connected wallet state:** `components/WalletProvider.tsx` stores an address and wallet type (`leather`, `xverse`, or `imported`) in local storage. This is the lightweight app-wide identity context used by many UI flows.
2. **Encrypted imported wallet state:** `components/EncryptedWalletProvider.tsx` works with `lib/encryptedStorage.ts` to store imported wallet material encrypted by passphrase, restore active sessions, lock on expiry, broadcast cross-tab events, and support devnet wallets during local development.

Wallet-sensitive operations should route through the signing helpers in `lib/` rather than directly touching key material in UI components.

## Chain Integration

Stacks integration is organized around a few small modules:

- `lib/network.ts` determines the active network from local storage or `NEXT_PUBLIC_STACKS_NETWORK`.
- `lib/stacks-api.ts` maps `mainnet`, `testnet`, and `devnet` to Hiro-compatible API base URLs.
- `lib/contracts.ts` contains sBTC contract identifiers and asset string helpers.
- `lib/bbox-contract.ts` performs BBOXX contract reads and transaction construction/broadcasting helpers.
- `contracts/bbox.clar` is the Clarity source for app registry, metadata hash updates, voting, ratings, admin controls, and listing fee behavior.

The contract design keeps large or frequently changing app details off-chain. On-chain state points to IPFS metadata and records publisher-controlled registry actions.

## External Services

The main environment-backed services are:

- **Supabase:** app, profile, comment, and account persistence.
- **Pinata:** IPFS JSON/file pinning.
- **Vercel Blob:** direct large media uploads.
- **Hiro API:** Stacks blockchain reads and transaction support.
- **GitHub OAuth:** repository/account linking routes.
- **Resend:** email and verification flows.

See `.env.example` for the expected variables. Server-only secrets such as `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, `PINATA_JWT`, `BLOB_READ_WRITE_TOKEN`, `GITHUB_CLIENT_SECRET`, and `RESEND_API_KEY` must stay out of client code.

## Conventions For Changes

- Put page-level user experiences under `app/` and shared UI under `components/`.
- Use API routes for privileged writes, secret-backed integrations, uploads, and OAuth/email flows.
- Use `supabaseAdmin` only in server-side code. Browser-facing code should use public APIs or the browser Supabase client.
- Keep wallet key material inside encrypted wallet helpers and providers. UI components should call signing/unlock abstractions.
- Prefer `lib/network.ts` and `lib/stacks-api.ts` instead of hard-coding network URLs.
- Keep descriptive app metadata off-chain and store only compact identifiers or hashes in contract state.
- When adding app fields, update the relevant Supabase route, database schema, TypeScript type, and UI form together. Check whether the feature uses `apps` or `bbox_apps`.

## Local Development

Install dependencies and run the Next dev server:

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm run lint
```

The application expects environment variables from `.env.example`. Without Supabase, Pinata, Blob, Resend, and GitHub credentials, the static UI can still render, but upload, database, email, and OAuth flows will fail.
