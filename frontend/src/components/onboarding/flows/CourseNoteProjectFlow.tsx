import React, { useState } from 'react';
import UnifiedProjectFlow from './UnifiedProjectFlow';
import CourseNoteRequirementsInput, { CourseNoteRequirements } from '../shared/CourseNoteRequirementsInput';

interface CourseNoteProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

const CourseNoteProjectFlow: React.FC<CourseNoteProjectFlowProps> = ({ onBack, onComplete }) => {
  const [requirements, setRequirements] = useState<CourseNoteRequirements | null>(null);

  if (!requirements) {
    return (
      <CourseNoteRequirementsInput
        onComplete={setRequirements}
        onBack={onBack}
      />
    );
  }

  return (
    <UnifiedProjectFlow
      config={{
        type: 'coursenote',
        displayName: 'Course Note Project',
        color: 'teal',
        icon: null,
        defaultDurationWeeks: requirements.durationWeeks,
        defaultTeamSize: 1,
      }}
      requirementsComponent={<div />}
      requirementsData={{
        course_name: requirements.courseName,
        school: requirements.school,
        instructor: requirements.instructor,
        target_audience: requirements.targetAudience,
        content_format: requirements.contentFormat,
        coverage: requirements.coverage,
        specific_topics: requirements.specificTopics,
        duration_weeks: requirements.durationWeeks,
      }}
      onBack={() => setRequirements(null)}
      onComplete={onComplete}
    />
  );
};

export default CourseNoteProjectFlow;
