import React, { useState, useRef, useEffect } from 'react';
import { TaskStatus } from '../../../types/task';
import { MilestoneStatus } from '../../../types/project/milestone';
import { Section } from '../../../types/task';
import { Milestone } from '../../../types/project/milestone';

interface Option {
  value: string | number;
  label: string;
  color?: string;
  icon?: React.ReactNode;
}

interface ColoredSelectProps {
  value: string | number;
  onChange: (value: any) => void;
  options: Option[];
  placeholder?: string;
  type?: 'status' | 'priority' | 'section' | 'milestone';
}

export const ColoredSelect: React.FC<ColoredSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  type,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      todo: 'bg-gray-100 text-gray-700 border-gray-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      review: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      blocked: 'bg-red-100 text-red-700 border-red-200',
      done: 'bg-green-100 text-green-700 border-green-200',
      pending: 'bg-gray-100 text-gray-700 border-gray-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getPriorityColor = (priority: number, isMilestone: boolean) => {
    if (isMilestone) {
      const colors: Record<number, string> = {
        0: 'bg-gray-100 text-gray-700 border-gray-200',
        1: 'bg-blue-100 text-blue-700 border-blue-200',
        2: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        3: 'bg-orange-100 text-orange-700 border-orange-200',
        4: 'bg-red-100 text-red-700 border-red-200',
      };
      return colors[priority] || 'bg-gray-100 text-gray-700 border-gray-200';
    } else {
      const colors: Record<number, string> = {
        1: 'bg-red-100 text-red-700 border-red-200',
        2: 'bg-orange-100 text-orange-700 border-orange-200',
        3: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        4: 'bg-blue-100 text-blue-700 border-blue-200',
        5: 'bg-gray-100 text-gray-700 border-gray-200',
      };
      return colors[priority] || 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getColor = (option: Option): string => {
    if (option.color) {
      return option.color;
    }

    if (type === 'status') {
      return getStatusColor(option.value as string);
    }

    if (type === 'priority') {
      const isMilestone = Number(option.value) <= 4;
      return getPriorityColor(Number(option.value), isMilestone);
    }

    return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
  };

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      {/* Selected Value Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-sm rounded-md border flex items-center justify-between transition-all ${
          selectedOption
            ? getColor(selectedOption)
            : 'bg-white text-gray-400 border-gray-300 hover:border-gray-400'
        }`}
      >
        <span className="flex items-center gap-2 font-medium">
          {selectedOption?.icon}
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-64 overflow-auto">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                  option.value === value
                    ? getColor(option) + ' font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {option.icon}
                <span className={option.value === value ? 'font-medium' : ''}>
                  {option.label}
                </span>
                {option.value === value && (
                  <svg
                    className="w-4 h-4 ml-auto"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to create status options
export const createStatusOptions = (isMilestone: boolean) => {
  if (isMilestone) {
    return [
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ];
  } else {
    return [
      { value: 'todo', label: 'To Do' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'review', label: 'Review' },
      { value: 'blocked', label: 'Blocked' },
      { value: 'done', label: 'Done' },
    ];
  }
};

// Helper function to create priority options
export const createPriorityOptions = (isMilestone: boolean) => {
  if (isMilestone) {
    return [
      { value: 0, label: 'Lowest' },
      { value: 1, label: 'Low' },
      { value: 2, label: 'Medium' },
      { value: 3, label: 'High' },
      { value: 4, label: 'Highest' },
    ];
  } else {
    return [
      { value: 1, label: 'P1 - Urgent' },
      { value: 2, label: 'P2 - High' },
      { value: 3, label: 'P3 - Medium' },
      { value: 4, label: 'P4 - Low' },
      { value: 5, label: 'P5 - Backlog' },
    ];
  }
};

// Helper function to create section options
export const createSectionOptions = (sections: Section[]) => {
  return [
    { value: 0, label: 'No Section' },
    ...sections.map((section) => ({
      value: section.id,
      label: section.name,
      color: section.color
        ? `bg-[${section.color}]/10 text-[${section.color}] border-[${section.color}]/20`
        : undefined,
    })),
  ];
};

// Helper function to create milestone options
export const createMilestoneOptions = (milestones: Milestone[]) => {
  return [
    { value: 0, label: 'No Milestone' },
    ...milestones.map((milestone) => ({
      value: milestone.milestone_id,
      label: milestone.title,
      icon: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 6l9-4 9 4v2l-9 4-9-4V6z"/>
          <path d="M3 12l9 4 9-4"/>
          <path d="M3 16l9 4 9-4"/>
        </svg>
      ),
      color: milestone.color
        ? `bg-[${milestone.color}]/10 text-[${milestone.color}] border-[${milestone.color}]/20`
        : 'bg-blue-100 text-blue-700 border-blue-200',
    })),
  ];
};

export default ColoredSelect;
