import React, { useState } from 'react';
import UnifiedProjectFlow from './UnifiedProjectFlow';
import OpenSourceRequirementsInput, { OpenSourceRequirements } from '../shared/OpenSourceRequirementsInput';

interface OpenSourceProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

const OpenSourceProjectFlow: React.FC<OpenSourceProjectFlowProps> = ({ onBack, onComplete }) => {
  const [requirements, setRequirements] = useState<OpenSourceRequirements | null>(null);

  if (!requirements) {
    return (
      <OpenSourceRequirementsInput
        onComplete={setRequirements}
        onBack={onBack}
      />
    );
  }

  return (
    <UnifiedProjectFlow
      config={{
        type: 'opensource',
        displayName: 'Open Source Project',
        color: 'green',
        icon: null,
        defaultDurationWeeks: 12,
        defaultTeamSize: 1,
      }}
      requirementsComponent={<div />}
      requirementsData={{
        project_name: requirements.projectName,
        repository_url: requirements.repositoryUrl,
        contribution_area: requirements.contributionArea,
        skill_level: requirements.skillLevel,
        time_commitment_hours: requirements.timeCommitmentHours,
        languages: requirements.languages,
        preferred_issue_types: requirements.preferredIssueTypes,
      }}
      onBack={() => setRequirements(null)}
      onComplete={onComplete}
    />
  );
};

export default OpenSourceProjectFlow;
