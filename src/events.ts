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

import { SorobanRpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import type { NetworkConfig } from "./network.js";
import type { TipEvent } from "./types.js";
import { createRpcServer } from "./transaction.js";
import { NovatipSdkError } from "./errors.js";

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
          topics: [
            // topic[0] = symbol "tip"
            ["AAAADwAAAAN0aXAAAAA="],
          ],
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
export function decodeTipEvent(
  raw: SorobanRpc.Api.EventResponse,
): TipEvent {
  if (raw.topic.length < 2) {
    throw new NovatipSdkError("TipEvent: expected at least 2 topics.");
  }

  // topic[1] = jar_id (String ScVal)
  const jarIdScVal = xdr.ScVal.fromXDR(raw.topic[1] as unknown as string, "base64");
  const jarId = scValToNative(jarIdScVal) as string;

  // data = Vec<ScVal> [ from: Address, amount: i128, message: String ]
  const dataScVal = xdr.ScVal.fromXDR(raw.value as unknown as string, "base64");
  const dataVec = dataScVal.vec();

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
  };
}
