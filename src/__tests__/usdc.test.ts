/**
 * usdc.test.ts
 *
 * Unit tests for the USDC amount helpers in src/usdc.ts.
 * All inputs are pure BigInt / string — no network calls needed.
 */

import {
  usdcToStroops,
  stroopsToUsdc,
  formatUsdc,
  isValidTipAmount,
  validateSplitsBps,
  USDC_UNIT,
  USDC_DECIMALS,
} from "../usdc.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe("USDC constants", () => {
  it("USDC_DECIMALS is 7", () => {
    expect(USDC_DECIMALS).toBe(7);
  });

  it("USDC_UNIT is 10_000_000n", () => {
    expect(USDC_UNIT).toBe(10_000_000n);
  });
});

// ---------------------------------------------------------------------------
// usdcToStroops
// ---------------------------------------------------------------------------
describe("usdcToStroops", () => {
  it("converts whole number string", () => {
    expect(usdcToStroops("1")).toBe(10_000_000n);
  });

  it("converts decimal string", () => {
    expect(usdcToStroops("1.50")).toBe(15_000_000n);
  });

  it("converts a numeric argument", () => {
    expect(usdcToStroops(5)).toBe(50_000_000n);
  });

  it("truncates fractional digits beyond 7 places", () => {
    // "1.12345678" should be treated as "1.1234567" (7 dec places)
    expect(usdcToStroops("1.12345678")).toBe(11_234_567n);
  });

  it("pads short fractional parts", () => {
    expect(usdcToStroops("0.1")).toBe(1_000_000n);
  });

  it("handles zero", () => {
    expect(usdcToStroops("0")).toBe(0n);
  });

  it("handles large values", () => {
    expect(usdcToStroops("1000000")).toBe(10_000_000_000_000n);
  });
});

// ---------------------------------------------------------------------------
// stroopsToUsdc
// ---------------------------------------------------------------------------
describe("stroopsToUsdc", () => {
  it("converts back to display string", () => {
    expect(stroopsToUsdc(15_000_000n)).toBe("1.5000000");
  });

  it("pads fractional part to 7 digits", () => {
    expect(stroopsToUsdc(1n)).toBe("0.0000001");
  });

  it("handles zero", () => {
    expect(stroopsToUsdc(0n)).toBe("0.0000000");
  });

  it("round-trips through usdcToStroops", () => {
    const original = "42.1234567";
    expect(stroopsToUsdc(usdcToStroops(original))).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// formatUsdc — decimal boundary cases
// ---------------------------------------------------------------------------
describe("formatUsdc", () => {
  it("formats with 2 decimal places by default", () => {
    expect(formatUsdc(15_000_000n)).toBe("1.50");
  });

  it("formats with 0 decimal places", () => {
    expect(formatUsdc(20_000_000n, 0)).toBe("2.");
  });

  it("formats with 4 decimal places", () => {
    expect(formatUsdc(12_345_678n, 4)).toBe("1.2345");
  });

  it("pads when fewer significant digits are present", () => {
    expect(formatUsdc(10_000_000n, 4)).toBe("1.0000");
  });

  it("handles zero stroops", () => {
    expect(formatUsdc(0n, 2)).toBe("0.00");
  });

  it("handles large bigint values", () => {
    // 1_000_000 USDC
    const large = 1_000_000n * 10_000_000n;
    expect(formatUsdc(large, 2)).toBe("1000000.00");
  });

  it("handles the minimum nonzero value (1 stroop)", () => {
    expect(formatUsdc(1n, 7)).toBe("0.0000001");
  });
});

// ---------------------------------------------------------------------------
// isValidTipAmount
// ---------------------------------------------------------------------------
describe("isValidTipAmount", () => {
  it("returns true for positive amounts", () => {
    expect(isValidTipAmount(1n)).toBe(true);
    expect(isValidTipAmount(10_000_000n)).toBe(true);
  });

  it("returns false for zero", () => {
    expect(isValidTipAmount(0n)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateSplitsBps
// ---------------------------------------------------------------------------
describe("validateSplitsBps", () => {
  it("accepts splits that sum to 10_000", () => {
    expect(validateSplitsBps([5000, 5000])).toBe(true);
    expect(validateSplitsBps([10000])).toBe(true);
    expect(validateSplitsBps([3334, 3333, 3333])).toBe(true);
  });

  it("rejects splits that don't sum to 10_000", () => {
    expect(validateSplitsBps([5000, 4999])).toBe(false);
    expect(validateSplitsBps([5000, 5001])).toBe(false);
  });

  it("rejects an empty array", () => {
    expect(validateSplitsBps([])).toBe(false);
  });

  it("rejects arrays with more than 20 entries", () => {
    const splits = Array<number>(21).fill(0);
    splits[0] = 10000;
    expect(validateSplitsBps(splits)).toBe(false);
  });
});
