/**
 * errors.ts
 *
 * Typed error codes mirroring the on-chain `Error` enum from tip_splitter.
 * Allows the SDK and UI to give users meaningful feedback without parsing
 * raw Soroban error integers.
 */

/** On-chain error codes from the tip_splitter contract (repr u32). */
export enum ContractErrorCode {
  NotInitialized = 1,
  JarExists = 2,
  JarNotFound = 3,
  InvalidSplits = 4,
  InvalidAmount = 5,
  TooManyRecipients = 6,
  DuplicateRecipient = 7,
  MessageTooLong = 8,
}

/** Human-readable messages for each contract error code. */
export const CONTRACT_ERROR_MESSAGES: Record<ContractErrorCode, string> = {
  [ContractErrorCode.NotInitialized]: "Contract is not initialised — token address missing.",
  [ContractErrorCode.JarExists]: "A tip jar with this slug already exists.",
  [ContractErrorCode.JarNotFound]: "No tip jar found for this slug.",
  [ContractErrorCode.InvalidSplits]:
    "Splits are invalid — they must be non-empty and sum to exactly 10,000 bps (100%).",
  [ContractErrorCode.InvalidAmount]: "Tip amount must be greater than zero.",
  [ContractErrorCode.TooManyRecipients]: "A jar cannot have more than 20 recipients.",
  [ContractErrorCode.DuplicateRecipient]: "A collaborator cannot be added twice to the same jar.",
  [ContractErrorCode.MessageTooLong]: "Tip message exceeds the 280-byte contract limit.",
};

/** SDK-level error wrapping a contract error code. */
export class NovatipContractError extends Error {
  public readonly code: ContractErrorCode;

  constructor(code: ContractErrorCode) {
    super(CONTRACT_ERROR_MESSAGES[code] ?? `Unknown contract error: ${code}`);
    this.name = "NovatipContractError";
    this.code = code;
  }
}

/** SDK-level error for wallet or transaction issues (not contract errors). */
export class NovatipSdkError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "NovatipSdkError";
  }
}

/**
 * Try to parse a raw Soroban simulation/invocation error into a typed
 * NovatipContractError. Returns null if the error is not a known contract code.
 */
export function parseContractError(raw: unknown): NovatipContractError | null {
  if (typeof raw !== "object" || raw === null) return null;

  // Soroban SDK surfaces contract errors as objects with a `value` or `code` field.
  const maybeCode =
    (raw as Record<string, unknown>)["code"] ?? (raw as Record<string, unknown>)["value"];

  const code = Number(maybeCode);
  if (Object.values(ContractErrorCode).includes(code as ContractErrorCode)) {
    return new NovatipContractError(code as ContractErrorCode);
  }
  return null;
}
