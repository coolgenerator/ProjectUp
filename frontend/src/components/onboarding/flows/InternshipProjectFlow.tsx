import React, { useState } from 'react';
import UnifiedProjectFlow from './UnifiedProjectFlow';
import InternshipRequirementsInput, { InternshipRequirements } from '../shared/InternshipRequirementsInput';

interface InternshipProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

const InternshipProjectFlow: React.FC<InternshipProjectFlowProps> = ({ onBack, onComplete }) => {
  const [requirements, setRequirements] = useState<InternshipRequirements | null>(null);

  if (!requirements) {
    return (
      <InternshipRequirementsInput
        onComplete={setRequirements}
        onBack={onBack}
      />
    );
  }

  return (
    <UnifiedProjectFlow
      config={{
        type: 'internship',
        displayName: 'Internship Project',
        color: 'indigo',
        icon: null,
        defaultDurationWeeks: requirements.durationMonths * 4,
        defaultTeamSize: 1,
      }}
      requirementsComponent={<div />}
      requirementsData={{
        company_name: requirements.companyName,
        project_name: requirements.projectName,
        mentor_name: requirements.mentorName,
        business_objectives: requirements.businessObjectives,
        deliverables: requirements.deliverables,
        duration_months: requirements.durationMonths,
        constraints: {
          required_tech: requirements.constraints.requiredTech,
          stakeholders: requirements.constraints.stakeholders,
        },
      }}
      onBack={() => setRequirements(null)}
      onComplete={onComplete}
    />
  );
};

export default InternshipProjectFlow;
