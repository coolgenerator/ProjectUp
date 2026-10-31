import React, { useState } from 'react';
import UnifiedProjectFlow from './UnifiedProjectFlow';
import CompetitionRequirementsInput, { CompetitionRequirements } from '../shared/CompetitionRequirementsInput';

interface CompetitionProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

const CompetitionProjectFlow: React.FC<CompetitionProjectFlowProps> = ({ onBack, onComplete }) => {
  const [requirements, setRequirements] = useState<CompetitionRequirements | null>(null);

  if (!requirements) {
    return (
      <CompetitionRequirementsInput
        onComplete={setRequirements}
        onBack={onBack}
      />
    );
  }

  return (
    <UnifiedProjectFlow
      config={{
        type: 'competition',
        displayName: 'Competition Project',
        color: 'yellow',
        icon: null,
        defaultDurationWeeks: 8,
        defaultTeamSize: 3,
      }}
      requirementsComponent={<div />}
      requirementsData={{
        competition_name: requirements.competitionName,
        competition_type: requirements.competitionType,
        organizer_name: requirements.organizerName,
        deadline: requirements.deadline,
        judging_criteria: requirements.judgingCriteria,
        prize_info: requirements.prizeInfo,
        constraints: requirements.constraints,
      }}
      onBack={() => setRequirements(null)}
      onComplete={onComplete}
    />
  );
};

export default CompetitionProjectFlow;
