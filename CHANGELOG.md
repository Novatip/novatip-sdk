# Changelog

All notable changes to `@novatip/sdk` are documented here.

## [Unreleased]

### Added
- `XBullAdapter` - wallet adapter for the xBull browser extension and mobile app
- `shortenAddress(address, prefixLen, suffixLen)` - shorten a Stellar address for display
- `isTestnet(network)` - returns true for testnet and local network environments
- `formatLedger(ledger)` - format a ledger sequence number with thousands separators
- `addressesEqual(a, b)` - case-insensitive Stellar address comparison
- `truncateMessage(message, maxLength)` - truncate a tip message for display

## [0.1.0] - 2025-07-01

### Added
- `TipSplitterClient` - typed contract client for all tip_splitter functions
- `FreighterAdapter` - Freighter browser extension wallet adapter
- `WalletAdapter` interface for implementing custom wallet adapters
- `getNetwork(name)` and `networkFromEnv(env)` - network configuration helpers
- `fetchTipEvents(opts)` and `decodeTipEvent(raw)` - Soroban event parser
- `usdcToStroops`, `stroopsToUsdc`, `formatUsdc` - USDC amount helpers
- `isValidTipAmount`, `validateSplitsBps` - input validation helpers
- `simulateAndAssemble`, `submitAndWait` - transaction builder base
- Full TypeScript types for all contract structs and function parameters
- Dual ESM and CJS build output via tsup
- `NovatipContractError`, `NovatipSdkError`, `WalletError` typed error classes
