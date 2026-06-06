import { useState } from 'react';
import {
  useStartDispute,
  useSendTransaction,
  useGetEscrowFromIndexerByContractIds,
} from '@trustless-work/escrow/hooks';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../i18n/I18nProvider';
import { processPrivateOfferRejectionRefund } from '../services/privateOfferRejectionRefund';
import '../css/PrivateOfferActions.css';

interface PrivateOfferRefundButtonProps {
  taskId: number;
  onRefunded?: () => void;
}

const PrivateOfferRefundButton = ({ taskId, onRefunded }: PrivateOfferRefundButtonProps) => {
  const { t } = useI18n();
  const { address, isConnected, connectWallet, kit } = useWallet();
  const { startDispute } = useStartDispute();
  const { sendTransaction } = useSendTransaction();
  const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRefund = async () => {
    setMessage(null);

    if (!window.confirm(t('privateOffer.refund.confirm'))) {
      return;
    }

    if (!isConnected || !address) {
      await connectWallet();
      return;
    }
    if (!kit) {
      setMessage(t('hire.error.clientWallet'));
      return;
    }

    setLoading(true);
    try {
      const result = await processPrivateOfferRejectionRefund({
        taskId,
        clientAddress: address,
        kit,
        startDispute,
        sendTransaction,
        getEscrowByContractIds: async (contractIds) => {
          const ids = Array.isArray(contractIds) ? contractIds : contractIds.contractIds;
          const res = await getEscrowByContractIds({
            contractIds: ids,
            validateOnChain: Array.isArray(contractIds) ? true : contractIds.validateOnChain ?? true,
          });
          return Array.isArray(res) ? res : (res as { escrows?: unknown[] })?.escrows ?? res;
        },
      });
      setMessage(result.message || t('privateOffer.refund.done'));
      if (result.success) onRefunded?.();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : t('privateOffer.refund.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="private-offer-refund">
      <p className="private-offer-refund__banner">{t('privateOffer.refund.banner')}</p>
      <p className="private-offer-refund__note">{t('privateOffer.refund.disputeNote')}</p>
      <button type="button" className="btn-primary" disabled={loading} onClick={handleRefund}>
        {loading ? t('create.submitting') : t('privateOffer.refund.button')}
      </button>
      {message ? <p className="private-offer-refund__msg">{message}</p> : null}
    </div>
  );
};

export default PrivateOfferRefundButton;
