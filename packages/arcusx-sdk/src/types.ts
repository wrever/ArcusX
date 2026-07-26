export type ArcusXCurrency = 'USDC';
export type Network = 'testnet' | 'mainnet';
export type WorkEntry = 'marketplace' | 'private' | 'deal';

export interface RequestOptions {
  idempotencyKey?: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { request_id?: string; api_version?: string };
  message?: string;
}

export interface TaskSummary {
  id: number;
  title: string;
  price: number;
  currency: string;
  status: string;
  category?: string;
  difficulty?: string;
  created_at?: string;
}

export interface TaskDetails extends TaskSummary {
  subtitle?: string;
  description?: string;
  user_id?: string;
  is_private_invite?: boolean;
  invited_user_id?: number | null;
  escrow_id?: string | null;
  escrow_status?: string | null;
  partner_id?: string | null;
  external_id?: string | null;
}

export interface DealSummary {
  id: string;
  deal_token: string;
  title: string;
  status: string;
  amount_usdc?: number;
  client_total?: number;
  template_id?: string;
}

export interface AgreementDeal extends DealSummary {
  description?: string;
  initiator_user_id?: number;
  counterparty_user_id?: number | null;
  initiator_wallet?: string;
  beneficiary_wallet?: string;
  release_signer_wallet?: string;
  funder_role?: 'initiator' | 'counterparty';
  fee_usdc?: number;
  platform_fee_rate?: number;
  escrow_contract_id?: string | null;
  partner_id?: string | null;
  external_id?: string | null;
}

export interface EscrowStatus {
  task_id?: number;
  escrow_id?: string | null;
  escrow_status?: string | null;
  escrow_release_tx_hash?: string | null;
  escrow_fund_tx_hash?: string | null;
  escrow_amount?: number | null;
}

export interface PlatformFeeResponse {
  platform_fee: number;
  platform_fee_percent?: number;
}

export interface MarketStatsResponse {
  total_tasks?: number;
  total_users?: number;
  total_volume_usdc?: number;
  [key: string]: unknown;
}

export interface CreateTaskInput {
  user_id: number;
  title: string;
  description: string;
  price: number;
  currency?: ArcusXCurrency;
  category: string;
  difficulty: string;
  subtitle?: string;
  is_private_invite?: boolean;
  invited_user_id?: number;
  external_id?: string;
}

export interface ApplyTaskInput {
  message: string;
  walletAddress: string;
  applicantId?: number;
}

export interface TaskProposal {
  id: number;
  task_id: number;
  applicant_id: number;
  message?: string;
  portfolio_url?: string | null;
  worker_wallet_address?: string;
  created_at?: string;
  status?: string;
  applicant_username?: string;
  applicant_email?: string;
}

export interface CreateDealInput {
  template_id: string;
  title: string;
  description: string;
  amount_usdc: number;
  initiator_wallet: string;
  beneficiary_wallet: string;
  release_signer_wallet: string;
  funder_role: 'initiator' | 'counterparty';
  counterparty_wallet?: string;
  external_id?: string;
}

export interface FinalizePrivateOfferInput {
  task_id?: number;
  invited_user_id?: number;
  worker_wallet_address?: string;
  escrow_id: string;
  transaction_hash?: string;
  deploy_transaction_hash?: string;
  escrow_amount?: number;
  platform_fee?: number;
  trustline_address?: string;
  [key: string]: unknown;
}

export interface CreateEscrowInput {
  task_id?: number;
  proposal_id?: number;
  escrow_id?: string;
  contract_address?: string;
  transaction_hash?: string;
  funding_confirmed?: boolean;
  escrow_amount?: number;
  platform_fee?: number;
  client_wallet_address?: string;
  [key: string]: unknown;
}

export interface CompleteTaskInput {
  task_id?: number;
  action?: 'accept' | 'complete' | string;
  tx_hash?: string;
  rating?: number;
  rated_user_id?: number;
}

export interface MarkDealReleasedInput {
  agreement_id?: string;
  transaction_hash: string;
  rating?: number;
  rated_user_id?: number;
}

export interface ApiErrorBody {
  success?: false;
  error?: string;
  message?: string;
}

export interface EscrowQuote {
  nominal: number;
  workerNet: number;
  clientTotal: number;
  clientVisibleFee: number;
  fundAmount: number;
  platformCommission: number;
  protocolCommission: number;
  totalCommission: number;
  platformFee: number;
}

export interface EscrowQuoteResponse {
  currency: string;
  network: string;
  quote: EscrowQuote;
}

export interface DisputeSummary {
  dispute_id: number;
  status: string;
  reason?: string;
  resolution?: unknown;
  resolved_at?: string | null;
  created_at?: string;
  user_role?: string;
  entry?: 'marketplace' | 'deal';
  task_id?: number;
  task_title?: string;
  agreement_id?: string;
  deal_title?: string;
  price?: number;
  amount_usdc?: number;
  escrow_id?: string | null;
  escrow_status?: string | null;
}

export interface CreateDisputeInput {
  reason: string;
  task_id?: number;
  agreement_id?: string;
  tx_hash?: string;
}

export interface CreateRatingInput {
  rated_user_id: number;
  rating: number;
  review?: string;
  task_id?: number;
  agreement_id?: string;
}

export interface RegisterWalletInput {
  wallet_address: string;
  user_id?: number;
}

export interface VerifyWalletInput {
  wallet_address: string;
  signature: string;
  user_id?: number;
}

export type ExecutorType = 'human' | 'agent' | 'service';
export type CompletionCondition =
  | 'manual_approve'
  | 'api_callback'
  | 'webhook_attestation'
  | 'verifier_agent'
  | 'certix_approved';

export interface JobDetails {
  id: string;
  title: string;
  description?: string | null;
  payer_wallet?: string | null;
  status: string;
  external_ref?: string | null;
  partner_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  subjobs?: SubjobDetails[];
}

export interface SubjobDetails {
  id: string;
  job_id: string;
  task_id?: number | null;
  proposal_id?: number | null;
  external_ref?: string | null;
  executor_type: ExecutorType;
  executor_wallet: string;
  executor_user_id?: number | null;
  worker_amount: number;
  completion_condition: CompletionCondition;
  verification_policy?: Record<string, unknown>;
  status: string;
  escrow_contract_id?: string | null;
  attestation_hash?: string | null;
  released_at?: string | null;
  created_at?: string;
  updated_at?: string;
  escrow?: SubjobEscrowSnapshot;
  job?: Pick<JobDetails, 'id' | 'title' | 'status' | 'payer_wallet'>;
}

export interface SubjobEscrowSnapshot {
  task_id?: number;
  task_status?: string;
  escrow_id?: string | null;
  escrow_status?: string | null;
  escrow_amount?: number | null;
  escrow_fund_tx_hash?: string | null;
  escrow_release_tx_hash?: string | null;
  escrow_deploy_tx_hash?: string | null;
  worker_started_at?: string | null;
  worker_accepted_completion?: boolean;
  client_accepted_completion?: boolean;
}

export interface CreateJobInput {
  title: string;
  description?: string;
  payer_wallet?: string;
  external_ref?: string;
  metadata?: Record<string, unknown>;
  status?: string;
}

export interface CreateSubjobInput {
  executor_wallet?: string;
  worker_amount: number;
  executor_type?: ExecutorType;
  executor_user_id?: number;
  completion_condition?: CompletionCondition;
  verification_policy?: Record<string, unknown>;
  external_ref?: string;
  title?: string;
  description?: string;
  instructions?: string;
  subtitle?: string;
  application_message?: string;
}

export interface AttestSubjobInput {
  status?: 'completed' | string;
  evidence?: Record<string, unknown>;
}

export interface SubjobEscrowQuoteResponse {
  subjob_id: string;
  worker_amount: number;
  platform_fee_rate: number;
  quote: EscrowQuote;
}
