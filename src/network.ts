/**
 * network.ts
 *
 * Network configuration and Soroban RPC endpoint helpers for Novatip.
 * Supports testnet, mainnet, and local (Quickstart) environments.
 */

/** Supported Stellar network identifiers. */
export type NetworkName = "testnet" | "mainnet" | "local";

/** Full network configuration consumed by the contract client and indexer. */
export interface NetworkConfig {
  /** Human-readable name. */
  name: NetworkName;
  /** Soroban RPC URL. */
  rpcUrl: string;
  /** Horizon REST API URL. */
  horizonUrl: string;
  /** Network passphrase used when signing transactions. */
  passphrase: string;
  /**
   * USDC Stellar Asset Contract address (C...) for this network.
   * Mainnet value is the canonical Circle USDC SAC.
   */
  usdcContractId: string;
}

/** Well-known network presets. */
export const NETWORKS: Record<NetworkName, NetworkConfig> = {
  testnet: {
    name: "testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    horizonUrl: "https://horizon-testnet.stellar.org",
    passphrase: "Test SDF Network ; September 2015",
    // Testnet USDC SAC (Circle testnet asset)
    usdcContractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  },
  mainnet: {
    name: "mainnet",
    rpcUrl: "https://mainnet.stellar.validationcloud.io/v1/soroban/rpc",
    horizonUrl: "https://horizon.stellar.org",
    passphrase: "Public Global Stellar Network ; September 2015",
    // Canonical Circle USDC SAC on mainnet
    usdcContractId: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
  },
  local: {
    name: "local",
    rpcUrl: "http://localhost:8000/soroban/rpc",
    horizonUrl: "http://localhost:8000",
    passphrase: "Standalone Network ; February 2017",
    // Placeholder — override with your local SAC address
    usdcContractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
  },
};

/**
 * Resolve a NetworkConfig by name.
 *
 * @example
 * const config = getNetwork("testnet");
 */
export function getNetwork(name: NetworkName): NetworkConfig {
  const config = NETWORKS[name];
  return config;
}

/**
 * Build a network config from raw environment variables.
 * Useful for custom deployments that don't match a preset.
 *
 * @example
 * const config = networkFromEnv({
 *   name: "testnet",
 *   rpcUrl: process.env.RPC_URL,
 *   horizonUrl: process.env.HORIZON_URL,
 *   passphrase: process.env.NETWORK_PASSPHRASE,
 *   usdcContractId: process.env.USDC_CONTRACT_ID,
 * });
 */
export function networkFromEnv(env: {
  name: NetworkName;
  rpcUrl: string | undefined;
  horizonUrl: string | undefined;
  passphrase: string | undefined;
  usdcContractId: string | undefined;
}): NetworkConfig {
  if (!env.rpcUrl) throw new Error("networkFromEnv: rpcUrl is required");
  if (!env.horizonUrl) throw new Error("networkFromEnv: horizonUrl is required");
  if (!env.passphrase) throw new Error("networkFromEnv: passphrase is required");
  if (!env.usdcContractId) throw new Error("networkFromEnv: usdcContractId is required");

  return {
    name: env.name,
    rpcUrl: env.rpcUrl,
    horizonUrl: env.horizonUrl,
    passphrase: env.passphrase,
    usdcContractId: env.usdcContractId,
  };
}

/**
 * Returns true if the given string looks like a valid Stellar contract ID (C..., 56 chars).
 */
export function isValidContractId(id: string): boolean {
  return /^C[A-Z2-7]{55}$/.test(id);
}

/**
 * Returns true if the given string looks like a valid Stellar account address (G..., 56 chars).
 */
export function isValidAccountId(id: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(id);
}
