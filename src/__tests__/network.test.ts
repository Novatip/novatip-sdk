/**
 * network.test.ts
 *
 * Unit tests for network configuration helpers in src/network.ts.
 */

import {
  getNetwork,
  networkFromEnv,
  isValidContractId,
  isValidAccountId,
  NETWORKS,
} from "../network.js";
import type { NetworkName } from "../network.js";

// ---------------------------------------------------------------------------
// getNetwork
// ---------------------------------------------------------------------------
describe("getNetwork", () => {
  const names: NetworkName[] = ["testnet", "mainnet", "local"];

  it.each(names)("returns a config object for %s", (name) => {
    const config = getNetwork(name);
    expect(config.name).toBe(name);
    expect(config.rpcUrl).toBeTruthy();
    expect(config.horizonUrl).toBeTruthy();
    expect(config.passphrase).toBeTruthy();
    expect(config.usdcContractId).toBeTruthy();
  });

  it("returns the exact same object as NETWORKS preset", () => {
    expect(getNetwork("testnet")).toBe(NETWORKS["testnet"]);
    expect(getNetwork("mainnet")).toBe(NETWORKS["mainnet"]);
    expect(getNetwork("local")).toBe(NETWORKS["local"]);
  });

  it("testnet passphrase contains 'Test SDF'", () => {
    expect(getNetwork("testnet").passphrase).toContain("Test SDF");
  });

  it("mainnet passphrase contains 'Public Global Stellar Network'", () => {
    expect(getNetwork("mainnet").passphrase).toContain("Public Global Stellar Network");
  });

  it("local rpcUrl points to localhost", () => {
    expect(getNetwork("local").rpcUrl).toContain("localhost");
  });
});

// ---------------------------------------------------------------------------
// networkFromEnv
// ---------------------------------------------------------------------------
describe("networkFromEnv", () => {
  const validEnv = {
    name: "testnet" as NetworkName,
    rpcUrl: "https://rpc.example.com",
    horizonUrl: "https://horizon.example.com",
    passphrase: "Test Passphrase",
    usdcContractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  };

  it("returns a NetworkConfig when all values are provided", () => {
    const config = networkFromEnv(validEnv);
    expect(config.name).toBe("testnet");
    expect(config.rpcUrl).toBe(validEnv.rpcUrl);
    expect(config.horizonUrl).toBe(validEnv.horizonUrl);
    expect(config.passphrase).toBe(validEnv.passphrase);
    expect(config.usdcContractId).toBe(validEnv.usdcContractId);
  });

  it("throws when rpcUrl is undefined", () => {
    expect(() => networkFromEnv({ ...validEnv, rpcUrl: undefined })).toThrow("rpcUrl is required");
  });

  it("throws when horizonUrl is undefined", () => {
    expect(() => networkFromEnv({ ...validEnv, horizonUrl: undefined })).toThrow(
      "horizonUrl is required",
    );
  });

  it("throws when passphrase is undefined", () => {
    expect(() => networkFromEnv({ ...validEnv, passphrase: undefined })).toThrow(
      "passphrase is required",
    );
  });

  it("throws when usdcContractId is undefined", () => {
    expect(() => networkFromEnv({ ...validEnv, usdcContractId: undefined })).toThrow(
      "usdcContractId is required",
    );
  });
});

// ---------------------------------------------------------------------------
// isValidContractId
// ---------------------------------------------------------------------------
describe("isValidContractId", () => {
  it("accepts a valid contract ID", () => {
    expect(isValidContractId("CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA")).toBe(
      true,
    );
  });

  it("accepts the mainnet USDC SAC", () => {
    expect(isValidContractId("CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75")).toBe(
      true,
    );
  });

  it("rejects an account address (starts with G)", () => {
    expect(isValidContractId("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")).toBe(
      false,
    );
  });

  it("rejects a string that is too short", () => {
    expect(isValidContractId("CSHORT")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidContractId("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidAccountId
// ---------------------------------------------------------------------------
describe("isValidAccountId", () => {
  it("accepts a valid account address", () => {
    expect(isValidAccountId("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")).toBe(true);
  });

  it("rejects a contract ID (starts with C)", () => {
    expect(isValidAccountId("CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA")).toBe(
      false,
    );
  });

  it("rejects a short string", () => {
    expect(isValidAccountId("GSHORT")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidAccountId("")).toBe(false);
  });
});
