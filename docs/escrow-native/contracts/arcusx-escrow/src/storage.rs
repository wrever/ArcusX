use soroban_sdk::{contracttype, Address, Env, String};

use crate::math::MAX_TOTAL_FEE_BPS;
use crate::types::{EscrowConfig, EscrowFlags, EscrowState};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Config,
    State,
    Flags,
}

pub fn require_not_initialized(env: &Env) {
    if env.storage().instance().has(&DataKey::Config) {
        panic!("escrow already initialized");
    }
}

pub fn set_config(env: &Env, config: &EscrowConfig) {
    env.storage().instance().set(&DataKey::Config, config);
}

pub fn get_config(env: &Env) -> EscrowConfig {
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .expect("config missing")
}

pub fn set_state(env: &Env, state: EscrowState) {
    env.storage().instance().set(&DataKey::State, &state);
}

pub fn get_state(env: &Env) -> EscrowState {
    env.storage()
        .instance()
        .get(&DataKey::State)
        .unwrap_or(EscrowState::Initialized)
}

pub fn set_flags(env: &Env, flags: &EscrowFlags) {
    env.storage().instance().set(&DataKey::Flags, flags);
}

pub fn get_flags(env: &Env) -> EscrowFlags {
    env.storage().instance().get(&DataKey::Flags).unwrap_or(
        EscrowFlags {
            milestone_completed: false,
            milestone_approved: false,
            disputed: false,
            released: false,
            resolved: false,
        },
    )
}

pub fn assert_role(_env: &Env, who: &Address, expected: &Address, role_name: &str) {
    if who != expected {
        panic!("unauthorized: not {}", role_name);
    }
}

/// Mínimo 0,1 USDC (7 decimales) — evita fees redondeados a 0.
pub const MIN_WORKER_AMOUNT: i128 = 1_000_000;

pub fn validate_config(config: &EscrowConfig) {
    if config.worker_amount < MIN_WORKER_AMOUNT {
        panic!("worker_amount below minimum");
    }
    if config.client_fee_bps > MAX_TOTAL_FEE_BPS
        || config.freelancer_fee_bps > MAX_TOTAL_FEE_BPS
    {
        panic!("fee bps out of range");
    }
    let total_bps = config.client_fee_bps + config.freelancer_fee_bps;
    if total_bps > MAX_TOTAL_FEE_BPS {
        panic!("total fee bps exceeds max");
    }
    if config.roles.platform == config.roles.receiver {
        panic!("platform and receiver must differ");
    }
}

pub fn validate_engagement_id(id: &String) {
    if id.len() == 0 || id.len() > 64 {
        panic!("invalid engagement_id length");
    }
}
