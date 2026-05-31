import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaHandshake } from 'react-icons/fa';
import {
  useApproveMilestone,
  useReleaseFunds,
  useSendTransaction,
  useInitializeEscrow,
  useFundEscrow,
  useGetEscrowFromIndexerByContractIds,
} from '@trustless-work/escrow';
import { useI18n } from '../i18n/I18nProvider';
import { useWallet } from '../hooks/useWallet';
import {
  approveMilestoneTrustlessEscrow,
  releaseFundsTrustlessEscrow,
} from '../services/trustlessWorkEscrowService';
import { getDealDetails, markDealReleased, type AgreementDeal } from '../services/dealsService';
import { createAndFundDealEscrow, funderWallet, type DealEscrowHooks } from '../services/dealEscrow';
import { dealPlatformFeePercent } from '../utils/dealHelpers';
import '../css/DealsPages.css';

const DealWorkspacePage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { address, isConnected, connectWallet, kit } = useWallet();
  const { approveMilestone } = useApproveMilestone();
  const { releaseFunds } = useReleaseFunds();
  const { sendTransaction } = useSendTransaction();
  const { deployEscrow } = useInitializeEscrow();
  const { fundEscrow } = useFundEscrow();
  const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
  const [deal, setDeal] = useState<AgreementDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    getDealDetails(id)
      .then((r) => setDeal(r.deal))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const escrowHooks: DealEscrowHooks = {
    kit,
    deployEscrow: deployEscrow as DealEscrowHooks['deployEscrow'],
    fundEscrow: fundEscrow as DealEscrowHooks['fundEscrow'],
    sendTransaction: sendTransaction as DealEscrowHooks['sendTransaction'],
    getEscrowByContractIds: async (contractIds) => {
      const ids = Array.isArray(contractIds) ? contractIds : contractIds.contractIds;
      const result = await getEscrowByContractIds({
        contractIds: ids,
        validateOnChain: Array.isArray(contractIds) ? true : contractIds.validateOnChain ?? true,
      });
      return Array.isArray(result) ? result : (result as { escrows?: unknown[] })?.escrows ?? result ?? [];
    },
  };

  const isReleaseSigner = deal && address && address === deal.release_signer_wallet;
  const isPayer = deal && address && address === funderWallet(deal);
  const canRelease =
    deal &&
    deal.escrow_contract_id &&
    ['funded', 'active'].includes(deal.status) &&
    isReleaseSigner;
  const canFund =
    deal &&
    deal.status === 'accepted' &&
    !deal.escrow_contract_id &&
    isPayer;

  const handleFund = async () => {
    if (!deal || !address || !kit) return;
    setActionLoading(true);
    setError('');
    try {
      const fresh = await getDealDetails(deal.id);
      const result = await createAndFundDealEscrow({
        deal: fresh.deal,
        funderAddress: address,
        hooks: escrowHooks,
      });
      if (!result.success) throw new Error(result.error);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('deals.error.generic'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!deal?.escrow_contract_id || !address || !kit) return;
    setActionLoading(true);
    setError('');
    try {
      const contractId = deal.escrow_contract_id;
      const approveResult = await approveMilestoneTrustlessEscrow(
        contractId,
        '0',
        address,
        kit,
        approveMilestone,
        sendTransaction,
      );
      if (!approveResult.success && !approveResult.alreadyApproved) {
        throw new Error(approveResult.error || 'Approve failed');
      }
      const releaseResult = await releaseFundsTrustlessEscrow(
        contractId,
        address,
        kit,
        releaseFunds,
        sendTransaction,
      );
      if (!releaseResult.success && !releaseResult.alreadyReleased) {
        throw new Error(releaseResult.error || 'Release failed');
      }
      await markDealReleased(deal.id, releaseResult.txHash);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('deals.error.generic'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="deals-page deals-page--wide">
      <Link to="/dashboard?tab=deals" className="deals-btn secondary" style={{ marginBottom: '1rem', display: 'inline-block' }}>
        {t('deals.back')}
      </Link>
      <h1><FaHandshake /> {t('deals.workspace.title')}</h1>
      <p className="deals-lead">{t('deals.workspace.lead')}</p>

      {loading && <p>{t('deals.loading')}</p>}
      {error && <p className="deals-error" role="alert">{error}</p>}

      {deal && !loading && (
        <div className="deals-form-card">
          <span className={`deals-status-badge ${deal.status}`}>{deal.status}</span>
          <h2>{deal.title}</h2>
          <p>{deal.description}</p>
          <div className="deals-summary-row"><span>{t('deals.wizard.protected')}</span><strong>{Number(deal.amount_usdc).toFixed(2)} USDC</strong></div>
          <div className="deals-summary-row"><span>{t('deals.list.fee')}</span><strong>{dealPlatformFeePercent(deal).toFixed(1)}%</strong></div>
          <div className="deals-summary-row"><span>{t('deals.wizard.totalDeposit')}</span><strong>{Number(deal.client_total).toFixed(2)} USDC</strong></div>
          {deal.escrow_contract_id && (
            <div className="deals-summary-row"><span>Escrow</span><code>{deal.escrow_contract_id.slice(0, 12)}…</code></div>
          )}
          <p className="deals-disclaimer">
            {t('deals.workspace.payer')}: <code>{funderWallet(deal).slice(0, 8)}…</code>
            {' · '}
            {t('deals.workspace.releaser')}: <code>{deal.release_signer_wallet.slice(0, 8)}…</code>
          </p>

          {canFund && (
            <>
              {!isConnected ? (
                <button type="button" className="deals-btn primary" onClick={() => void connectWallet()}>
                  {t('deals.wizard.connectWallet')}
                </button>
              ) : (
                <button type="button" className="deals-btn primary" disabled={actionLoading} onClick={() => void handleFund()}>
                  {actionLoading ? '…' : t('deals.public.fundEscrow')}
                </button>
              )}
            </>
          )}

          {canRelease && (
            <>
              {!isConnected ? (
                <button type="button" className="deals-btn primary" onClick={() => void connectWallet()}>
                  {t('deals.wizard.connectWallet')}
                </button>
              ) : (
                <button type="button" className="deals-btn primary" disabled={actionLoading} onClick={() => void handleRelease()}>
                  {actionLoading ? '…' : t('deals.workspace.release')}
                </button>
              )}
              <p className="deals-disclaimer">{t('deals.workspace.releaseHint')}</p>
            </>
          )}

          {deal.status === 'completed' && (
            <p className="deals-workspace-done">{t('deals.workspace.completed')}</p>
          )}

          <Link to={`/deal/${deal.deal_token}`} className="deals-btn secondary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            {t('deals.workspace.viewLink')}
          </Link>
        </div>
      )}
    </div>
  );
};

export default DealWorkspacePage;
