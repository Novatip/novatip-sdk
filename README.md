# @novatip/sdk

TypeScript SDK for the [Novatip](https://github.com/novatip) tip-splitter contract on Stellar/Soroban.

Consumed by both `novatip-backend` and `novatip-web`. Provides typed contract bindings, transaction helpers, event parsing, and wallet adapters — no raw XDR in your application code.

---

## Requirements

- Node.js ≥ 18
- A Stellar wallet (Freighter recommended for browser use)

---

## Install

```bash
npm install @novatip/sdk
```

If you are building a browser app and want Freighter support:

```bash
npm install @novatip/sdk @stellar/freighter-api
```

---

## Quickstart

### 1. Read a jar (no wallet needed)

```ts
import { TipSplitterClient, getNetwork } from "@novatip/sdk";

const client = new TipSplitterClient({
  contractId: "C...",               // deployed tip_splitter contract ID
  network: getNetwork("testnet"),
});

const jar = await client.getJar("@alice");
console.log(jar.owner);
console.log(jar.splits); // [{ to: "G...", bps: 10000 }]
```

### 2. Send a tip (browser + Freighter)

```ts
import {
  TipSplitterClient,
  FreighterAdapter,
  getNetwork,
  usdcToStroops,
} from "@novatip/sdk";

const network = getNetwork("testnet");
const wallet  = new FreighterAdapter();
const client  = new TipSplitterClient({ contractId: "C...", network });

const publicKey = await wallet.getPublicKey();

await client.tip(
  {
    from:    publicKey,
    jarId:   "@alice",
    amount:  usdcToStroops("2.50"),   // 25_000_000n stroops
    message: "Great stream!",
  },
  {
    signTransaction: (xdr) =>
      wallet.signTransaction(xdr, network.passphrase),
  },
);
```

### 3. Create a jar with splits

```ts
import { validateSplitsBps } from "@novatip/sdk";

const splits = [
  { to: "G...alice", bps: 7000 },
  { to: "G...bob",   bps: 3000 },
];

// Guard before sending on-chain
if (!validateSplitsBps(splits.map((s) => s.bps))) {
  throw new Error("Splits must sum to 10,000 bps");
}

await client.createJar(
  { owner: publicKey, jarId: "@band", splits },
  { signTransaction: (xdr) => wallet.signTransaction(xdr, network.passphrase) },
);
```

### 4. Fetch tip events (backend / indexer)

```ts
import { fetchTipEvents, getNetwork } from "@novatip/sdk";

const events = await fetchTipEvents({
  contractId: "C...",
  network:    getNetwork("testnet"),
  jarId:      "@alice",   // omit to fetch all jars
  limit:      50,
});

for (const e of events) {
  console.log(`${e.from} tipped ${e.amount} stroops → ${e.jarId}: "${e.message}"`);
}
```

---

## API Reference

### Network

| Export | Description |
|--------|-------------|
| `getNetwork(name)` | Returns a `NetworkConfig` preset for `testnet`, `mainnet`, or `local` |
| `networkFromEnv(env)` | Build a `NetworkConfig` from raw env vars |
| `isValidContractId(id)` | Validates a C... contract address |
| `isValidAccountId(id)` | Validates a G... account address |

### TipSplitterClient

| Method | Description |
|--------|-------------|
| `getJar(jarId)` | Read a jar's on-chain config (no auth) |
| `getToken()` | Read the configured USDC token address (no auth) |
| `createJar(params, opts)` | Register a new tip jar |
| `tip(params, opts)` | Send a USDC tip, split atomically |
| `updateSplits(params, opts)` | Replace a jar's splits |

### USDC Helpers

| Export | Description |
|--------|-------------|
| `usdcToStroops(amount)` | `"1.50"` → `15_000_000n` |
| `stroopsToUsdc(stroops)` | `15_000_000n` → `"1.5000000"` |
| `formatUsdc(stroops, decimals)` | `15_000_000n, 2` → `"1.50"` |
| `isValidTipAmount(stroops)` | Returns true if `stroops > 0n` |
| `validateSplitsBps(bpsArray)` | Returns true if array sums to 10,000 |

### Events

| Export | Description |
|--------|-------------|
| `fetchTipEvents(opts)` | Fetch & decode `TipReceived` events from RPC |
| `decodeTipEvent(raw)` | Decode a single raw RPC event |

### Errors

| Export | Description |
|--------|-------------|
| `NovatipContractError` | Typed on-chain error with `code: ContractErrorCode` |
| `NovatipSdkError` | SDK-level error (network, signing, etc.) |
| `WalletError` | Wallet adapter error |
| `ContractErrorCode` | Enum matching on-chain error repr values |
| `parseContractError(raw)` | Try to parse a raw error into `NovatipContractError` |

### Wallet Adapters

| Export | Description |
|--------|-------------|
| `FreighterAdapter` | Freighter browser extension adapter |
| `WalletAdapter` | Interface to implement for custom wallets |

---

## Environment Variables

When using `networkFromEnv`, supply these in your `.env`:

```env
NETWORK=testnet
RPC_URL=https://soroban-testnet.stellar.org
HORIZON_URL=https://horizon-testnet.stellar.org
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
USDC_CONTRACT_ID=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
TIP_SPLITTER_CONTRACT_ID=C...
```

---

## Build

```bash
npm run build      # compile to dist/
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # jest
```

---

## License

MIT
