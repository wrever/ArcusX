//! ArcusX single-release escrow — Soroban
//!
//! Una instancia `C…` por engagement. Gestiona USDC on-chain sin cuentas `G…` por tarea.
//! Comisión bilateral: client_fee_bps al fondear, freelancer_fee_bps al liberar.
//!
//! Especificación: docs/escrow-native/CONTRATO.md · Capacidades: CAPABILITY_MATRIX.md

#![no_std]

mod math;
mod storage;
mod types;

use soroban_sdk::{contract, contractimpl, token, Address, Env, Vec};
use types::{
    Distribution, EscrowConfig, EscrowFlags, EscrowSnapshot, EscrowState,
};

use math::{
    client_deposit_required, freelancer_payout, platform_total,
};
use storage::{
    assert_role, get_config, get_flags, get_state, require_not_initialized, set_config,
    set_flags, set_state, validate_config, validate_engagement_id,
};

#[contract]
pub struct ArcusXEscrowContract;

#[contractimpl]
impl ArcusXEscrowContract {
    /// Inicializa el escrow (una vez por instancia desplegada).
    pub fn initialize(env: Env, config: EscrowConfig) {
        require_not_initialized(&env);
        validate_config(&config);
        validate_engagement_id(&config.engagement_id);
        set_config(&env, &config);
        set_state(&env, EscrowState::Initialized);
        set_flags(
            &env,
            &EscrowFlags {
                milestone_completed: false,
                milestone_approved: false,
                disputed: false,
                released: false,
                resolved: false,
            },
        );
        env.events().publish(
            ("init", config.engagement_id.clone()),
            config.roles.approver.clone(),
        );
    }

    /// Vista pública para indexer / Edge / UI.
    pub fn get_snapshot(env: Env) -> EscrowSnapshot {
        let cfg = get_config(&env);
        let token = token::Client::new(&env, &cfg.token);
        let balance = token.balance(&env.current_contract_address());
        EscrowSnapshot {
            state: get_state(&env),
            flags: get_flags(&env),
            balance,
            client_deposit_required: client_deposit_required(
                cfg.worker_amount,
                cfg.client_fee_bps,
            ),
            freelancer_payout: freelancer_payout(
                cfg.worker_amount,
                cfg.freelancer_fee_bps,
            ),
            platform_total: platform_total(
                cfg.worker_amount,
                cfg.client_fee_bps,
                cfg.freelancer_fee_bps,
            ),
        }
    }

    /// Cliente deposita USDC exacto (`client_total`).
    pub fn fund(env: Env, client: Address, amount: i128) {
        client.require_auth();
        let cfg = get_config(&env);
        assert_role(&env, &client, &cfg.roles.approver, "approver");

        let state = get_state(&env);
        if state != EscrowState::Initialized {
            panic!("fund only in Initialized state");
        }

        let flags = get_flags(&env);
        if flags.disputed || flags.released || flags.resolved {
            panic!("escrow closed");
        }

        let required = client_deposit_required(cfg.worker_amount, cfg.client_fee_bps);
        if amount != required {
            panic!("fund amount must equal client_deposit_required");
        }

        let contract = env.current_contract_address();
        let token = token::Client::new(&env, &cfg.token);
        token.transfer(&client, &contract, &amount);

        let on_chain = token.balance(&contract);
        if on_chain < required {
            panic!("insufficient balance after fund");
        }

        set_state(&env, EscrowState::Funded);
        env.events().publish(("funded",), (client, amount));
    }

    /// Freelancer marca milestone completado (paridad TW).
    pub fn complete_milestone(env: Env, service_provider: Address) {
        service_provider.require_auth();
        let cfg = get_config(&env);
        assert_role(
            &env,
            &service_provider,
            &cfg.roles.service_provider,
            "service_provider",
        );

        require_funded_not_terminal(&env);

        let mut flags = get_flags(&env);
        if flags.milestone_completed {
            panic!("milestone already completed");
        }
        flags.milestone_completed = true;
        set_flags(&env, &flags);
        env.events().publish(("milestone_completed",), service_provider);
    }

    /// Cliente aprueba el trabajo (paridad TW `approve_milestone`).
    pub fn approve_milestone(env: Env, approver: Address) {
        approver.require_auth();
        let cfg = get_config(&env);
        assert_role(&env, &approver, &cfg.roles.approver, "approver");

        require_funded_not_terminal(&env);

        let flags = get_flags(&env);
        if !flags.milestone_completed {
            panic!("milestone not completed");
        }
        if flags.milestone_approved {
            panic!("milestone already approved");
        }
        if flags.disputed {
            panic!("cannot approve while disputed");
        }

        let mut flags = flags;
        flags.milestone_approved = true;
        set_flags(&env, &flags);
        env.events().publish(("milestone_approved",), approver);
    }

    /// Libera fondos al receiver + platform (paridad TW `release_funds`).
    pub fn release(env: Env, release_signer: Address) {
        release_signer.require_auth();
        let cfg = get_config(&env);
        assert_role(
            &env,
            &release_signer,
            &cfg.roles.release_signer,
            "release_signer",
        );

        let flags = get_flags(&env);
        if flags.released || flags.resolved {
            panic!("already released or resolved");
        }

        let state = get_state(&env);
        if state != EscrowState::Funded {
            panic!("release only from Funded state");
        }

        if !flags.milestone_approved {
            panic!("milestone not approved");
        }
        if flags.disputed {
            panic!("cannot release while disputed");
        }

        let payout = freelancer_payout(cfg.worker_amount, cfg.freelancer_fee_bps);
        let platform_share =
            platform_total(cfg.worker_amount, cfg.client_fee_bps, cfg.freelancer_fee_bps);

        let contract = env.current_contract_address();
        let token = token::Client::new(&env, &cfg.token);
        let balance = token.balance(&contract);
        let expected = payout
            .checked_add(platform_share)
            .expect("payout overflow");
        if balance < expected {
            panic!("insufficient escrow balance for release");
        }

        let mut flags = flags;
        flags.released = true;
        set_flags(&env, &flags);
        set_state(&env, EscrowState::Completed);

        token.transfer(&contract, &cfg.roles.receiver, &payout);
        token.transfer(&contract, &cfg.roles.platform, &platform_share);
        env.events().publish(
            ("released",),
            (cfg.roles.receiver.clone(), payout, platform_share),
        );
    }

    /// Abre disputa (approver, service_provider o release_signer).
    pub fn dispute(env: Env, signer: Address) {
        signer.require_auth();
        let cfg = get_config(&env);

        let allowed = signer == cfg.roles.approver
            || signer == cfg.roles.service_provider
            || signer == cfg.roles.release_signer;
        if !allowed {
            panic!("unauthorized: cannot open dispute");
        }

        let state = get_state(&env);
        if state != EscrowState::Funded {
            panic!("dispute only from Funded state");
        }

        let flags = get_flags(&env);
        if flags.disputed {
            panic!("already disputed");
        }
        if flags.released || flags.resolved {
            panic!("escrow already terminal");
        }

        let mut flags = flags;
        flags.disputed = true;
        set_flags(&env, &flags);
        set_state(&env, EscrowState::Disputed);
        env.events().publish(("disputed",), signer);
    }

    /// Admin reparte fondos (paridad TW `resolve_dispute`).
    pub fn resolve(env: Env, resolver: Address, distributions: Vec<Distribution>) {
        resolver.require_auth();
        let cfg = get_config(&env);
        assert_role(
            &env,
            &resolver,
            &cfg.roles.dispute_resolver,
            "dispute_resolver",
        );

        let state = get_state(&env);
        if state != EscrowState::Disputed {
            panic!("resolve only from Disputed state");
        }

        let flags = get_flags(&env);
        if !flags.disputed {
            panic!("not in dispute");
        }
        if flags.resolved || flags.released {
            panic!("already resolved or released");
        }

        if distributions.is_empty() {
            panic!("distributions required");
        }
        if distributions.len() > 10 {
            panic!("too many distributions");
        }

        for i in 0..distributions.len() {
            for j in (i + 1)..distributions.len() {
                let a = distributions.get(i).expect("distribution");
                let b = distributions.get(j).expect("distribution");
                if a.address == b.address {
                    panic!("duplicate distribution address");
                }
            }
        }

        let contract = env.current_contract_address();
        let token = token::Client::new(&env, &cfg.token);
        let balance = token.balance(&contract);

        let mut total: i128 = 0;
        for i in 0..distributions.len() {
            let d = distributions.get(i).expect("distribution");
            if d.amount <= 0 {
                panic!("distribution amount must be positive");
            }
            total = total.checked_add(d.amount).expect("distribution overflow");
        }
        if total > balance {
            panic!("distributions exceed balance");
        }

        let mut flags = flags;
        flags.resolved = true;
        flags.disputed = false;
        set_flags(&env, &flags);
        set_state(&env, EscrowState::Resolved);

        for i in 0..distributions.len() {
            let d = distributions.get(i).expect("distribution");
            token.transfer(&contract, &d.address, &d.amount);
        }

        env.events().publish(("resolved",), total);
    }

    /// Recoge USDC residual tras `release` o `resolve` (dust / donaciones accidentales).
    /// Solo `dispute_resolver` (admin). Destino: wallet plataforma.
    pub fn withdraw_dust(env: Env, resolver: Address) {
        resolver.require_auth();
        let cfg = get_config(&env);
        assert_role(
            &env,
            &resolver,
            &cfg.roles.dispute_resolver,
            "dispute_resolver",
        );

        let state = get_state(&env);
        if state != EscrowState::Completed && state != EscrowState::Resolved {
            panic!("withdraw_dust only after Completed or Resolved");
        }

        let flags = get_flags(&env);
        if !flags.released && !flags.resolved {
            panic!("escrow not in terminal flags");
        }

        let contract = env.current_contract_address();
        let token = token::Client::new(&env, &cfg.token);
        let balance = token.balance(&contract);
        if balance <= 0 {
            panic!("no dust to withdraw");
        }

        token.transfer(&contract, &cfg.roles.platform, &balance);
        env.events().publish(("dust_withdrawn",), balance);
    }
}

fn require_funded_not_terminal(env: &Env) {
    let state = get_state(env);
    if state != EscrowState::Funded {
        panic!("requires Funded state");
    }
    let flags = get_flags(env);
    if flags.disputed || flags.released || flags.resolved {
        panic!("escrow terminal or disputed");
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::{StellarAssetClient, TokenClient},
        Address, Env, String,
    };
    use types::EscrowRoles;

    fn setup_token<'a>(
        env: &'a Env,
        admin: &'a Address,
    ) -> (Address, StellarAssetClient<'a>) {
        let sac = env.register_stellar_asset_contract_v2(admin.clone());
        let token_id = sac.address();
        let stellar = StellarAssetClient::new(env, &token_id);
        (token_id, stellar)
    }

    fn base_config(env: &Env, token: &Address) -> EscrowConfig {
        let approver = Address::generate(env);
        let service_provider = Address::generate(env);
        let platform = Address::generate(env);
        let dispute_resolver = Address::generate(env);
        let receiver = Address::generate(env);
        EscrowConfig {
            token: token.clone(),
            roles: EscrowRoles {
                approver: approver.clone(),
                service_provider,
                platform,
                release_signer: approver,
                dispute_resolver,
                receiver,
            },
            worker_amount: 100_000_000,
            client_fee_bps: 150,
            freelancer_fee_bps: 150,
            engagement_id: String::from_str(env, "task-1"),
        }
    }

    #[test]
    fn happy_path_fund_complete_approve_release() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let (token_id, stellar) = setup_token(&env, &admin);
        let contract_id = env.register(ArcusXEscrowContract, ());
        let client = ArcusXEscrowContractClient::new(&env, &contract_id);
        let cfg = base_config(&env, &token_id);
        let approver = cfg.roles.approver.clone();
        let service_provider = cfg.roles.service_provider.clone();
        let receiver = cfg.roles.receiver.clone();
        let platform = cfg.roles.platform.clone();

        client.initialize(&cfg);

        let deposit = client_deposit_required(cfg.worker_amount, cfg.client_fee_bps);
        stellar.mint(&approver, &deposit);
        client.fund(&approver, &deposit);

        client.complete_milestone(&service_provider);
        client.approve_milestone(&approver);
        client.release(&approver);

        let token = TokenClient::new(&env, &token_id);
        let payout = freelancer_payout(cfg.worker_amount, cfg.freelancer_fee_bps);
        let plat = platform_total(
            cfg.worker_amount,
            cfg.client_fee_bps,
            cfg.freelancer_fee_bps,
        );
        assert_eq!(token.balance(&receiver), payout);
        assert_eq!(token.balance(&platform), plat);

        let snap = client.get_snapshot();
        assert_eq!(snap.state, EscrowState::Completed);
        assert!(snap.flags.released);
    }

    #[test]
    #[should_panic(expected = "milestone not approved")]
    fn release_without_approve_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let (token_id, stellar) = setup_token(&env, &admin);
        let contract_id = env.register(ArcusXEscrowContract, ());
        let client = ArcusXEscrowContractClient::new(&env, &contract_id);
        let cfg = base_config(&env, &token_id);
        let approver = cfg.roles.approver.clone();
        let service_provider = cfg.roles.service_provider.clone();

        client.initialize(&cfg);
        let deposit = client_deposit_required(cfg.worker_amount, cfg.client_fee_bps);
        stellar.mint(&approver, &deposit);
        client.fund(&approver, &deposit);
        client.complete_milestone(&service_provider);
        client.release(&approver);
    }

    #[test]
    fn dispute_and_resolve_split() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let (token_id, stellar) = setup_token(&env, &admin);
        let contract_id = env.register(ArcusXEscrowContract, ());
        let client = ArcusXEscrowContractClient::new(&env, &contract_id);
        let cfg = base_config(&env, &token_id);
        let approver = cfg.roles.approver.clone();
        let resolver = cfg.roles.dispute_resolver.clone();

        client.initialize(&cfg);
        let deposit = client_deposit_required(cfg.worker_amount, cfg.client_fee_bps);
        stellar.mint(&approver, &deposit);
        client.fund(&approver, &deposit);
        client.dispute(&approver);

        let mut dist = Vec::new(&env);
        dist.push_back(Distribution {
            address: approver.clone(),
            amount: 50_000_000,
        });
        dist.push_back(Distribution {
            address: cfg.roles.receiver.clone(),
            amount: 51_500_000,
        });
        client.resolve(&resolver, &dist);

        let snap = client.get_snapshot();
        assert_eq!(snap.state, EscrowState::Resolved);
        assert!(snap.flags.resolved);
    }

    #[test]
    #[should_panic(expected = "fund amount must equal")]
    fn fund_wrong_amount_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let (token_id, stellar) = setup_token(&env, &admin);
        let contract_id = env.register(ArcusXEscrowContract, ());
        let client = ArcusXEscrowContractClient::new(&env, &contract_id);
        let cfg = base_config(&env, &token_id);
        let approver = cfg.roles.approver.clone();

        client.initialize(&cfg);
        stellar.mint(&approver, &1_000_000_000);
        client.fund(&approver, &1);
    }

    #[test]
    #[should_panic(expected = "distributions exceed balance")]
    fn resolve_sum_exceeds_balance_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let (token_id, stellar) = setup_token(&env, &admin);
        let contract_id = env.register(ArcusXEscrowContract, ());
        let client = ArcusXEscrowContractClient::new(&env, &contract_id);
        let cfg = base_config(&env, &token_id);
        let approver = cfg.roles.approver.clone();
        let resolver = cfg.roles.dispute_resolver.clone();

        client.initialize(&cfg);
        let deposit = client_deposit_required(cfg.worker_amount, cfg.client_fee_bps);
        stellar.mint(&approver, &deposit);
        client.fund(&approver, &deposit);
        client.dispute(&approver);

        let mut dist = Vec::new(&env);
        dist.push_back(Distribution {
            address: approver.clone(),
            amount: deposit + 1,
        });
        client.resolve(&resolver, &dist);
    }

    #[test]
    #[should_panic(expected = "fund only in Initialized state")]
    fn double_fund_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let (token_id, stellar) = setup_token(&env, &admin);
        let contract_id = env.register(ArcusXEscrowContract, ());
        let client = ArcusXEscrowContractClient::new(&env, &contract_id);
        let cfg = base_config(&env, &token_id);
        let approver = cfg.roles.approver.clone();

        client.initialize(&cfg);
        let deposit = client_deposit_required(cfg.worker_amount, cfg.client_fee_bps);
        stellar.mint(&approver, &(deposit * 2));
        client.fund(&approver, &deposit);
        client.fund(&approver, &deposit);
    }

    #[test]
    #[should_panic(expected = "already released or resolved")]
    fn double_release_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let (token_id, stellar) = setup_token(&env, &admin);
        let contract_id = env.register(ArcusXEscrowContract, ());
        let client = ArcusXEscrowContractClient::new(&env, &contract_id);
        let cfg = base_config(&env, &token_id);
        let approver = cfg.roles.approver.clone();
        let service_provider = cfg.roles.service_provider.clone();

        client.initialize(&cfg);
        let deposit = client_deposit_required(cfg.worker_amount, cfg.client_fee_bps);
        stellar.mint(&approver, &deposit);
        client.fund(&approver, &deposit);
        client.complete_milestone(&service_provider);
        client.approve_milestone(&approver);
        client.release(&approver);
        client.release(&approver);
    }

    #[test]
    fn withdraw_dust_after_release() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let (token_id, stellar) = setup_token(&env, &admin);
        let contract_id = env.register(ArcusXEscrowContract, ());
        let client = ArcusXEscrowContractClient::new(&env, &contract_id);
        let cfg = base_config(&env, &token_id);
        let approver = cfg.roles.approver.clone();
        let service_provider = cfg.roles.service_provider.clone();
        let resolver = cfg.roles.dispute_resolver.clone();
        let platform = cfg.roles.platform.clone();

        client.initialize(&cfg);
        let deposit = client_deposit_required(cfg.worker_amount, cfg.client_fee_bps);
        stellar.mint(&approver, &deposit);
        client.fund(&approver, &deposit);
        client.complete_milestone(&service_provider);
        client.approve_milestone(&approver);
        client.release(&approver);

        let token = TokenClient::new(&env, &token_id);
        stellar.mint(&approver, &5_000_000);
        token.transfer(&approver, &contract_id, &5_000_000);
        assert_eq!(token.balance(&contract_id), 5_000_000);
        client.withdraw_dust(&resolver);
        assert_eq!(token.balance(&contract_id), 0);
        assert_eq!(token.balance(&platform), 3_000_000 + 5_000_000);
    }

    #[test]
    #[should_panic(expected = "duplicate distribution address")]
    fn resolve_duplicate_address_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let (token_id, stellar) = setup_token(&env, &admin);
        let contract_id = env.register(ArcusXEscrowContract, ());
        let client = ArcusXEscrowContractClient::new(&env, &contract_id);
        let cfg = base_config(&env, &token_id);
        let approver = cfg.roles.approver.clone();
        let resolver = cfg.roles.dispute_resolver.clone();

        client.initialize(&cfg);
        let deposit = client_deposit_required(cfg.worker_amount, cfg.client_fee_bps);
        stellar.mint(&approver, &deposit);
        client.fund(&approver, &deposit);
        client.dispute(&approver);

        let mut dist = Vec::new(&env);
        dist.push_back(Distribution {
            address: approver.clone(),
            amount: 50_000_000,
        });
        dist.push_back(Distribution {
            address: approver.clone(),
            amount: 51_500_000,
        });
        client.resolve(&resolver, &dist);
    }

    #[test]
    fn release_signer_distinct_from_approver_happy_path() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let (token_id, stellar) = setup_token(&env, &admin);
        let contract_id = env.register(ArcusXEscrowContract, ());
        let client = ArcusXEscrowContractClient::new(&env, &contract_id);

        let approver = Address::generate(&env);
        let release_signer = Address::generate(&env);
        let service_provider = Address::generate(&env);
        let platform = Address::generate(&env);
        let dispute_resolver = Address::generate(&env);
        let receiver = Address::generate(&env);

        let cfg = EscrowConfig {
            token: token_id.clone(),
            roles: EscrowRoles {
                approver: approver.clone(),
                service_provider: service_provider.clone(),
                platform,
                release_signer: release_signer.clone(),
                dispute_resolver,
                receiver: receiver.clone(),
            },
            worker_amount: 100_000_000,
            client_fee_bps: 150,
            freelancer_fee_bps: 150,
            engagement_id: String::from_str(&env, "deal-rental-1"),
        };

        client.initialize(&cfg);
        let deposit = client_deposit_required(cfg.worker_amount, cfg.client_fee_bps);
        stellar.mint(&approver, &deposit);
        client.fund(&approver, &deposit);
        client.complete_milestone(&service_provider);
        client.approve_milestone(&approver);
        client.release(&release_signer);

        let token = TokenClient::new(&env, &token_id);
        assert_eq!(
            token.balance(&receiver),
            freelancer_payout(cfg.worker_amount, cfg.freelancer_fee_bps)
        );
    }

    #[test]
    #[should_panic(expected = "unauthorized: not release_signer")]
    fn approver_cannot_release_when_signer_differs() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let (token_id, stellar) = setup_token(&env, &admin);
        let contract_id = env.register(ArcusXEscrowContract, ());
        let client = ArcusXEscrowContractClient::new(&env, &contract_id);

        let approver = Address::generate(&env);
        let release_signer = Address::generate(&env);
        let service_provider = Address::generate(&env);
        let sp = service_provider.clone();
        let cfg = EscrowConfig {
            token: token_id,
            roles: EscrowRoles {
                approver: approver.clone(),
                service_provider,
                platform: Address::generate(&env),
                release_signer,
                dispute_resolver: Address::generate(&env),
                receiver: Address::generate(&env),
            },
            worker_amount: 100_000_000,
            client_fee_bps: 150,
            freelancer_fee_bps: 150,
            engagement_id: String::from_str(&env, "deal-1"),
        };

        client.initialize(&cfg);
        let deposit = client_deposit_required(cfg.worker_amount, cfg.client_fee_bps);
        stellar.mint(&approver, &deposit);
        client.fund(&approver, &deposit);
        client.complete_milestone(&sp);
        client.approve_milestone(&approver);
        client.release(&approver);
    }

    #[test]
    #[should_panic(expected = "unauthorized: not dispute_resolver")]
    fn service_provider_cannot_resolve() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let (token_id, stellar) = setup_token(&env, &admin);
        let contract_id = env.register(ArcusXEscrowContract, ());
        let client = ArcusXEscrowContractClient::new(&env, &contract_id);
        let cfg = base_config(&env, &token_id);
        let approver = cfg.roles.approver.clone();
        let sp = cfg.roles.service_provider.clone();

        client.initialize(&cfg);
        let deposit = client_deposit_required(cfg.worker_amount, cfg.client_fee_bps);
        stellar.mint(&approver, &deposit);
        client.fund(&approver, &deposit);
        client.dispute(&approver);

        let mut dist = Vec::new(&env);
        dist.push_back(Distribution {
            address: approver.clone(),
            amount: deposit,
        });
        client.resolve(&sp, &dist);
    }

    #[test]
    #[should_panic(expected = "release only from Funded state")]
    fn release_while_disputed_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let (token_id, stellar) = setup_token(&env, &admin);
        let contract_id = env.register(ArcusXEscrowContract, ());
        let client = ArcusXEscrowContractClient::new(&env, &contract_id);
        let cfg = base_config(&env, &token_id);
        let approver = cfg.roles.approver.clone();
        let service_provider = cfg.roles.service_provider.clone();

        client.initialize(&cfg);
        let deposit = client_deposit_required(cfg.worker_amount, cfg.client_fee_bps);
        stellar.mint(&approver, &deposit);
        client.fund(&approver, &deposit);
        client.complete_milestone(&service_provider);
        client.approve_milestone(&approver);
        client.dispute(&approver);
        client.release(&approver);
    }
}
