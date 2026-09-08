/**
 * events.ts
 *
 * TipReceived event parser for Novatip.
 *
 * The tip_splitter contract emits an event on every successful tip:
 *   topics: (symbol "tip", jar_id: String)
 *   data:   (from: Address, amount: i128, message: String)
 *
 * This module fetches and decodes those events from the Soroban RPC.
 */

import { SorobanRpc, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";
import type { NetworkConfig } from "./network.js";
import type { TipEvent } from "./types.js";
import { createRpcServer } from "./transaction.js";
import { NovatipSdkError } from "./errors.js";

/**
 * The event symbol `tip_splitter` publishes as topic[0] on every tip.
 * Must stay in step with `symbol_short!("tip")` in the contract.
 */
export const TIP_EVENT_SYMBOL = "tip";

/** Base64 XDR for an ScVal, as the RPC's topic filters expect. */
function topicXdr(value: string, type: "symbol" | "string"): string {
  return nativeToScVal(value, { type }).toXDR("base64");
}

/**
 * Build the RPC topic filter for `tip` events.
 *
 * Two things here are easy to get wrong and both fail silently-ish:
 *
 * 1. The filter is computed, never hardcoded. A literal base64 constant cannot
 *    be reviewed by reading it, and the one this replaced was malformed XDR —
 *    the RPC rejected every request with "invalid parameters", so the indexer
 *    never returned a single event.
 *
 * 2. A topic filter must have one segment per topic the event actually
 *    publishes. `tip` publishes two — (symbol, jar_id) — so a one-segment
 *    filter matches nothing at all rather than matching on the first segment.
 *
 * Passing `jarId` filters server-side. That matters for `limit`: filtering
 * client-side means a busy contract can fill the page with other jars' events
 * and return nothing for the one asked for.
 */
function tipTopicFilter(jarId?: string): string[] {
  return [
    topicXdr(TIP_EVENT_SYMBOL, "symbol"),
    jarId === undefined ? "*" : topicXdr(jarId, "string"),
  ];
}

/** Options for fetching tip events. */
export interface FetchTipEventsOptions {
  /** The deployed tip_splitter contract ID. */
  contractId: string;
  /** Network to query. */
  network: NetworkConfig;
  /** Start ledger sequence (inclusive). Defaults to latest - 1000. */
  startLedger?: number;
  /** Filter by a specific jar slug, e.g. "@alice". If omitted, returns all jars. */
  jarId?: string;
  /** Maximum number of events to return. Defaults to 100. */
  limit?: number;
}

/**
 * Fetch and decode TipReceived events from the Soroban RPC.
 *
 * @example
 * const events = await fetchTipEvents({
 *   contractId: "C...",
 *   network: getNetwork("testnet"),
 *   jarId: "@alice",
 * });
 */
export async function fetchTipEvents(opts: FetchTipEventsOptions): Promise<TipEvent[]> {
  const server = createRpcServer(opts.network);

  // Resolve start ledger
  let startLedger = opts.startLedger;
  if (startLedger === undefined) {
    const latest = await server.getLatestLedger().catch(() => {
      throw new NovatipSdkError("Failed to fetch latest ledger from RPC.");
    });
    startLedger = Math.max(1, latest.sequence - 1000);
  }

  const response = await server
    .getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds: [opts.contractId],
          topics: [tipTopicFilter(opts.jarId)],
        },
      ],
      limit: opts.limit ?? 100,
    })
    .catch((e) => {
      throw new NovatipSdkError("Failed to fetch events from RPC.", e);
    });

  const events: TipEvent[] = [];

  for (const raw of response.events) {
    try {
      const decoded = decodeTipEvent(raw);
      if (opts.jarId && decoded.jarId !== opts.jarId) continue;
      events.push(decoded);
    } catch {
      // Skip malformed events — don't let one bad event break the whole batch
      continue;
    }
  }

  return events;
}

/**
 * Decode a single raw Soroban RPC event into a typed TipEvent.
 * Throws if the event structure does not match the expected tip_splitter schema.
 */
export function decodeTipEvent(raw: SorobanRpc.Api.EventResponse): TipEvent {
  if (raw.topic.length < 2) {
    throw new NovatipSdkError("TipEvent: expected at least 2 topics.");
  }

  // `topic` and `value` arrive already parsed into xdr.ScVal by the Stellar SDK
  // — they are not base64 strings. Calling ScVal.fromXDR on them throws, and
  // because fetchTipEvents skips events that fail to decode, that turned every
  // single event into a silent no-op: the indexer polled forever and never saw
  // a tip. Coerce defensively so either shape works if the SDK ever changes.
  const jarId = scValToNative(toScVal(raw.topic[1]!)) as string;

  // data = Vec<ScVal> [ from: Address, amount: i128, message: String ]
  const dataVec = toScVal(raw.value).vec();

  if (!dataVec || dataVec.length < 3) {
    throw new NovatipSdkError("TipEvent: data vec has fewer than 3 elements.");
  }

  const from = scValToNative(dataVec[0]!) as string;
  const amount = scValToNative(dataVec[1]!) as bigint;
  const message = scValToNative(dataVec[2]!) as string;

  return {
    jarId,
    from,
    amount,
    message,
    ledger: raw.ledger,
    timestamp: raw.ledgerClosedAt,
    txHash: raw.txHash,
  };
}

/** Accept an ScVal or its base64 XDR, and return an ScVal either way. */
function toScVal(value: xdr.ScVal | string): xdr.ScVal {
  return typeof value === "string" ? xdr.ScVal.fromXDR(value, "base64") : value;
}
