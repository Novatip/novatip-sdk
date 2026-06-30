/**
 * usdc.ts
 *
 * USDC amount helpers for Novatip.
 *
 * Stellar uses 7 decimal places (stroops-style) for Soroban token amounts.
 * 1 USDC on-chain = 10_000_000 units (1e7).
 */

/** Number of decimal places used by the USDC token contract. */
export const USDC_DECIMALS = 7;

/** 1 USDC expressed in the smallest on-chain unit. */
export const USDC_UNIT = BigInt(10 ** USDC_DECIMALS); // 10_000_000n

/**
 * Convert a human-readable USDC display amount to on-chain stroops.
 *
 * @example
 * usdcToStroops("1.50")   // 15_000_000n
 * usdcToStroops(5)        // 50_000_000n
 */
export function usdcToStroops(amount: string | number): bigint {
  const str = String(amount);
  const [whole, frac = ""] = str.split(".");
  const fracPadded = frac.slice(0, USDC_DECIMALS).padEnd(USDC_DECIMALS, "0");

  const wholeVal = BigInt(whole ?? "0") * USDC_UNIT;
  const fracVal = BigInt(fracPadded);
  return wholeVal + fracVal;
}

/**
 * Convert on-chain stroops back to a human-readable USDC string.
 *
 * @example
 * stroopsToUsdc(15_000_000n)  // "1.5000000"
 * stroopsToUsdc(50_000_000n)  // "5.0000000"
 */
export function stroopsToUsdc(stroops: bigint): string {
  const whole = stroops / USDC_UNIT;
  const frac = stroops % USDC_UNIT;
  return `${whole.toString()}.${frac.toString().padStart(USDC_DECIMALS, "0")}`;
}

/**
 * Format a stroops amount to a fixed number of decimal places for display.
 *
 * @example
 * formatUsdc(15_000_000n, 2)  // "1.50"
 */
export function formatUsdc(stroops: bigint, decimals = 2): string {
  const full = stroopsToUsdc(stroops);
  const [whole, frac = ""] = full.split(".");
  return `${whole}.${frac.slice(0, decimals).padEnd(decimals, "0")}`;
}

/**
 * Returns true if the given stroops value is a valid positive tip amount.
 * Mirrors the on-chain `amount > 0` check in tip_splitter.tip().
 */
export function isValidTipAmount(stroops: bigint): boolean {
  return stroops > 0n;
}

/**
 * Validate that an array of basis-point splits sums to exactly 10_000.
 * Mirrors the on-chain validate_splits logic.
 */
export function validateSplitsBps(bpsValues: number[]): boolean {
  if (bpsValues.length === 0 || bpsValues.length > 20) return false;
  const total = bpsValues.reduce((sum, b) => sum + b, 0);
  return total === 10_000;
}
