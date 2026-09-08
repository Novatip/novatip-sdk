/**
 * utils.ts
 *
 * General-purpose utility helpers for Novatip SDK consumers.
 * These are convenience functions used across the backend and frontend
 * to avoid duplicating common logic in every app.
 */

import type { NetworkName } from "./network.js";

/**
 * Shorten a Stellar address for display purposes.
 * Returns the first `prefixLen` and last `suffixLen` characters
 * separated by an ellipsis.
 *
 * @example
 * shortenAddress("GABCDEFGHIJ...WXYZ")        // "GABCD...WXYZ"
 * shortenAddress("GABCDEFGHIJ...WXYZ", 6, 6)  // "GABCDE...UVWXYZ"
 */
export function shortenAddress(address: string, prefixLen = 5, suffixLen = 4): string {
  if (address.length <= prefixLen + suffixLen) return address;
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}

/**
 * Returns true if the given network name is a testnet or local environment.
 * Useful for conditionally showing testnet banners or disabling features
 * that should only run on mainnet.
 *
 * @example
 * isTestnet("testnet") // true
 * isTestnet("mainnet") // false
 * isTestnet("local")   // true
 */
export function isTestnet(network: NetworkName): boolean {
  return network === "testnet" || network === "local";
}

/**
 * Format a ledger sequence number for display.
 * Adds thousands separators for readability.
 *
 * @example
 * formatLedger(1234567) // "1,234,567"
 */
export function formatLedger(ledger: number): string {
  return ledger.toLocaleString("en-US");
}

/**
 * Returns true if two Stellar addresses are equal (case-insensitive).
 * Stellar addresses are always uppercase but this guard prevents
 * subtle bugs when addresses come from different sources.
 */
export function addressesEqual(a: string, b: string): boolean {
  return a.toUpperCase() === b.toUpperCase();
}

/**
 * Truncate a tip message for display if it exceeds the max length.
 * Appends an ellipsis when truncated.
 *
 * @example
 * truncateMessage("Great show tonight!", 10) // "Great show..."
 */
/**
 * Truncate a message to `maxLength` characters with an ellipsis.
 *
 * The default of 80 is a display-oriented choice for list views and previews;
 * it is deliberately independent of the contract's 280-byte limit and the
 * frontend's own validation. Callers that need contract-safe truncation should
 * pass an explicit `maxLength` derived from the contract limit.
 */
export function truncateMessage(message: string, maxLength = 80): string {
  if (message.length <= maxLength) return message;
  return `${message.slice(0, maxLength)}...`;
}
