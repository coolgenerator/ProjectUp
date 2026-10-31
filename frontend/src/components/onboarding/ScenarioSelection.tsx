import React from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Rocket,
  Briefcase,
  Edit,
  BookOpen,
  FlaskConical,
  Award,
  Trophy,
  Lightbulb,
  Zap,
  Code,
  Sparkles,
  Building,
  TrendingUp,
  FileText,
  UserCheck
} from 'lucide-react';

export type ProjectScenario =
  | 'course'
  | 'research'
  | 'capstone'
  | 'competition'
  | 'product'
  | 'hackathon'
  | 'opensource'
  | 'personal'
  | 'internship'
  | 'industry'
  | 'freelance'
  | 'startup'
  | 'blank';

interface ScenarioSelectionProps {
  onSelect: (scenario: ProjectScenario) => void;
}

interface ScenarioCard {
  id: ProjectScenario;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  description: string;
}

interface ScenarioCategory {
  name: string;
  icon: React.ReactNode;
  color: string;
  scenarios: ScenarioCard[];
}

const categories: ScenarioCategory[] = [
  {
    name: 'ACADEMIC PROJECTS',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'from-blue-600 to-indigo-600',
    scenarios: [
      {
        id: 'course',
        title: 'Course Group',
        icon: <BookOpen className="w-6 h-6" />,
        gradient: 'from-blue-500 to-indigo-500',
        description: 'Team-based course project'
      },
      {
        id: 'research',
        title: 'Research',
        subtitle: 'Project',
        icon: <FlaskConical className="w-6 h-6" />,
        gradient: 'from-purple-500 to-pink-500',
        description: 'Academic research project'
      },
      {
        id: 'capstone',
        title: 'Capstone',
        subtitle: 'Project',
        icon: <Award className="w-6 h-6" />,
        gradient: 'from-indigo-500 to-purple-500',
        description: 'Graduation thesis project'
      },
      {
        id: 'competition',
        title: 'Competition',
        subtitle: 'Entry',
        icon: <Trophy className="w-6 h-6" />,
        gradient: 'from-yellow-500 to-orange-500',
        description: 'Contest submission'
      },
    ],
  },
  {
    name: 'BUILD & CREATE',
    icon: <Rocket className="w-5 h-5" />,
    color: 'from-orange-600 to-red-600',
    scenarios: [
      {
        id: 'product',
        title: 'Product',
        subtitle: 'Development',
        icon: <Lightbulb className="w-6 h-6" />,
        gradient: 'from-orange-500 to-red-500',
        description: 'Build from 0 to 1'
      },
      {
        id: 'hackathon',
        title: 'Hackathon',
        subtitle: 'Project',
        icon: <Zap className="w-6 h-6" />,
        gradient: 'from-red-500 to-pink-500',
        description: '24-48 hour sprint'
      },
      {
        id: 'opensource',
        title: 'Open Source',
        subtitle: 'Contribution',
        icon: <Code className="w-6 h-6" />,
        gradient: 'from-green-500 to-teal-500',
        description: 'Community contribution'
      },
      {
        id: 'personal',
        title: 'Personal',
        subtitle: 'Practice',
        icon: <Sparkles className="w-6 h-6" />,
        gradient: 'from-pink-500 to-rose-500',
        description: 'Learning & portfolio'
      },
    ],
  },
  {
    name: 'PROFESSIONAL',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'from-slate-600 to-slate-700',
    scenarios: [
      {
        id: 'internship',
        title: 'Internship',
        subtitle: 'Project',
        icon: <Building className="w-6 h-6" />,
        gradient: 'from-slate-500 to-slate-600',
        description: 'Professional work project'
      },
      {
        id: 'industry',
        title: 'Industry',
        subtitle: 'Application',
        icon: <Briefcase className="w-6 h-6" />,
        gradient: 'from-blue-600 to-indigo-600',
        description: 'Real-world business solution'
      },
      {
        id: 'freelance',
        title: 'Freelance/',
        subtitle: 'Client Work',
        icon: <UserCheck className="w-6 h-6" />,
        gradient: 'from-violet-500 to-purple-500',
        description: 'Client-commissioned work'
      },
      {
        id: 'startup',
        title: 'Startup/',
        subtitle: 'Side Hustle',
        icon: <TrendingUp className="w-6 h-6" />,
        gradient: 'from-emerald-500 to-teal-500',
        description: 'Entrepreneurial venture'
      },
    ],
  },
  {
    name: 'CUSTOM',
    icon: <Edit className="w-5 h-5" />,
    color: 'from-gray-600 to-gray-700',
    scenarios: [
      {
        id: 'blank',
        title: 'Blank',
        icon: <FileText className="w-6 h-6" />,
        gradient: 'from-gray-500 to-gray-600',
        description: 'Start from scratch'
      }
    ],
  },
];

const ScenarioSelection: React.FC<ScenarioSelectionProps> = ({ onSelect }) => {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Choose your project type
        </h2>
        <p className="text-gray-600">
          Select the template that best fits your needs
        </p>
      </div>

      <div className="space-y-8">
        {categories.map((category, categoryIndex) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.1 }}
            className="space-y-4"
          >
            {/* Category Header */}
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${category.color} text-white`}>
                {category.icon}
              </div>
              <h3 className="text-sm font-bold text-gray-700 tracking-wide uppercase">
                {category.name}
              </h3>
            </div>

            {/* Scenario Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {category.scenarios.map((scenario, index) => (
                <motion.button
                  key={scenario.id}
                  onClick={() => onSelect(scenario.id)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: categoryIndex * 0.1 + index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative bg-white rounded-xl overflow-hidden
                           shadow-md hover:shadow-2xl transition-all duration-300
                           aspect-square min-h-[160px] border border-gray-100"
                >
                  {/* Gradient Background (hidden by default, shown on hover) */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${scenario.gradient} opacity-0
                                 group-hover:opacity-10 transition-opacity duration-300`} />

                  {/* Top Gradient Bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${scenario.gradient}`} />

                  {/* Card Content */}
                  <div className="relative h-full flex flex-col items-center justify-center p-5 text-center">
                    {/* Icon */}
                    <motion.div
                      className={`mb-3 p-3 rounded-lg bg-gradient-to-br ${scenario.gradient}
                                text-white shadow-lg group-hover:shadow-xl transition-shadow`}
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      {scenario.icon}
                    </motion.div>

                    {/* Title */}
                    <div className="space-y-0.5 mb-2">
                      <div className="text-gray-900 font-bold text-base leading-tight">
                        {scenario.title}
                      </div>
                      {scenario.subtitle && (
                        <div className="text-gray-900 font-bold text-base leading-tight">
                          {scenario.subtitle}
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">
                      {scenario.description}
                    </div>
                  </div>

                  {/* Hover Arrow - Bottom Right */}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100
                                transition-all duration-200 transform translate-x-0 group-hover:translate-x-1">
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${scenario.gradient}
                                   flex items-center justify-center`}>
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Decorative Corner Element */}
                  <div className="absolute top-3 right-3 w-8 h-8 opacity-0 group-hover:opacity-20
                                transition-opacity duration-300">
                    <div className={`w-full h-full rounded-full bg-gradient-to-br ${scenario.gradient} blur-sm`} />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Don't worry, you can always change project settings later
        </p>
      </div>
    </div>
  );
};

export default ScenarioSelection;
