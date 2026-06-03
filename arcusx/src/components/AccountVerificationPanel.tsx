import { useEnterpriseMode } from '../hooks/useEnterpriseMode';
import EnterpriseKycPanel from './EnterpriseKycPanel';
import IndividualKycPanel from './IndividualKycPanel';

type Props = {
  onSubmitted?: () => void;
};

/** KYB (portal empresas) o KYC (marketplace público). */
const AccountVerificationPanel: React.FC<Props> = ({ onSubmitted }) => {
  const enterprise = useEnterpriseMode();
  return enterprise ? (
    <EnterpriseKycPanel onSubmitted={onSubmitted} />
  ) : (
    <IndividualKycPanel onSubmitted={onSubmitted} />
  );
};

export default AccountVerificationPanel;
