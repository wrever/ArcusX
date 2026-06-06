import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { acceptPrivateOffer, rejectPrivateOffer } from '../services/privateOfferService';
import Popup from './Popup';
import '../css/PrivateOfferActions.css';

interface PrivateOfferActionsProps {
  taskId: number;
  workerUserId: number | string;
  onUpdated?: () => void;
}

const PrivateOfferActions = ({ taskId, workerUserId, onUpdated }: PrivateOfferActionsProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null);
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const handleAccept = async () => {
    setLoading('accept');
    try {
      await acceptPrivateOffer(taskId);
      setPopup({
        type: 'success',
        title: t('privateOffer.accept.success.title'),
        message: t('privateOffer.accept.success.message'),
      });
      onUpdated?.();
      navigate(`/supervise-task/${taskId}/${workerUserId}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('privateOffer.accept.error');
      setPopup({ type: 'error', title: t('common.error'), message: msg });
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!window.confirm(t('privateOffer.reject.confirm'))) return;
    setLoading('reject');
    try {
      await rejectPrivateOffer(taskId);
      setPopup({
        type: 'success',
        title: t('privateOffer.reject.success.title'),
        message: t('privateOffer.reject.success.message'),
      });
      onUpdated?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('privateOffer.reject.error');
      setPopup({ type: 'error', title: t('common.error'), message: msg });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="private-offer-actions">
        <button
          type="button"
          className="task-button btn-primary"
          disabled={loading !== null}
          onClick={handleAccept}
        >
          {loading === 'accept' ? t('create.submitting') : t('privateOffer.accept.button')}
        </button>
        <button
          type="button"
          className="task-button"
          disabled={loading !== null}
          onClick={handleReject}
        >
          {loading === 'reject' ? t('create.submitting') : t('privateOffer.reject.button')}
        </button>
      </div>

      {popup ? (
        <Popup
          isOpen
          onClose={() => setPopup(null)}
          type={popup.type}
          title={popup.title}
          message={popup.message}
          buttonText={t('create.popup.ok')}
          onButtonClick={() => setPopup(null)}
        />
      ) : null}
    </>
  );
};

export default PrivateOfferActions;
