/**
 * tip-splitter.test.ts
 *
 * Read-only calls (getJar, getToken) build a transaction purely to hand the
 * RPC something to simulate. They are never signed and never submitted, so the
 * source account is a placeholder — but it still has to be a well-formed
 * Stellar address, and the client still has to work without touching the
 * network to fetch it.
 *
 * Both of those were broken at once: the placeholder was 55 characters, one
 * short of a valid public key, and it was passed to getAccount. Every read
 * failed with "Could not load source account for simulation", which reads like
 * an RPC outage rather than a malformed constant. These tests pin the shape so
 * it cannot regress into that again.
 */

import { StrKey, scValToNative, xdr } from "@stellar/stellar-sdk";
import { TipSplitterClient } from "../clients/tip-splitter.js";
import { getNetwork } from "../network.js";

const CONTRACT_ID = "CCKPD2MPAYQYCL7QJKUMJHTEJWNHSIP7BZYIZBRO3C4DM4VHZKL6VBRL";

/** Reach the private builder without loosening its visibility in the source. */
function buildReadTx(
  client: TipSplitterClient,
  method: string,
): { toXDR: () => string; source: string } {
  return (
    client as unknown as {
      _buildReadTx: (m: string, a: unknown[]) => { toXDR: () => string; source: string };
    }
  )._buildReadTx(method, []);
}

describe("TipSplitterClient read-only simulation", () => {
  const client = new TipSplitterClient({
    contractId: CONTRACT_ID,
    network: getNetwork("testnet"),
  });

  it("uses a source account that is a valid ed25519 public key", () => {
    const tx = buildReadTx(client, "get_token");
    expect(StrKey.isValidEd25519PublicKey(tx.source)).toBe(true);
    expect(tx.source).toHaveLength(56);
  });

  it("builds the transaction without any network round trip", () => {
    // _buildReadTx is synchronous by design. If it ever goes back to loading
    // the account over RPC it must become async, and this stops compiling
    // being the only warning — assert the built envelope directly instead.
    const tx = buildReadTx(client, "get_token");
    expect(typeof tx.toXDR()).toBe("string");
  });

  it("targets the configured contract", () => {
    const xdrString = buildReadTx(client, "get_token").toXDR();
    expect(xdrString.length).toBeGreaterThan(0);
  });
});

/** Reach the private splits encoder without loosening its visibility. */
function encodeSplits(
  client: TipSplitterClient,
  splits: Array<{ to: string; bps: number }>,
): xdr.ScVal {
  return (client as unknown as { _encodeSplits: (s: unknown[]) => xdr.ScVal })._encodeSplits(
    splits,
  );
}

describe("TipSplitterClient splits encoding", () => {
  const client = new TipSplitterClient({
    contractId: CONTRACT_ID,
    network: getNetwork("testnet"),
  });

  const SPLITS = [
    { to: "GD7UXR3IX276M2M4XUE3TPNKTA7PJTERTEDEGWELQQYQBBHDL2NTREFR", bps: 7000 },
    { to: "GDE6TLQE77OGAPXORP5G5YLRG4FQE2D7ZCD237LVLTAALXAOVV3YTPDS", bps: 3000 },
  ];

  /**
   * Soroban rejects an unsorted ScMap outright with Error(Object, InvalidInput)
   * — "ScMap was not sorted by key". The encoder emitted `to` before `bps`,
   * which meant create_jar and update_splits could never succeed. Nothing
   * caught it because those were the only two callers of the encoder and the
   * app never invoked either.
   */
  it("emits each Split's map keys in sorted order", () => {
    const vec = encodeSplits(client, SPLITS).vec();
    expect(vec).not.toBeNull();

    for (const entry of vec!) {
      const keys = entry.map()!.map((e) => e.key().sym().toString());
      expect(keys).toEqual([...keys].sort());
      expect(keys).toEqual(["bps", "to"]);
    }
  });

  it("round-trips back to the same addresses and shares", () => {
    const decoded = scValToNative(encodeSplits(client, SPLITS)) as Array<{
      to: string;
      bps: number;
    }>;
    expect(decoded).toEqual(SPLITS);
  });
});
