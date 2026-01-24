import React from 'react';
import { FaGavel, FaInfoCircle, FaUser, FaWallet, FaFileAlt } from 'react-icons/fa';
import DisputeTimelineView from './DisputeTimelineView';
import DisputeFilesView from './DisputeFilesView';
import '../css/DisputeCaseView.css';

interface DisputeCaseViewProps {
  dispute: any;
}

/**
 * DisputeCaseView
 * "Case file" view: header + timeline + evidence panel.
 * Makes disputes feel like a real arbitration workflow (Web3-native).
 */
const DisputeCaseView: React.FC<DisputeCaseViewProps> = ({ dispute }) => {
  return (
    <div className="dispute-case">
      <div className="dispute-case-header">
        <div className="dispute-case-title">
          <FaGavel />
          <div>
            <div className="dispute-case-id">Case #{dispute?.id}</div>
            <div className="dispute-case-sub">
              Task #{dispute?.task_id} · {dispute?.task_title || 'Untitled'}
            </div>
          </div>
        </div>

        <div className={`dispute-case-status ${String(dispute?.status || '').toLowerCase()}`}>
          {dispute?.status || 'pending'}
        </div>
      </div>

      <div className="dispute-case-grid">
        <div className="dispute-case-card">
          <div className="dispute-case-card-title"><FaInfoCircle /> Overview</div>
          <div className="dispute-case-kv">
            <div className="kv">
              <span className="k">Created</span>
              <span className="v">{dispute?.created_at ? new Date(dispute.created_at).toLocaleString() : '—'}</span>
            </div>
            <div className="kv">
              <span className="k">Price</span>
              <span className="v">{dispute?.task_price ? `${parseFloat(dispute.task_price).toFixed(2)} USDC` : '—'}</span>
            </div>
            <div className="kv">
              <span className="k">Escrow</span>
              <span className="v mono">{dispute?.escrow_id ? `${String(dispute.escrow_id).slice(0,8)}…${String(dispute.escrow_id).slice(-6)}` : '—'}</span>
            </div>
          </div>
        </div>

        <div className="dispute-case-card">
          <div className="dispute-case-card-title"><FaUser /> Parties</div>
          <div className="dispute-case-kv">
            <div className="kv">
              <span className="k">Client</span>
              <span className="v">{dispute?.client_username || `#${dispute?.client_id ?? '—'}`}</span>
            </div>
            <div className="kv">
              <span className="k">Worker</span>
              <span className="v">{dispute?.worker_username || `#${dispute?.worker_id ?? '—'}`}</span>
            </div>
            {(dispute?.client_wallet || dispute?.worker_wallet) && (
              <div className="kv wallets">
                <span className="k"><FaWallet /> Wallets</span>
                <span className="v mono">
                  {dispute?.client_wallet ? `Client: ${dispute.client_wallet}` : ''}
                  {dispute?.client_wallet && dispute?.worker_wallet ? ' · ' : ''}
                  {dispute?.worker_wallet ? `Worker: ${dispute.worker_wallet}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dispute-case-split">
        <div className="dispute-case-card">
          <div className="dispute-case-card-title">Timeline</div>
          <DisputeTimelineView disputeId={dispute.id} />
        </div>

        <div className="dispute-case-card">
          <div className="dispute-case-card-title"><FaFileAlt /> Evidence</div>
          <div className="dispute-case-evidence">
            <DisputeFilesView disputeId={dispute.id} />
          </div>
        </div>
      </div>

      {(dispute?.resolution_decision || dispute?.resolved_at) && (
        <div className="dispute-case-card resolution">
          <div className="dispute-case-card-title">Resolution</div>
          <div className="dispute-case-kv">
            <div className="kv">
              <span className="k">Decision</span>
              <span className="v">{dispute?.resolution_decision || '—'}</span>
            </div>
            <div className="kv">
              <span className="k">Resolved at</span>
              <span className="v">{dispute?.resolved_at ? new Date(dispute.resolved_at).toLocaleString() : '—'}</span>
            </div>
            {dispute?.resolution_reason && (
              <div className="kv full">
                <span className="k">Reason</span>
                <span className="v">{dispute.resolution_reason}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputeCaseView;
