ArcusX integrates with the Stellar tech stack as follows. 



Escrows: We use Trustless Work for secure multisig 2-of-2 escrow contracts. The frontend calls Trustless Work RPC to create, fund, approve to release escrow and resolve disputes with on-chain fund distribution. All escrow flows run on Stellar; payments settle in USDC with 3–5 second confirmations. 



Swaps: We integrate Soroswap for native XLM<->USDC swaps inside the platform. We fetch quotes via Soroswap’s API, build Stellar transactions on the client, and submit them after user signing. Wallets & network: Users connect via @creit.tech/stellar-wallets-kit (Freighter as primary only; compatible with other Stellar wallets but not for now). 



We use @stellar/stellar-sdk and Horizon for account checks, balance validation and transaction submission. Signing happens in-browser; we never custody keys. We are live on Stellar Testnet today and will switch the same integration (Trustless Work, Soroswap, Horizon, wallets) to Mainnet for production. 