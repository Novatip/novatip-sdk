/**
 * types.ts
 *
 * Shared TypeScript types mirroring the on-chain Soroban structs from
 * the tip_splitter contract. Used by both the backend and web app.
 */

/** One recipient and their basis-point share of every incoming tip. */
export interface Split {
  /** Stellar account address (G...) or contract address (C...) of the recipient. */
  to: string;
  /**
   * Share in basis points. 10_000 bps = 100%.
   * All splits in a jar must sum to exactly 10_000.
   */
  bps: number;
}

/** A creator's tip jar as stored on-chain. */
export interface Jar {
  /** The account that owns/controls this jar. */
  owner: string;
  /** Ordered list of recipients and their shares. */
  splits: Split[];
}

/**
 * The decoded payload of a TipReceived on-chain event.
 * Emitted by tip_splitter.tip() on every successful tip.
 */
export interface TipEvent {
  /** The jar slug that received the tip, e.g. "@alice". */
  jarId: string;
  /** Stellar account address of the sender. */
  from: string;
  /** Tip amount in USDC stroops (7 decimal places, i.e. 1 USDC = 10_000_000). */
  amount: bigint;
  /** Optional message left by the tipper. */
  message: string;
  /** Ledger sequence number the event was emitted in. */
  ledger: number;
  /** ISO-8601 timestamp of the ledger close. */
  timestamp: string;
}

/** Arguments required to send a tip via the contract client. */
export interface TipParams {
  /** Stellar address of the sender (must sign the transaction). */
  from: string;
  /** Jar slug to tip, e.g. "@alice". */
  jarId: string;
  /** Amount in USDC stroops. Use {@link usdcToStroops} to convert from a display value. */
  amount: bigint;
  /** Optional supporter message (pass empty string if none). */
  message: string;
}

/** Arguments to register a new tip jar. */
export interface CreateJarParams {
  /** Owner address — must sign the transaction. */
  owner: string;
  /** Public slug, e.g. "@alice". Must be unique on-chain. */
  jarId: string;
  /** Initial splits. Must sum to 10_000 bps. */
  splits: Split[];
}

/** Arguments to update an existing jar's splits. */
export interface UpdateSplitsParams {
  /** Jar slug to update. */
  jarId: string;
  /** New splits. Must sum to 10_000 bps. */
  splits: Split[];
}
