/**
 * wallet.ts
 *
 * Wallet signing adapter interface for Novatip SDK.
 *
 * The SDK is wallet-agnostic. Any wallet (Freighter, xBull, Lobstr, etc.)
 * can integrate by implementing the WalletAdapter interface.
 */

/** Core interface every wallet adapter must implement. */
export interface WalletAdapter {
  /** Human-readable name of the wallet (e.g. "Freighter"). */
  name: string;

  /**
   * Returns true if the wallet extension / app is available in this environment.
   * Should be synchronous and safe to call repeatedly.
   */
  isAvailable(): boolean;

  /**
   * Request the user's public key (G... address).
   * May trigger a connection prompt if the wallet is not yet connected.
   */
  getPublicKey(): Promise<string>;

  /**
   * Sign a Stellar transaction XDR and return the signed XDR.
   * The wallet is responsible for presenting the transaction to the user.
   *
   * @param txXdr           - Base64-encoded unsigned transaction XDR
   * @param networkPassphrase - Network passphrase for signing context
   */
  signTransaction(txXdr: string, networkPassphrase: string): Promise<string>;

  /**
   * Disconnect / clean up any held session state.
   * Optional — not all wallets support explicit disconnect.
   */
  disconnect?(): Promise<void>;
}

/** Thrown when a wallet operation is rejected by the user or unavailable. */
export class WalletError extends Error {
  constructor(
    message: string,
    public readonly walletName: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "WalletError";
  }
}
