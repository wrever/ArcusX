// Disabled: backend endpoint upload_milestone_evidence.php is not yet implemented.
// Re-enable this component (restore from git) once the endpoint is deployed.

export interface EvidenceFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

interface EvidenceUploadProps {
  milestoneId: string;
  onEvidenceSubmit: (milestoneId: string, evidence: string, files: EvidenceFile[]) => void;
  loading?: boolean;
  existingEvidence?: string;
  existingFiles?: EvidenceFile[];
}

import React from 'react';

const EvidenceUpload: React.FC<EvidenceUploadProps> = () => null;

export default EvidenceUpload;
