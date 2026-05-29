/// Aritmética de comisiones — debe coincidir con `docs/escrow-native/supabase/functions/_shared/fees.ts`

pub const MAX_TOTAL_FEE_BPS: u32 = 9_900;
pub const BPS_DENOM: i128 = 10_000;

pub fn fee_from_bps(amount: i128, bps: u32) -> i128 {
    amount
        .checked_mul(bps as i128)
        .expect("fee overflow")
        .checked_div(BPS_DENOM)
        .expect("fee div")
}

pub fn client_deposit_required(worker_amount: i128, client_fee_bps: u32) -> i128 {
    worker_amount + fee_from_bps(worker_amount, client_fee_bps)
}

pub fn freelancer_payout(worker_amount: i128, freelancer_fee_bps: u32) -> i128 {
    worker_amount - fee_from_bps(worker_amount, freelancer_fee_bps)
}

pub fn platform_total(
    worker_amount: i128,
    client_fee_bps: u32,
    freelancer_fee_bps: u32,
) -> i128 {
    let deposit = client_deposit_required(worker_amount, client_fee_bps);
    let payout = freelancer_payout(worker_amount, freelancer_fee_bps);
    deposit - payout
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bilateral_150_bps_matches_arcusx_quote() {
        let worker = 100_000_000i128; // 100 USDC (7 decimals)
        let client = client_deposit_required(worker, 150);
        let payout = freelancer_payout(worker, 150);
        let platform = platform_total(worker, 150, 150);
        assert_eq!(client, 101_500_000);
        assert_eq!(payout, 98_500_000);
        assert_eq!(platform, 3_000_000);
        assert_eq!(client, payout + platform);
    }
}
