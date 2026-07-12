/**
 * index.ts
 *
 * Public API surface of @novatip/sdk.
 * Import everything your backend or frontend needs from this single entrypoint.
 *
 * @example
 * import {
 *   getNetwork,
 *   TipSplitterClient,
 *   FreighterAdapter,
 *   usdcToStroops,
 *   fetchTipEvents,
 * } from "@novatip/sdk";
 */

// ── Network ──────────────────────────────────────────────────────────────────
export {
  getNetwork,
  networkFromEnv,
  isValidContractId,
  isValidAccountId,
  NETWORKS,
} from "./network.js";
export type { NetworkConfig, NetworkName } from "./network.js";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  Split,
  Jar,
  TipEvent,
  TipParams,
  CreateJarParams,
  UpdateSplitsParams,
} from "./types.js";

// ── Errors ────────────────────────────────────────────────────────────────────
export {
  ContractErrorCode,
  CONTRACT_ERROR_MESSAGES,
  NovatipContractError,
  NovatipSdkError,
  parseContractError,
} from "./errors.js";

// ── USDC helpers ──────────────────────────────────────────────────────────────
export {
  USDC_DECIMALS,
  USDC_UNIT,
  usdcToStroops,
  stroopsToUsdc,
  formatUsdc,
  isValidTipAmount,
  validateSplitsBps,
} from "./usdc.js";

// ── Transaction builder ───────────────────────────────────────────────────────
export {
  simulateAndAssemble,
  submitAndWait,
  buildTransactionBuilder,
  createRpcServer,
  decodeReturnValue,
} from "./transaction.js";
export type { AssembledTx } from "./transaction.js";

// ── Contract client ───────────────────────────────────────────────────────────
export { TipSplitterClient } from "./clients/tip-splitter.js";
export type { SignTransaction, InvokeOptions } from "./clients/tip-splitter.js";

// ── Events ────────────────────────────────────────────────────────────────────
export { fetchTipEvents, decodeTipEvent } from "./events.js";
export type { FetchTipEventsOptions } from "./events.js";

// ── Utilities ────────────────────────────────────────────────────────────────
export {
  shortenAddress,
  isTestnet,
  formatLedger,
  addressesEqual,
  truncateMessage,
} from "./utils.js";

// ── Wallet adapters ───────────────────────────────────────────────────────────
export { WalletError } from "./wallet.js";
export type { WalletAdapter } from "./wallet.js";
export { FreighterAdapter } from "./adapters/freighter.js";
export { XBullAdapter } from "./adapters/xbull.js";
