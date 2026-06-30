/**
 * clients/tip-splitter.ts
 *
 * Typed contract client for the Novatip tip_splitter Soroban contract.
 * Wraps every public contract function with full TypeScript types,
 * simulation, and submission — no raw XDR in userland code.
 */

import {
  Contract,
  SorobanRpc,
  scValToNative,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";
import type { NetworkConfig } from "../network.js";
import type { Jar, Split, TipParams, CreateJarParams, UpdateSplitsParams } from "../types.js";
import {
  buildTransactionBuilder,
  createRpcServer,
  simulateAndAssemble,
  submitAndWait,
} from "../transaction.js";
import { NovatipSdkError, parseContractError } from "../errors.js";

/** Signing callback — receives the transaction XDR and returns the signed XDR. */
export type SignTransaction = (txXdr: string) => Promise<string>;

/** Options accepted by every mutating client method. */
export interface InvokeOptions {
  /** Signs the assembled transaction. Provided by the wallet adapter. */
  signTransaction: SignTransaction;
}

/**
 * TipSplitterClient
 *
 * High-level client for the on-chain tip_splitter contract.
 *
 * @example
 * const client = new TipSplitterClient({
 *   contractId: "C...",
 *   network: getNetwork("testnet"),
 * });
 *
 * const jar = await client.getJar("@alice");
 */
export class TipSplitterClient {
  private readonly contract: Contract;
  private readonly server: SorobanRpc.Server;
  private readonly network: NetworkConfig;

  constructor(options: { contractId: string; network: NetworkConfig }) {
    this.contract = new Contract(options.contractId);
    this.network = options.network;
    this.server = createRpcServer(options.network);
  }

  // ---------------------------------------------------------------------------
  // Read-only calls (simulation only, no signing required)
  // ---------------------------------------------------------------------------

  /**
   * Read a jar's on-chain configuration.
   * Throws NovatipContractError(JarNotFound) if the slug is not registered.
   */
  async getJar(jarId: string): Promise<Jar> {
    const tx = await this._buildReadTx("get_jar", [
      nativeToScVal(jarId, { type: "string" }),
    ]);

    const sim = await this.server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) {
      const typed = parseContractError(sim);
      throw typed ?? new NovatipSdkError(`get_jar simulation error: ${sim.error}`);
    }
    if (!SorobanRpc.Api.isSimulationSuccess(sim) || !sim.result) {
      throw new NovatipSdkError("get_jar: simulation returned no result.");
    }

    return this._decodeJar(sim.result.retval);
  }

  /**
   * Returns the USDC token contract address configured at deploy time.
   */
  async getToken(): Promise<string> {
    const tx = await this._buildReadTx("get_token", []);

    const sim = await this.server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) {
      throw new NovatipSdkError(`get_token simulation error: ${sim.error}`);
    }
    if (!SorobanRpc.Api.isSimulationSuccess(sim) || !sim.result) {
      throw new NovatipSdkError("get_token: simulation returned no result.");
    }

    return scValToNative(sim.result.retval) as string;
  }

  // ---------------------------------------------------------------------------
  // Mutating calls (simulate → sign → submit)
  // ---------------------------------------------------------------------------

  /**
   * Register a new tip jar on-chain.
   * The jar owner must be the signer via signTransaction.
   */
  async createJar(params: CreateJarParams, opts: InvokeOptions): Promise<void> {
    const args = [
      nativeToScVal(params.owner, { type: "address" }),
      nativeToScVal(params.jarId, { type: "string" }),
      this._encodeSplits(params.splits),
    ];
    await this._invokeContract("create_jar", args, params.owner, opts);
  }

  /**
   * Send a USDC tip to a jar.
   * `params.from` must be the signer.
   */
  async tip(params: TipParams, opts: InvokeOptions): Promise<void> {
    const args = [
      nativeToScVal(params.from, { type: "address" }),
      nativeToScVal(params.jarId, { type: "string" }),
      nativeToScVal(params.amount, { type: "i128" }),
      nativeToScVal(params.message, { type: "string" }),
    ];
    await this._invokeContract("tip", args, params.from, opts);
  }

  /**
   * Replace a jar's splits. Only the jar owner may call this.
   */
  async updateSplits(params: UpdateSplitsParams, opts: InvokeOptions & { owner: string }): Promise<void> {
    const args = [
      nativeToScVal(params.jarId, { type: "string" }),
      this._encodeSplits(params.splits),
    ];
    await this._invokeContract("update_splits", args, opts.owner, opts);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Build a read-only (no-auth) transaction for simulation. */
  private async _buildReadTx(
    method: string,
    args: xdr.ScVal[],
  ) {
    // Use a well-known testnet/mainnet account as a dummy source for read sims.
    const dummySource = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
    const builder = await buildTransactionBuilder(dummySource, this.network, this.server).catch(() => {
      throw new NovatipSdkError("Could not load source account for simulation. Check RPC connectivity.");
    });

    return builder
      .addOperation(this.contract.call(method, ...args))
      .build();
  }

  /** Simulate, sign, and submit a mutating contract call. */
  private async _invokeContract(
    method: string,
    args: xdr.ScVal[],
    sourceAccountId: string,
    opts: InvokeOptions,
  ): Promise<void> {
    const builder = await buildTransactionBuilder(sourceAccountId, this.network, this.server).catch((e) => {
      throw new NovatipSdkError("Could not load source account.", e);
    });

    const rawTx = builder.addOperation(this.contract.call(method, ...args)).build();
    const { transaction } = await simulateAndAssemble(this.server, rawTx);

    const signedXdr = await opts.signTransaction(transaction.toXDR()).catch((e) => {
      throw new NovatipSdkError("Transaction signing rejected or failed.", e);
    });

    const { TransactionBuilder } = await import("@stellar/stellar-sdk");
    const signedTx = TransactionBuilder.fromXDR(signedXdr, this.network.passphrase);

    await submitAndWait(this.server, signedTx as any).catch((e) => {
      const typed = parseContractError(e);
      throw typed ?? e;
    });
  }

  /** Encode a Split[] to an ScVal Vec for the contract. */
  private _encodeSplits(splits: Split[]): xdr.ScVal {
    return xdr.ScVal.scvVec(
      splits.map((s) =>
        xdr.ScVal.scvMap([
          new xdr.ScMapEntry({
            key: nativeToScVal("to", { type: "symbol" }),
            val: nativeToScVal(s.to, { type: "address" }),
          }),
          new xdr.ScMapEntry({
            key: nativeToScVal("bps", { type: "symbol" }),
            val: nativeToScVal(s.bps, { type: "u32" }),
          }),
        ]),
      ),
    );
  }

  /** Decode a Jar ScVal returned from the contract. */
  private _decodeJar(scVal: xdr.ScVal): Jar {
    const native = scValToNative(scVal) as { owner: string; splits: Array<{ to: string; bps: number }> };
    return {
      owner: native.owner,
      splits: native.splits.map((s) => ({ to: s.to, bps: s.bps })),
    };
  }
}
