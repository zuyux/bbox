# Contributing to BBOXX

Thanks for helping improve BBOXX. This project is building a Bitcoin-anchored registry and funding layer for open-source software, so contributions should preserve the project's goals around discoverability, provenance, public-good funding, and long-term maintainability.

## Ways to Contribute

- Report bugs with clear reproduction steps, screenshots, logs, or affected URLs when possible.
- Suggest improvements to registry metadata, BAR records, funding flows, or contributor workflows.
- Improve documentation, onboarding material, examples, and project metadata.
- Fix issues in the Next.js app, UI components, API integrations, indexing flows, or contract-related code.
- Review pull requests and help validate behavior across browsers and wallet/network states.

## Development Setup

### Prerequisites

- Node.js 20 or newer
- npm
- Git
- Clarinet 2.0 or newer when working on Clarity contracts

### Install and Run

```bash
git clone https://github.com/zuyux/bbox.git
cd bbox
npm install
npm run dev
```

The app runs locally through Next.js. Use the terminal output from `npm run dev` for the exact local URL.

## Project Scripts

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm run start     # Start the production server
npm run lint      # Run ESLint
```

Run `npm run lint` before opening a pull request. For UI or behavior changes, also run the app locally and manually check the affected flow.

## Branches and Commits

- Create a focused branch for each change, such as `fix/registry-card-state` or `docs/bar-example`.
- Keep commits small enough to review.
- Use clear commit messages that describe the user-facing or maintainer-facing change.
- Avoid mixing unrelated refactors with feature work or bug fixes.

## Pull Request Guidelines

Before opening a pull request:

- Describe what changed and why.
- Link related issues, discussions, or design notes when available.
- Include screenshots or short recordings for visible UI changes.
- Note any migrations, environment variables, contract changes, or indexing assumptions.
- Confirm which checks you ran, such as `npm run lint` or `npm run build`.

Pull requests should be scoped, reviewable, and aligned with BBOXX's Bitcoin-first open-source registry mission.

## Coding Guidelines

- Follow the existing Next.js, React, TypeScript, and Tailwind patterns already used in the repository.
- Prefer clear, explicit code over clever abstractions.
- Keep components accessible, responsive, and easy to scan.
- Do not commit secrets, private keys, wallet seed phrases, API tokens, or local environment files.
- Keep BAR metadata examples valid JSON and compatible with the documented schema direction.
- Treat funding, identity, anchoring, and project provenance features with extra care because mistakes there can affect trust.

## Documentation Guidelines

- Keep docs accurate, concise, and useful for builders, maintainers, reviewers, and funders.
- Update `README.md`, `bar.md`, or onboarding docs when behavior or project concepts change.
- Prefer examples that reflect real BBOXX concepts: apps, maintainers, repositories, releases, milestones, funding links, Nostr identities, and Bitcoin anchors.

## Security

If you find a security issue, do not open a public issue with exploit details. Contact the maintainers privately first so the issue can be assessed and fixed responsibly.

Areas that deserve extra caution include wallet interactions, signatures, Stacks/Clarity contract flows, funding payouts, registry identity, BAR anchoring, and metadata verification.

## Community Expectations

- Be respectful and constructive.
- Assume good intent, but verify technical claims.
- Help make the project easier for new contributors to understand.
- Keep discussions focused on improving BBOXX and the public-good software ecosystem it supports.

## License

By contributing, you agree that your contributions will be licensed under the same license as this repository.
