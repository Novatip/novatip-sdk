/**
 * events.test.ts
 *
 * Unit tests for decodeTipEvent in src/events.ts.
 *
 * Fixtures are built with nativeToScVal / xdr so they exercise the same
 * serialisation path as a real Soroban RPC — no live network needed.
 */

import { xdr, nativeToScVal, Address } from "@stellar/stellar-sdk";
import type { SorobanRpc } from "@stellar/stellar-sdk";
import { decodeTipEvent } from "../events.js";
import { NovatipSdkError } from "../errors.js";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Stellar account used as the tipper in every fixture. */
const TIPPER_ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

/**
 * Build a minimal EventResponse fixture that decodeTipEvent can parse.
 *
 * topic[0] = symbol "tip"   (not decoded by decodeTipEvent, but present)
 * topic[1] = jar_id string
 * value    = Vec [ Address(from), i128(amount), String(message) ]
 */
function buildRawEvent(opts: {
  jarId: string;
  from: string;
  amount: bigint;
  message: string;
  ledger?: number;
  ledgerClosedAt?: string;
  topicOverride?: string[];
  valueOverride?: string;
}): SorobanRpc.Api.EventResponse {
  const topic0 = nativeToScVal("tip", { type: "symbol" }).toXDR("base64");
  const topic1 = nativeToScVal(opts.jarId, { type: "string" }).toXDR("base64");

  const topics = opts.topicOverride ?? [topic0, topic1];

  // data vec: [Address, i128, String]
  const dataVec = xdr.ScVal.scvVec([
    new Address(opts.from).toScVal(),
    nativeToScVal(opts.amount, { type: "i128" }),
    nativeToScVal(opts.message, { type: "string" }),
  ]);

  return {
    type: "contract",
    ledger: opts.ledger ?? 1234,
    ledgerClosedAt: opts.ledgerClosedAt ?? "2024-01-01T00:00:00Z",
    contractId: "CCONTRACTID000000000000000000000000000000000000000000000",
    id: "0000000000000000",
    pagingToken: "0000000000000000",
    topic: topics,
    value: opts.valueOverride ?? dataVec.toXDR("base64"),
    inSuccessfulContractCall: true,
  } as unknown as SorobanRpc.Api.EventResponse;
}

// ---------------------------------------------------------------------------
// Happy-path
// ---------------------------------------------------------------------------
describe("decodeTipEvent — valid fixture", () => {
  it("decodes all fields correctly", () => {
    const raw = buildRawEvent({
      jarId: "@alice",
      from: TIPPER_ADDRESS,
      amount: 15_000_000n,
      message: "Great stream!",
      ledger: 5000,
      ledgerClosedAt: "2025-06-01T12:00:00Z",
    });

    const event = decodeTipEvent(raw);

    expect(event.jarId).toBe("@alice");
    expect(event.from).toBe(TIPPER_ADDRESS);
    expect(event.amount).toBe(15_000_000n);
    expect(event.message).toBe("Great stream!");
    expect(event.ledger).toBe(5000);
    expect(event.timestamp).toBe("2025-06-01T12:00:00Z");
  });

  it("handles an empty message", () => {
    const raw = buildRawEvent({
      jarId: "@bob",
      from: TIPPER_ADDRESS,
      amount: 1n,
      message: "",
    });
    expect(decodeTipEvent(raw).message).toBe("");
  });

  it("handles a large bigint amount", () => {
    const large = 999_999_999_999_999n;
    const raw = buildRawEvent({
      jarId: "@whale",
      from: TIPPER_ADDRESS,
      amount: large,
      message: "Whale tip",
    });
    expect(decodeTipEvent(raw).amount).toBe(large);
  });
});

// ---------------------------------------------------------------------------
// Failure paths — NovatipSdkError
// ---------------------------------------------------------------------------
describe("decodeTipEvent — failure paths", () => {
  it("throws NovatipSdkError when topic array has fewer than 2 elements", () => {
    const raw = buildRawEvent({
      jarId: "@alice",
      from: TIPPER_ADDRESS,
      amount: 10_000_000n,
      message: "test",
      topicOverride: [
        // only one topic
        nativeToScVal("tip", { type: "symbol" }).toXDR("base64"),
      ],
    });

    expect(() => decodeTipEvent(raw)).toThrow(NovatipSdkError);
    expect(() => decodeTipEvent(raw)).toThrow("at least 2 topics");
  });

  it("throws NovatipSdkError when topic array is empty", () => {
    const raw = buildRawEvent({
      jarId: "@alice",
      from: TIPPER_ADDRESS,
      amount: 10_000_000n,
      message: "test",
      topicOverride: [],
    });

    expect(() => decodeTipEvent(raw)).toThrow(NovatipSdkError);
  });

  it("throws NovatipSdkError when data vec has fewer than 3 elements", () => {
    // Build a Vec with only 2 elements (missing message)
    const shortVec = xdr.ScVal.scvVec([
      new Address(TIPPER_ADDRESS).toScVal(),
      nativeToScVal(10_000_000n, { type: "i128" }),
      // message omitted
    ]);

    const raw = buildRawEvent({
      jarId: "@alice",
      from: TIPPER_ADDRESS,
      amount: 10_000_000n,
      message: "ignored — overridden below",
      valueOverride: shortVec.toXDR("base64"),
    });

    expect(() => decodeTipEvent(raw)).toThrow(NovatipSdkError);
    expect(() => decodeTipEvent(raw)).toThrow("fewer than 3 elements");
  });

  it("throws NovatipSdkError when data vec is empty", () => {
    const emptyVec = xdr.ScVal.scvVec([]);

    const raw = buildRawEvent({
      jarId: "@alice",
      from: TIPPER_ADDRESS,
      amount: 10_000_000n,
      message: "test",
      valueOverride: emptyVec.toXDR("base64"),
    });

    expect(() => decodeTipEvent(raw)).toThrow(NovatipSdkError);
  });
});
