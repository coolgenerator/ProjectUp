import React, { useState } from 'react';
import UnifiedProjectFlow from './UnifiedProjectFlow';
import ExamPrepRequirementsInput, { ExamPrepRequirements } from '../shared/ExamPrepRequirementsInput';

interface ExamPrepProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

const ExamPrepProjectFlow: React.FC<ExamPrepProjectFlowProps> = ({ onBack, onComplete }) => {
  const [requirements, setRequirements] = useState<ExamPrepRequirements | null>(null);

  if (!requirements) {
    return (
      <ExamPrepRequirementsInput
        onComplete={setRequirements}
        onBack={onBack}
      />
    );
  }

  // Calculate weeks until exam
  const examDate = new Date(requirements.examDate);
  const today = new Date();
  const weeksUntilExam = Math.max(1, Math.ceil((examDate.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000)));

  return (
    <UnifiedProjectFlow
      config={{
        type: 'examprep',
        displayName: 'Exam Prep Project',
        color: 'red',
        icon: null,
        defaultDurationWeeks: weeksUntilExam,
        defaultTeamSize: 1,
      }}
      requirementsComponent={<div />}
      requirementsData={{
        exam_name: requirements.examName,
        exam_date: requirements.examDate,
        current_level: requirements.currentLevel,
        target_goal: requirements.targetGoal,
        study_hours_per_week: requirements.studyHoursPerWeek,
        weak_areas: requirements.weakAreas,
        study_materials: requirements.studyMaterials,
        constraints: {
          available_resources: requirements.constraints.availableResources,
          study_buddies: requirements.constraints.studyBuddies,
        },
      }}
      onBack={() => setRequirements(null)}
      onComplete={onComplete}
    />
  );
};

export default ExamPrepProjectFlow;
