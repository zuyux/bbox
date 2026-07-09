# BBOX Improvement Task List

## 1. UI / UX polish

- Improve mobile and tablet responsiveness across pages ✓
- Standardize spacing, typography, and button styles ✓
- Add loading skeletons and better async fallbacks ✓
- Improve onboarding flow for wallet connection and recovery ✓

## 2. Wallet / auth flow

- Harden wallet connection error handling for Stacks, BTC, and browser wallets ✓
- Add clear recovery and backup guidance for encrypted wallets ✓
- Improve session persistence and reconnect behavior after refresh ✓

## 3. Data reliability

- Add retry and caching logic for external APIs (Hiro, Supabase, Pinata, IPFS) ✓
- Surface network status / offline mode when RPC or backend fails ✓
- Validate and sanitize metadata before rendering app listings and comments ✓

## 4. Accessibility

- Ensure all interactive controls have proper labels, focus states, and keyboard support ✓
- Improve contrast ratios and ARIA roles on dialogs and modals ✓
- Add skip links and semantic HTML for screen readers ✓

## 5. Performance

- Audit page load with Next.js and optimize heavy bundles
- Optimize IPFS-hosted images and lazy-load non-critical media ✓
- Reduce unnecessary client-side hydration for static content

## 6. Testing and quality

- Add unit tests for core hooks and utility modules
- Add integration tests for wallet flows and key pages
- Enforce linting and type checking in CI

## 7. Feature stability

- Improve form validation for app submission, funding requests, and email flows ✓
- Add rate limits and spam protection on comments and recovery link endpoints
- Add confirmation/undo for destructive actions like wallet disconnect or metadata deletion

## 8. Documentation and onboarding

- Add in-app help or tooltips for milestone funding and DAO governance
- Update README with exact dev setup commands and architecture notes ✓
- Add a “how to use BBOX” page for new users ✓

## 9. Security and privacy

- Review encryption/storage practices for local wallet data
- Add CSRF/XSS protections on API routes and rendered metadata
- Audit access control for user-specific pages and wallet operations

## 10. Product direction

- Add analytics or telemetry to identify most-used pages and pain points
- Create a prioritized backlog for milestone funding, DAO voting, and app registry verification
- Improve discovery with filters, categories, and search ranking ✓

## Additional

- make profile page loading faster.
- add reviewing processes ✓
