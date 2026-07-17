## “Swap through Bitflow” inside BBOX

The feature would let users acquire the asset required by a Bitcoin/Stacks application **without leaving its BBOX page**.

For example:

> A user wants to fund an app with sBTC but currently holds STX. BBOX requests a Bitflow quote, shows the route, opens the wallet transaction, and swaps STX → sBTC. Once confirmed, BBOX enables the funding action.

Bitflow’s SDK already exposes the main pieces needed: token discovery, available swap pairs, route discovery, quotes, swap parameters, post-conditions and execution through `@stacks/connect`. ([BitFlow Documentation][1])

# 1. Where it appears in BBOX

Add the integration to each application detail page:

```text
┌──────────────────────────────────────────┐
│ Mostro                                   │
│ Decentralized P2P Bitcoin exchange       │
│                                          │
│ Supported assets                         │
│ sBTC · STX                               │
│                                          │
│ [ Open App ] [ Fund with sBTC ]          │
│                                          │
│ Don’t have sBTC?                         │
│ [ Swap through Bitflow ]                 │
└──────────────────────────────────────────┘
```

The button could appear when:

* The app accepts a Stacks token.
* The app has a funding campaign denominated in sBTC, STX or a stablecoin.
* The user does not hold enough of the required asset.
* The app defines a preferred payment asset.
* BBOX detects a relevant Bitflow route.

## Strongest BBOX use case

The highest-value version is not a generic exchange widget. It is:

> **Acquire the token needed to use or fund this application.**

Examples:

```text
STX → sBTC → Fund app
aeUSDC → sBTC → Fund app
sBTC → app token → Access service
STX → stablecoin → Purchase product
```

This connects Bitflow liquidity directly to BBOX’s app-distribution and crowdfunding layer.

# 2. User flow

## Step 1: User opens an app

The app manifest indicates that it accepts sBTC:

```json
{
  "name": "Example Bitcoin App",
  "payment": {
    "network": "stacks",
    "acceptedTokens": ["token-sbtc"],
    "preferredToken": "token-sbtc"
  }
}
```

## Step 2: BBOX checks the wallet

BBOX reads the connected wallet’s available balances:

```text
STX:   420
sBTC:  0
USDCx: 38
```

The page displays:

```text
This campaign accepts sBTC.

You currently have 0 sBTC.

[Get sBTC through Bitflow]
```

## Step 3: User selects the source token

```text
You pay

[ STX ▼ ]
[ 100.00 ]

You receive

[ sBTC ]
[ ≈ 0.00043 ]

Route
STX → sBTC

Provided by Bitflow
```

Bitflow can also identify multi-hop routes where no direct pair exists. Its aggregator searches connected liquidity sources and can execute routed swaps within one Stacks transaction. ([BitFlow Documentation][2])

## Step 4: BBOX shows the quote

Before asking for a wallet signature, display:

```text
Expected output       0.00043 sBTC
Minimum output        0.0004257 sBTC
Slippage tolerance    1.00%
Estimated price impact 0.18%
Route                  STX → sBTC
Network fee            Estimated by wallet
Quote updated          4 seconds ago
```

The user can expand the route:

```text
Bitflow Aggregator
└── STX
    └── Bitflow/ALEX pool
        └── sBTC
```

## Step 5: Execute the swap

BBOX passes the selected route, amount, wallet address and slippage tolerance to Bitflow.

The SDK can either:

* Return transaction parameters and post-conditions using `getSwapParams()`.
* Or open the Stacks wallet transaction through `executeSwap()` and `@stacks/connect`. ([BitFlow Documentation][1])

## Step 6: Track confirmation

```text
Swap submitted

100 STX → 0.00043 sBTC

Transaction pending...
[View transaction]
```

Once confirmed:

```text
Swap completed

Your balance: 0.00043 sBTC

[Fund this app]
```

# 3. MVP architecture

```text
BBOX application page
        │
        ├── Wallet state
        │   ├── Connected address
        │   └── Token balances
        │
        ├── BBOX Bitflow adapter
        │   ├── Token discovery
        │   ├── Route discovery
        │   ├── Quote normalization
        │   ├── Swap parameter validation
        │   └── Transaction execution
        │
        ├── Bitflow SDK/API
        │   ├── getAvailableTokens()
        │   ├── getAllPossibleTokenYRoutes()
        │   ├── getQuoteForRoute()
        │   ├── getSwapParams()
        │   └── executeSwap()
        │
        └── Leather / Xverse
            └── Sign and broadcast
```

Bitflow currently documents `@bitflowlabs/core-sdk` as the npm package. Its public endpoints can be used without a key under the documented default limit of 500 requests per minute per IP; BBOX could request higher limits as usage grows. ([BitFlow Documentation][1])

# 4. BBOX adapter

Avoid calling the SDK directly from UI components. Create a separate adapter:

```ts
export interface SwapProvider {
  getTokens(): Promise<SwapToken[]>;

  getRoutes(params: {
    tokenIn: string;
    tokenOut: string;
  }): Promise<SwapRoute[]>;

  getQuote(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
  }): Promise<SwapQuote>;

  executeSwap(params: {
    quote: SwapQuote;
    senderAddress: string;
    slippage: number;
  }): Promise<SwapSubmission>;
}
```

Then implement:

```text
src/
├── features/
│   └── swaps/
│       ├── components/
│       │   ├── SwapDialog.tsx
│       │   ├── TokenSelector.tsx
│       │   ├── SwapQuote.tsx
│       │   ├── RouteDetails.tsx
│       │   └── SwapStatus.tsx
│       ├── hooks/
│       │   ├── useSwapQuote.ts
│       │   ├── useTokenBalances.ts
│       │   └── useSwapExecution.ts
│       ├── providers/
│       │   └── bitflow.ts
│       ├── validation/
│       │   └── validate-swap.ts
│       └── types.ts
```

This keeps BBOX capable of integrating another liquidity provider later without rewriting the product interface.

# 5. Bitflow service skeleton

```ts
import {
  BitflowSDK,
  type SelectedSwapRoute,
  type SwapExecutionData,
} from "@bitflowlabs/core-sdk";

const bitflow = new BitflowSDK({
  BITFLOW_API_HOST: process.env.NEXT_PUBLIC_BITFLOW_API_HOST!,
  BITFLOW_PROVIDER_ADDRESS:
    process.env.NEXT_PUBLIC_BITFLOW_PROVIDER_ADDRESS!,
  READONLY_CALL_API_HOST:
    process.env.NEXT_PUBLIC_BITFLOW_READONLY_HOST!,
  KEEPER_API_HOST:
    process.env.NEXT_PUBLIC_BITFLOW_KEEPER_HOST!,
});

export async function getBitflowQuote(params: {
  tokenInId: string;
  tokenOutId: string;
  amount: number;
}) {
  const result = await bitflow.getQuoteForRoute(
    params.tokenInId,
    params.tokenOutId,
    params.amount,
  );

  if (!result.bestRoute) {
    throw new Error("No Bitflow route is currently available.");
  }

  return result;
}

export async function prepareBitflowSwap(params: {
  route: SelectedSwapRoute;
  amount: number;
  senderAddress: string;
  slippage: number;
}) {
  const swapExecutionData: SwapExecutionData = {
    route: params.route,
    amount: params.amount,
    tokenXDecimals: params.route.tokenXDecimals,
    tokenYDecimals: params.route.tokenYDecimals,
  };

  return bitflow.getSwapParams(
    swapExecutionData,
    params.senderAddress,
    params.slippage,
  );
}
```

The exact production hosts and provider-address configuration should be confirmed with Bitflow before mainnet deployment. The current documentation examples include test endpoints. ([BitFlow Documentation][1])

# 6. Quote hook

Quotes should refresh automatically but not on every keystroke.

```ts
export function useBitflowQuote({
  tokenIn,
  tokenOut,
  amount,
}: {
  tokenIn?: string;
  tokenOut?: string;
  amount?: string;
}) {
  return useQuery({
    queryKey: ["bitflow-quote", tokenIn, tokenOut, amount],
    queryFn: () =>
      getBitflowQuote({
        tokenInId: tokenIn!,
        tokenOutId: tokenOut!,
        amount: Number(amount),
      }),
    enabled:
      Boolean(tokenIn) &&
      Boolean(tokenOut) &&
      Number(amount) > 0,
    refetchInterval: 15_000,
    staleTime: 8_000,
    retry: 1,
  });
}
```

Recommended behavior:

* Debounce input by 300–500 milliseconds.
* Refresh the quote every 10–15 seconds.
* Invalidate the quote when the wallet changes.
* Request a fresh quote immediately before execution.
* Disable execution when a quote is stale.

# 7. Two integration modes

## Mode A — Independent swap

The MVP should treat swapping and funding as separate operations:

```text
Transaction 1: STX → sBTC through Bitflow
Transaction 2: sBTC → BBOX crowdfunding contract
```

Advantages:

* No BBOX smart-contract changes.
* Easier wallet debugging.
* Easier recovery if the second transaction fails.
* Lower integration risk.
* Can be launched as a frontend feature.

This should be the first implementation.

## Mode B — Swap and use

A later version could attempt:

```text
STX
  ↓
Bitflow swap
  ↓
sBTC
  ↓
BBOX contribution or purchase
```

Ideally, this would happen as a composed contract flow so that the swap and final action succeed or fail together.

However, whether Bitflow’s current router contracts allow this kind of third-party contract composition must be confirmed with the Bitflow team. Do not assume that transaction parameters generated for a normal wallet swap can automatically forward the output into a BBOX contract.

# 8. App manifest extension

BBOX apps could declare payment requirements:

```ts
type AppPaymentConfig = {
  network: "stacks";
  preferredToken: string;
  acceptedTokens: string[];
  minimumAmount?: string;
  destination?: string;
  action:
    | "fund"
    | "purchase"
    | "subscribe"
    | "deposit"
    | "access";
  swapProvider?: "bitflow";
};
```

Example:

```json
{
  "payment": {
    "network": "stacks",
    "preferredToken": "token-sbtc",
    "acceptedTokens": ["token-sbtc"],
    "minimumAmount": "0.0001",
    "action": "fund",
    "swapProvider": "bitflow"
  }
}
```

BBOX would use this metadata to generate contextual text:

```text
Get sBTC to fund this project
Swap STX into the token required by this app
Acquire the asset needed to continue
```

# 9. Security requirements

The Bitflow response should be treated as transaction-building input, not blindly trusted UI data.

Before opening the wallet, BBOX should verify:

* Input and output token IDs match the user’s selection.
* Token contract addresses are allowlisted.
* Token decimals match BBOX’s local registry.
* Sender address matches the connected wallet.
* Input amount has not changed.
* Minimum output matches the displayed slippage.
* The route contains only supported contracts.
* Post-conditions restrict how much the user can spend.
* The quote has not expired.
* Network is correctly set to testnet or mainnet.
* Output token is sent to the connected user.

Bitflow’s SDK exposes swap parameters and post-conditions, which makes it possible to inspect them before requesting a signature. ([BitFlow Documentation][1])

For the first production release, use:

```text
Default slippage: 0.5%
User-selectable: 0.1%, 0.5%, 1%
High-risk warning: above 1%
Hard maximum: 3–5%
```

Do not enable unlimited token spending or silent route changes.

# 10. Failure states

The interface should explicitly handle:

```text
No route available
Insufficient token balance
Insufficient STX for fees
Quote expired
Price changed
Wallet rejected transaction
Transaction dropped
Contract call failed
Output below minimum
Unsupported hardware wallet operation
Bitflow API unavailable
```

Example:

```text
The quoted output changed from 0.00043 to 0.00041 sBTC.

Review the updated quote before continuing.
```

Never automatically submit a changed route after the user has already reviewed the transaction.

# 11. BBOX-specific opportunities

## Crowdfunding conversion

Allow users to fund every campaign using any Bitflow-supported input asset:

```text
Campaign requests: sBTC
User owns: STX
BBOX action: Swap STX → sBTC
Final action: Contribute sBTC
```

This reduces fragmentation across campaign currencies.

## App launch liquidity

For apps issuing a token:

```text
Buy the token through Bitflow
View available liquidity
Open the app with acquired token
```

BBOX should not present this as investment advice. It should identify the token contract, route and liquidity source clearly.

## “Required to use” actions

An app may require STX, sBTC or a stablecoin for:

* Deposits.
* Subscription payments.
* Marketplace purchases.
* Protocol collateral.
* Game entry.
* Governance participation.

The swap widget can be preconfigured from that requirement rather than making the user determine the target token manually.

# 12. Analytics for Bitflow

BBOX could give Bitflow useful integration metrics without collecting wallet identities:

```text
swap_widget_opened
quote_requested
route_found
wallet_opened
swap_submitted
swap_confirmed
swap_failed
post_swap_action_completed
```

Useful aggregate metrics:

* Swap volume initiated from BBOX.
* Most requested token pairs.
* Quote-to-sign conversion rate.
* Sign-to-confirmation rate.
* Number of app funding actions enabled by Bitflow.
* Failed-route and insufficient-liquidity rates.

This makes the integration valuable to Bitflow beyond simply displaying its brand.

# 13. MVP deliverables

A focused contribution proposal could include:

### Milestone 1 — Read-only integration

* Install and configure the Bitflow SDK.
* Retrieve supported tokens.
* Detect available routes.
* Display quotes.
* Show route and minimum output.
* No transaction execution yet.

### Milestone 2 — Wallet execution

* Leather and Xverse support.
* Generate swap parameters.
* Validate post-conditions.
* Open wallet transaction.
* Track pending and confirmed state.
* Refresh token balances.

### Milestone 3 — BBOX contextual actions

* App manifest payment metadata.
* “Get sBTC to fund” flow.
* Resume funding after swap confirmation.
* Integration analytics.
* Documentation and example app.

# Recommended pitch

> **BBOX proposes an embedded Bitflow integration that allows users to acquire the token required to fund, purchase from or interact with a Bitcoin application directly from its app page. The initial implementation would integrate Bitflow’s routing, quote and swap-execution SDK with Leather and Xverse, validate generated transaction parameters and post-conditions, and connect confirmed swaps to BBOX crowdfunding and application payment actions.**

The key value proposition is:

```text
Bitflow supplies liquidity.
BBOX supplies application discovery and user intent.
Together, users move directly from discovering an app
to acquiring the asset required to use it.
```

[1]: https://docs.bitflow.finance/bitflow-documentation/developers/bitflow-sdk "Bitflow SDK | Bitflow Documentation"
[2]: https://docs.bitflow.finance/bitflow-documentation/learn/what-is-the-dex-aggregator "What is the DEX Aggregator? | Bitflow Documentation"
