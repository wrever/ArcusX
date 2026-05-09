import React, { useMemo } from 'react';
import { FaClock, FaCheckCircle, FaExclamationTriangle, FaLock, FaFlagCheckered } from 'react-icons/fa';
import '../css/EscrowLifecycle.css';

export type EscrowLifecycleStatus =
  | 'active'
  | 'released'
  | 'completed'
  | 'disputed'
  | 'refunded'
  | 'resolved'
  | string;

interface EscrowLifecycleProps {
  status: EscrowLifecycleStatus;
  /** Optional: ISO date when work was submitted/completed */
  completedAt?: string | null;
  /** Optional: enable auto-release countdown (simulated) */
  autoReleaseHours?: number;
}

/**
 * EscrowLifecycle
 * Visual timeline + countdown to make escrow feel "smart contract real".
 * Works even if backend doesn't expose every intermediate timestamp yet.
 */
const EscrowLifecycle: React.FC<EscrowLifecycleProps> = ({ status, completedAt, autoReleaseHours = 48 }) => {
  const normalized = (status || '').toLowerCase();

  const steps = useMemo(() => {
    const base = [
      { id: 'pending', label: 'Pending', icon: <FaClock /> },
      { id: 'locked', label: 'Locked', icon: <FaLock /> },
      { id: 'submitted', label: 'Work submitted', icon: <FaFlagCheckered /> },
      { id: 'released', label: 'Released', icon: <FaCheckCircle /> },
    ];

    const terminal =
      normalized === 'disputed'
        ? { id: 'disputed', label: 'Disputed', icon: <FaExclamationTriangle /> }
        : normalized === 'refunded'
          ? { id: 'refunded', label: 'Refunded', icon: <FaExclamationTriangle /> }
          : null;

    return terminal ? [...base, terminal] : base;
  }, [normalized]);

  const activeIndex = useMemo(() => {
    if (normalized === 'disputed') return 4;
    if (normalized === 'refunded') return 4;
    if (normalized === 'released') return 3;
    if (normalized === 'completed' || normalized === 'resolved') return 3;
    if (normalized === 'active') return 1;
    return 0;
  }, [normalized]);

  const countdown = useMemo(() => {
    if (!completedAt) return null;
    if (!(normalized === 'completed' || normalized === 'resolved' || normalized === 'active')) return null;

    const done = new Date(completedAt).getTime();
    if (Number.isNaN(done)) return null;
    const end = done + autoReleaseHours * 60 * 60 * 1000;
    const now = Date.now();
    const ms = Math.max(0, end - now);

    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return { hours, minutes, isOver: ms === 0 };
  }, [completedAt, autoReleaseHours, normalized]);

  return (
    <div className="escrow-lifecycle">
      <div className="escrow-lifecycle-header">
        <div className="escrow-lifecycle-title">Escrow lifecycle</div>
        <div className={`escrow-lifecycle-pill ${normalized}`}>
          {normalized || 'pending'}
        </div>
      </div>

      <div className="escrow-steps">
        {steps.map((s, idx) => {
          const state = idx < activeIndex ? 'done' : idx === activeIndex ? 'current' : 'todo';
          return (
            <div key={s.id} className={`escrow-step ${state}`}>
              <div className="escrow-step-icon">{s.icon}</div>
              <div className="escrow-step-label">{s.label}</div>
              {idx < steps.length - 1 && <div className="escrow-step-line" />}
            </div>
          );
        })}
      </div>

      {countdown && (
        <div className="escrow-countdown">
          <FaClock />
          <span>
            {countdown.isOver
              ? 'Auto-release window ended'
              : `Auto-release in ${countdown.hours}h ${countdown.minutes}m`}
          </span>
        </div>
      )}
    </div>
  );
};

export default EscrowLifecycle;
