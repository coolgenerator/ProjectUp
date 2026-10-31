import React, { useState } from 'react';
import UnifiedProjectFlow from './UnifiedProjectFlow';
import IndustryRequirementsInput, { IndustryRequirements } from '../shared/IndustryRequirementsInput';

interface IndustryProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

const IndustryProjectFlow: React.FC<IndustryProjectFlowProps> = ({ onBack, onComplete }) => {
  const [requirements, setRequirements] = useState<IndustryRequirements | null>(null);

  if (!requirements) {
    return (
      <IndustryRequirementsInput
        onComplete={setRequirements}
        onBack={onBack}
      />
    );
  }

  return (
    <UnifiedProjectFlow
      config={{
        type: 'industry',
        displayName: 'Industry Project',
        color: 'slate',
        icon: null,
        defaultDurationWeeks: Math.ceil(requirements.durationMonths * 4.33), // More accurate weeks per month
        defaultTeamSize: requirements.constraints.teamSize,
      }}
      requirementsComponent={<div />}
      requirementsData={{
        client_company_name: requirements.clientCompanyName,
        industry_sector: requirements.industrySector,
        project_type: requirements.projectType,
        business_challenge: requirements.businessChallenge,
        project_scope: requirements.projectScope,
        deliverables: requirements.deliverables,
        success_metrics: requirements.successMetrics,
        duration_months: requirements.durationMonths,
        budget_range: requirements.budgetRange,
        constraints: {
          team_size: requirements.constraints.teamSize,
          required_expertise: requirements.constraints.requiredExpertise,
          stakeholders: requirements.constraints.stakeholders,
          compliance: requirements.constraints.compliance,
        },
      }}
      onBack={() => setRequirements(null)}
      onComplete={onComplete}
    />
  );
};

export default IndustryProjectFlow;
