import React, { useState } from 'react';
import UnifiedProjectFlow from './UnifiedProjectFlow';
import ProductRequirementsInput, { ProductRequirements } from '../shared/ProductRequirementsInput';

interface ProductProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

const ProductProjectFlow: React.FC<ProductProjectFlowProps> = ({ onBack, onComplete }) => {
  const [requirements, setRequirements] = useState<ProductRequirements | null>(null);

  if (!requirements) {
    return (
      <ProductRequirementsInput
        onComplete={setRequirements}
        onBack={onBack}
      />
    );
  }

  return (
    <UnifiedProjectFlow
      config={{
        type: 'portfolio', // Use portfolio type as product development is similar to personal projects
        displayName: 'Product Development',
        color: 'orange',
        icon: null,
        defaultDurationWeeks: requirements.durationMonths * 4,
        defaultTeamSize: requirements.constraints.teamSize,
      }}
      requirementsComponent={<div />}
      requirementsData={{
        product_idea: requirements.productIdea,
        problem_statement: requirements.problemStatement,
        target_audience: requirements.targetAudience,
        product_type: requirements.productType,
        development_stage: requirements.developmentStage,
        business_model: requirements.businessModel,
        duration_months: requirements.durationMonths,
        constraints: {
          team_size: requirements.constraints.teamSize,
          has_funding: requirements.constraints.hasFunding,
          must_use_tech: requirements.constraints.mustUseTech,
          key_features: requirements.constraints.keyFeatures,
        },
      }}
      onBack={() => setRequirements(null)}
      onComplete={onComplete}
    />
  );
};

export default ProductProjectFlow;
