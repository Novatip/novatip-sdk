/**
 * transaction.ts
 *
 * Soroban transaction builder base for Novatip SDK.
 * Handles simulation, fee bumping, and submission against a Soroban RPC node.
 */

import {
  SorobanRpc,
  Transaction,
  TransactionBuilder,
  BASE_FEE,
  TimeoutInfinite,
  xdr,
} from "@stellar/stellar-sdk";
import type { NetworkConfig } from "./network.js";
import { NovatipSdkError } from "./errors.js";

/** Soroban operation result after simulation + assembly. */
export interface AssembledTx {
  /** The transaction ready to be signed and submitted. */
  transaction: Transaction;
  /** Estimated fee in stroops (as a string, matching Stellar SDK). */
  fee: string;
}

/**
 * Low-level helper: simulate a Soroban transaction and return the
 * fee-bumped, footprint-populated transaction ready for signing.
 *
 * @param server   - Soroban RPC server instance
 * @param tx       - The raw transaction to simulate
 */
export async function simulateAndAssemble(
  server: SorobanRpc.Server,
  tx: Transaction,
): Promise<AssembledTx> {
  const simResult = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new NovatipSdkError(`Simulation failed: ${simResult.error}`, simResult);
  }

  if (!SorobanRpc.Api.isSimulationSuccess(simResult)) {
    throw new NovatipSdkError("Simulation returned no result.", simResult);
  }

  const assembled = SorobanRpc.assembleTransaction(tx, simResult).build();

  return {
    transaction: assembled,
    fee: assembled.fee,
  };
}

/**
 * Submit a signed transaction and wait for confirmation.
 * Polls until the transaction is included in a ledger or times out.
 *
 * @param server - Soroban RPC server instance
 * @param tx     - The signed transaction (XDR envelope)
 */
export async function submitAndWait(
  server: SorobanRpc.Server,
  tx: Transaction,
): Promise<SorobanRpc.Api.GetSuccessfulTransactionResponse> {
  const sendResult = await server.sendTransaction(tx);

  if (sendResult.status === "ERROR") {
    throw new NovatipSdkError(
      `Transaction submission failed: ${sendResult.errorResult?.toXDR("base64") ?? "unknown error"}`,
      sendResult,
    );
  }

  const hash = sendResult.hash;
  const startTime = Date.now();
  const timeoutMs = 30_000; // 30 seconds

  while (Date.now() - startTime < timeoutMs) {
    const status = await server.getTransaction(hash);

    if (status.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return status;
    }

    if (status.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new NovatipSdkError(`Transaction failed on-chain: ${hash}`, status);
    }

    // NOT_FOUND means still pending — wait and retry
    await sleep(1_500);
  }

  throw new NovatipSdkError(`Transaction confirmation timed out after 30s: ${hash}`);
}

/**
 * Build a baseline TransactionBuilder for the given source account
 * and network configuration.
 *
 * @param sourceAccountId - G... address of the signing account
 * @param network         - NetworkConfig to pull passphrase and RPC from
 * @param server          - Soroban RPC server (to load account sequence)
 */
export async function buildTransactionBuilder(
  sourceAccountId: string,
  network: NetworkConfig,
  server: SorobanRpc.Server,
): Promise<TransactionBuilder> {
  const account = await server.getAccount(sourceAccountId);

  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: network.passphrase,
  }).setTimeout(TimeoutInfinite);
}

/**
 * Create a Soroban RPC server instance from a NetworkConfig.
 */
export function createRpcServer(network: NetworkConfig): SorobanRpc.Server {
  return new SorobanRpc.Server(network.rpcUrl, { allowHttp: network.name === "local" });
}

/** Decode a Soroban return value XDR to a native JS value. */
export function decodeReturnValue(xdrBase64: string): xdr.ScVal {
  return xdr.ScVal.fromXDR(xdrBase64, "base64");
}

/** Simple async sleep helper. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
