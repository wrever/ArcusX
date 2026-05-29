use soroban_sdk::{contracttype, Address};

/// Roles fijados al deploy (inmutables tras `initialize`).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowRoles {
    pub approver: Address,
    pub service_provider: Address,
    pub platform: Address,
    pub release_signer: Address,
    pub dispute_resolver: Address,
    pub receiver: Address,
}

/// Configuración inmutable del engagement (single-release v1).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowConfig {
    /// Contrato token Soroban (USDC SAC en testnet/mainnet).
    pub token: Address,
    pub roles: EscrowRoles,
    /// Monto acordado al freelancer (7 decimales, stroops USDC).
    pub worker_amount: i128,
    pub client_fee_bps: u32,
    pub freelancer_fee_bps: u32,
    /// Identificador off-chain (task id) — solo auditoría / eventos.
    pub engagement_id: soroban_sdk::String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowFlags {
    pub milestone_completed: bool,
    pub milestone_approved: bool,
    pub disputed: bool,
    pub released: bool,
    pub resolved: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowState {
    Initialized,
    Funded,
    Disputed,
    Completed,
    Resolved,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Distribution {
    pub address: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowSnapshot {
    pub state: EscrowState,
    pub flags: EscrowFlags,
    pub balance: i128,
    pub client_deposit_required: i128,
    pub freelancer_payout: i128,
    pub platform_total: i128,
}
