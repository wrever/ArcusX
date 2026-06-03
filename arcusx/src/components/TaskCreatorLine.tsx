import UsernameWithVerified from './UsernameWithVerified';
import '../css/TaskCreatorLine.css';

type Props = {
  displayName: string;
  username?: string;
  creatorId?: number;
  verified?: boolean;
  pending?: boolean;
  linkToProfile?: boolean;
};

/** Línea de cliente en tarjetas de tarea: «San Jorge S.A» + badge o username. */
const TaskCreatorLine: React.FC<Props> = ({
  displayName,
  username,
  creatorId,
  verified = false,
  pending = false,
  linkToProfile = true,
}) => {
  const name = (displayName || username || '').trim();
  if (!name) return null;

  return (
    <span className="task-creator-line">
      <UsernameWithVerified
        name={name}
        userId={creatorId}
        verified={verified}
        pending={pending}
        linkToProfile={linkToProfile && Boolean(creatorId)}
        nameClassName="task-creator-line__name"
      />
    </span>
  );
};

export default TaskCreatorLine;
