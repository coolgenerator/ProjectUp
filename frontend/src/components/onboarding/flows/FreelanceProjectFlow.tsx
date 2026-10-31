import React, { useState } from 'react';
import UnifiedProjectFlow from './UnifiedProjectFlow';
import FreelanceRequirementsInput, { FreelanceRequirements } from '../shared/FreelanceRequirementsInput';

interface FreelanceProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

const FreelanceProjectFlow: React.FC<FreelanceProjectFlowProps> = ({ onBack, onComplete }) => {
  const [requirements, setRequirements] = useState<FreelanceRequirements | null>(null);

  if (!requirements) {
    return (
      <FreelanceRequirementsInput
        onComplete={setRequirements}
        onBack={onBack}
      />
    );
  }

  return (
    <UnifiedProjectFlow
      config={{
        type: 'freelance',
        displayName: 'Freelance Project',
        color: 'violet',
        icon: null,
        defaultDurationWeeks: requirements.timelineWeeks,
        defaultTeamSize: requirements.constraints.teamSize,
      }}
      requirementsComponent={<div />}
      requirementsData={{
        client_name: requirements.clientName,
        client_industry: requirements.clientIndustry,
        project_category: requirements.projectCategory,
        project_brief: requirements.projectBrief,
        deliverables: requirements.deliverables,
        payment_structure: requirements.paymentStructure,
        budget_or_rate: requirements.budgetOrRate,
        timeline_weeks: requirements.timelineWeeks,
        communication_preferences: requirements.communicationPreferences,
        specific_requirements: requirements.specificRequirements,
        constraints: {
          team_size: requirements.constraints.teamSize,
          required_skills: requirements.constraints.requiredSkills,
        },
      }}
      onBack={() => setRequirements(null)}
      onComplete={onComplete}
    />
  );
};

export default FreelanceProjectFlow;
