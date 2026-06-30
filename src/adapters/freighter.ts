/**
 * adapters/freighter.ts
 *
 * Freighter wallet adapter for Novatip SDK.
 *
 * Freighter is the most widely used Stellar browser extension wallet.
 * Docs: https://docs.freighter.app
 *
 * Install the companion package in your app:
 *   npm install @stellar/freighter-api
 */

import type { WalletAdapter } from "../wallet.js";
import { WalletError } from "../wallet.js";

/**
 * Minimal interface for the @stellar/freighter-api module.
 * Declared here so the SDK does not bundle freighter as a hard dependency —
 * the consuming app installs it separately.
 */
interface FreighterApi {
  isConnected(): Promise<{ isConnected: boolean }>;
  getAddress(): Promise<{ address: string; error?: string }>;
  signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string },
  ): Promise<{ signedTxXdr: string; error?: string }>;
}

/** Lazily resolved freighter API instance. */
let _freighter: FreighterApi | null = null;

async function getFreighterApi(): Promise<FreighterApi> {
  if (_freighter) return _freighter;
  try {
    // Dynamic import so the SDK works in non-browser environments too.
    const mod = await import("@stellar/freighter-api");
    _freighter = mod as unknown as FreighterApi;
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
 * import { FreighterAdapter } from "@novatip/sdk";
 *
 * const wallet = new FreighterAdapter();
 * if (wallet.isAvailable()) {
 *   const publicKey = await wallet.getPublicKey();
 * }
 */
export class FreighterAdapter implements WalletAdapter {
  readonly name = "Freighter";

  /**
   * Returns true if the Freighter extension is installed.
   * Checks for the injected window.freighter object synchronously.
   */
  isAvailable(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof (window as unknown as Record<string, unknown>)["freighter"] !== "undefined"
    );
  }

  /** Request the connected Freighter account's public key. */
  async getPublicKey(): Promise<string> {
    const api = await getFreighterApi();
    const { address, error } = await api.getAddress().catch((e) => {
      throw new WalletError("Failed to get address from Freighter.", this.name, e);
    });

    if (error ?? !address) {
      throw new WalletError(
        error ?? "Freighter returned an empty address.",
        this.name,
      );
    }

    return address;
  }

  /** Sign a transaction XDR with Freighter. */
  async signTransaction(txXdr: string, networkPassphrase: string): Promise<string> {
    const api = await getFreighterApi();

    const { signedTxXdr, error } = await api
      .signTransaction(txXdr, { networkPassphrase })
      .catch((e) => {
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

  /** Freighter does not expose an explicit disconnect — this is a no-op. */
  async disconnect(): Promise<void> {
    // No-op: Freighter manages its own session lifecycle.
  }
}
