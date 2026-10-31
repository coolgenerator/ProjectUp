import React, { useState } from 'react';
import UnifiedProjectFlow from './UnifiedProjectFlow';
import PortfolioRequirementsInput, { PortfolioRequirements } from '../shared/PortfolioRequirementsInput';

interface PortfolioProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

const PortfolioProjectFlow: React.FC<PortfolioProjectFlowProps> = ({ onBack, onComplete }) => {
  const [requirements, setRequirements] = useState<PortfolioRequirements | null>(null);

  if (!requirements) {
    return (
      <PortfolioRequirementsInput
        onComplete={setRequirements}
        onBack={onBack}
      />
    );
  }

  return (
    <UnifiedProjectFlow
      config={{
        type: 'portfolio',
        displayName: 'Portfolio Project',
        color: 'pink',
        icon: null,
        defaultDurationWeeks: requirements.durationWeeks,
        defaultTeamSize: 1,
      }}
      requirementsComponent={<div />}
      requirementsData={{
        career_goal: requirements.careerGoal,
        target_audience: requirements.targetAudience,
        skills_to_showcase: requirements.skillsToShowcase,
        project_complexity: requirements.projectComplexity,
        showcase_platform: requirements.showcasePlatform,
        duration_weeks: requirements.durationWeeks,
        constraints: {
          must_use_tech: requirements.constraints.mustUseTech,
          project_type: requirements.constraints.projectType,
        },
      }}
      onBack={() => setRequirements(null)}
      onComplete={onComplete}
    />
  );
};

export default PortfolioProjectFlow;
