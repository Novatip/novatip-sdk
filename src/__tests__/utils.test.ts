/**
 * utils.test.ts
 *
 * Unit tests for the pure helper functions in src/utils.ts.
 */

import {
  shortenAddress,
  isTestnet,
  formatLedger,
  addressesEqual,
  truncateMessage,
} from "../utils.js";

// ---------------------------------------------------------------------------
// shortenAddress
// ---------------------------------------------------------------------------
describe("shortenAddress", () => {
  const LONG = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWX";

  it("shortens a long address with default lengths (5 + 4)", () => {
    expect(shortenAddress(LONG)).toBe("GABCD...UVWX");
  });

  it("honours custom prefixLen and suffixLen", () => {
    expect(shortenAddress(LONG, 6, 6)).toBe("GABCDE...UVWX" + "YZ"); // last 6 chars
    // recompute: last 6 chars of LONG
    const last6 = LONG.slice(-6);
    expect(shortenAddress(LONG, 6, 6)).toBe(`${LONG.slice(0, 6)}...${last6}`);
  });

  it("returns the address unchanged when shorter than or equal to prefixLen + suffixLen", () => {
    expect(shortenAddress("GABC", 5, 4)).toBe("GABC"); // 4 < 9, returned as-is
    expect(shortenAddress("GABCDEFGHI", 5, 5)).toBe("GABCDEFGHI"); // exactly 10 = 5+5
  });

  it("returns an empty string unchanged", () => {
    expect(shortenAddress("")).toBe("");
  });

  it("handles a single-character string", () => {
    expect(shortenAddress("G")).toBe("G");
  });
});

// ---------------------------------------------------------------------------
// isTestnet
// ---------------------------------------------------------------------------
describe("isTestnet", () => {
  it("returns true for testnet", () => {
    expect(isTestnet("testnet")).toBe(true);
  });

  it("returns true for local", () => {
    expect(isTestnet("local")).toBe(true);
  });

  it("returns false for mainnet", () => {
    expect(isTestnet("mainnet")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatLedger
// ---------------------------------------------------------------------------
describe("formatLedger", () => {
  it("formats numbers with thousands separators", () => {
    expect(formatLedger(1234567)).toBe("1,234,567");
  });

  it("leaves small numbers without separators", () => {
    expect(formatLedger(999)).toBe("999");
  });

  it("handles zero", () => {
    expect(formatLedger(0)).toBe("0");
  });
});

// ---------------------------------------------------------------------------
// addressesEqual
// ---------------------------------------------------------------------------
describe("addressesEqual", () => {
  const ADDR = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWX";

  it("returns true for identical addresses", () => {
    expect(addressesEqual(ADDR, ADDR)).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(addressesEqual(ADDR, ADDR.toLowerCase())).toBe(true);
  });

  it("returns false for different addresses", () => {
    expect(addressesEqual(ADDR, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// truncateMessage
// ---------------------------------------------------------------------------
describe("truncateMessage", () => {
  it("does not truncate messages within the limit", () => {
    expect(truncateMessage("Hello", 10)).toBe("Hello");
  });

  it("does not truncate messages exactly at the limit", () => {
    expect(truncateMessage("1234567890", 10)).toBe("1234567890");
  });

  it("truncates long messages and appends ellipsis", () => {
    expect(truncateMessage("12345678901", 10)).toBe("1234567890...");
  });

  it("uses a default max length of 80", () => {
    const msg = "a".repeat(81);
    const result = truncateMessage(msg);
    expect(result).toBe("a".repeat(80) + "...");
  });

  it("handles empty strings", () => {
    expect(truncateMessage("")).toBe("");
  });
});
