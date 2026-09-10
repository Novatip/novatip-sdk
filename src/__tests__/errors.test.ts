/**
 * errors.test.ts
 *
 * The contract's error codes are a public interface: this SDK and the frontend
 * both key user-facing messages on the numbers. These tests exist so the two
 * cannot drift apart silently again, which is what happened when the contract
 * added codes 7 through 12 and parseContractError kept returning null for them.
 */

import {
  ContractErrorCode,
  CONTRACT_ERROR_MESSAGES,
  NovatipContractError,
  parseContractError,
} from "../errors.js";

/**
 * Every variant the tip_splitter contract defines, kept in step with
 * contracts/tip-splitter/src/lib.rs by hand. Adding a code there without
 * adding it here should fail this suite.
 */
const CONTRACT_CODES = [
  ["NotInitialized", 1],
  ["JarExists", 2],
  ["JarNotFound", 3],
  ["InvalidSplits", 4],
  ["InvalidAmount", 5],
  ["TooManyRecipients", 6],
  ["DuplicateRecipient", 7],
  ["MessageTooLong", 8],
  ["InvalidJarId", 9],
  ["SplitsEmpty", 10],
  ["SplitOutOfRange", 11],
  ["SplitSumNot100Pct", 12],
] as const;

describe("ContractErrorCode", () => {
  it.each(CONTRACT_CODES)("maps %s to code %i", (name, code) => {
    expect(ContractErrorCode[name]).toBe(code);
  });

  it("defines no codes the contract does not", () => {
    const numeric = Object.values(ContractErrorCode).filter(
      (v): v is number => typeof v === "number",
    );
    expect(numeric.sort((a, b) => a - b)).toEqual(CONTRACT_CODES.map(([, code]) => code));
  });
});

describe("CONTRACT_ERROR_MESSAGES", () => {
  it.each(CONTRACT_CODES)("has a non-empty message for %s", (_name, code) => {
    const message = CONTRACT_ERROR_MESSAGES[code as ContractErrorCode];
    expect(typeof message).toBe("string");
    expect(message.length).toBeGreaterThan(0);
  });
});

describe("parseContractError", () => {
  it.each(CONTRACT_CODES)("recognises code %i (%s)", (_name, code) => {
    const parsed = parseContractError({ code });
    expect(parsed).toBeInstanceOf(NovatipContractError);
    expect(parsed?.code).toBe(code);
    expect(parsed?.message).toBe(CONTRACT_ERROR_MESSAGES[code as ContractErrorCode]);
  });

  it("reads the code from a `value` field as well as `code`", () => {
    expect(parseContractError({ value: ContractErrorCode.JarNotFound })?.code).toBe(
      ContractErrorCode.JarNotFound,
    );
  });

  it("returns null for anything that is not a known contract code", () => {
    expect(parseContractError({ code: 9999 })).toBeNull();
    expect(parseContractError("not an object")).toBeNull();
    expect(parseContractError(null)).toBeNull();
    expect(parseContractError(undefined)).toBeNull();
  });
});
