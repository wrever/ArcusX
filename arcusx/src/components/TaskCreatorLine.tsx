import UsernameWithVerified from './UsernameWithVerified';
import '../css/TaskCreatorLine.css';

type Props = {
  displayName: string;
  username?: string;
  creatorId?: number;
  verifiedEnterprise?: boolean;
  verifiedIndividual?: boolean;
  pending?: boolean;
  linkToProfile?: boolean;
};

/** Línea de cliente en tarjetas de tarea: razón social + badge KYB o nombre + KYC. */
const TaskCreatorLine: React.FC<Props> = ({
  displayName,
  username,
  creatorId,
  verifiedEnterprise,
  verifiedIndividual,
  pending = false,
  linkToProfile = true,
}) => {
  const name = (displayName || username || '').trim();
  if (!name) return null;

  const ent = Boolean(verifiedEnterprise);
  const ind = Boolean(verifiedIndividual);

  return (
    <span className="task-creator-line">
      <UsernameWithVerified
        name={name}
        userId={creatorId}
        verifiedEnterprise={ent}
        verifiedIndividual={ind}
        pending={pending}
        linkToProfile={linkToProfile && Boolean(creatorId)}
        compact
        tooltipPlacement="below"
        className="task-creator-line__verified"
        nameClassName="task-creator-line__name"
      />
    </span>
  );
};

export default TaskCreatorLine;
