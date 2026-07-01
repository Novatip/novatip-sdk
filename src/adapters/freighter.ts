/**
 * adapters/freighter.ts
 *
 * Freighter wallet adapter for Novatip SDK.
 * The consuming app must install @stellar/freighter-api separately.
 */

import type { WalletAdapter } from "../wallet.js";
import { WalletError } from "../wallet.js";

interface FreighterApi {
  isConnected(): Promise<{ isConnected: boolean }>;
  getAddress(): Promise<{ address: string; error?: string }>;
  signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string },
  ): Promise<{ signedTxXdr: string; error?: string }>;
}

let _freighter: FreighterApi | null = null;

async function getFreighterApi(): Promise<FreighterApi> {
  if (_freighter) return _freighter;
  try {
    // Use Function constructor to prevent TypeScript from resolving
    // the module at compile/dts time. The consuming app provides this dep.
    const load = new Function("specifier", "return import(specifier)") as (s: string) => Promise<unknown>;
    const mod = await load("@stellar/freighter-api");
    _freighter = mod as FreighterApi;
    return _freighter;
  } catch {
    throw new WalletError(
      "Freighter API not found. Install @stellar/freighter-api in your app.",
      "Freighter",
    );
  }
}

/**
 * FreighterAdapter
 *
 * @example
 * const wallet = new FreighterAdapter();
 * if (wallet.isAvailable()) {
 *   const publicKey = await wallet.getPublicKey();
 * }
 */
export class FreighterAdapter implements WalletAdapter {
  readonly name = "Freighter";

  isAvailable(): boolean {
    if (typeof globalThis === "undefined") return false;
    const g = globalThis as Record<string, unknown>;
    return typeof g["window"] !== "undefined" &&
      typeof (g["window"] as Record<string, unknown>)["freighter"] !== "undefined";
  }

  async getPublicKey(): Promise<string> {
    const api = await getFreighterApi();
    const { address, error } = await api.getAddress().catch((e: unknown) => {
      throw new WalletError("Failed to get address from Freighter.", this.name, e);
    });
    if (error ?? !address) {
      throw new WalletError(error ?? "Freighter returned an empty address.", this.name);
    }
    return address;
  }

  async signTransaction(txXdr: string, networkPassphrase: string): Promise<string> {
    const api = await getFreighterApi();
    const { signedTxXdr, error } = await api
      .signTransaction(txXdr, { networkPassphrase })
      .catch((e: unknown) => {
        throw new WalletError("Freighter signing request failed.", this.name, e);
      });
    if (error ?? !signedTxXdr) {
      throw new WalletError(
        error ?? "Freighter returned an empty signed transaction.",
        this.name,
      );
    }
    return signedTxXdr;
  }

  async disconnect(): Promise<void> {
    // No-op: Freighter manages its own session lifecycle.
  }
}
