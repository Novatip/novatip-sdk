/**
 * adapters/xbull.ts
 *
 * xBull wallet adapter for Novatip SDK.
 *
 * xBull is a Stellar wallet available as a browser extension and mobile app.
 * Docs: https://xbull.app
 *
 * The consuming app does not need to install any extra package - xBull
 * injects its API directly into the window object as `window.xBullSDK`.
 */

import type { WalletAdapter } from "../wallet.js";
import { WalletError } from "../wallet.js";

/** Minimal interface for the xBull injected provider. */
interface XBullProvider {
  connect(params?: { canRequestPublicKey?: boolean; canRequestSign?: boolean }): Promise<void>;
  getPublicKey(): Promise<string>;
  sign(params: {
    xdr: string;
    publicKey?: string;
    network?: string;
  }): Promise<{ signedXDR: string }>;
}

function getXBullProvider(): XBullProvider | null {
  if (typeof globalThis === "undefined") return null;
  const g = globalThis as Record<string, unknown>;
  const w = g["window"] as Record<string, unknown> | undefined;
  if (!w) return null;
  return (w["xBullSDK"] as XBullProvider) ?? null;
}

/**
 * XBullAdapter
 *
 * @example
 * import { XBullAdapter } from "@novatip/sdk";
 *
 * const wallet = new XBullAdapter();
 * if (wallet.isAvailable()) {
 *   const publicKey = await wallet.getPublicKey();
 * }
 */
export class XBullAdapter implements WalletAdapter {
  readonly name = "xBull";

  /** Returns true if the xBull extension is installed and injected. */
  isAvailable(): boolean {
    return getXBullProvider() !== null;
  }

  /** Request connection and return the user's public key. */
  async getPublicKey(): Promise<string> {
    const provider = getXBullProvider();
    if (!provider) {
      throw new WalletError("xBull wallet not found. Please install it from xbull.app", this.name);
    }

    try {
      await provider.connect({
        canRequestPublicKey: true,
        canRequestSign: true,
      });
      const publicKey = await provider.getPublicKey();
      if (!publicKey) {
        throw new WalletError("xBull returned an empty public key.", this.name);
      }
      return publicKey;
    } catch (e) {
      if (e instanceof WalletError) throw e;
      throw new WalletError("Failed to get public key from xBull.", this.name, e);
    }
  }

  /** Sign a transaction XDR with xBull. */
  async signTransaction(txXdr: string, networkPassphrase: string): Promise<string> {
    const provider = getXBullProvider();
    if (!provider) {
      throw new WalletError("xBull wallet not found. Please install it from xbull.app", this.name);
    }

    try {
      const publicKey = await provider.getPublicKey();
      const result = await provider.sign({
        xdr: txXdr,
        publicKey,
        network: networkPassphrase,
      });

      if (!result.signedXDR) {
        throw new WalletError("xBull returned an empty signed transaction.", this.name);
      }

      return result.signedXDR;
    } catch (e) {
      if (e instanceof WalletError) throw e;
      throw new WalletError("xBull signing request failed.", this.name, e);
    }
  }

  /** xBull does not expose an explicit disconnect method. */
  async disconnect(): Promise<void> {
    // No-op: xBull manages its own session lifecycle.
  }
}
