import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProjectMindMap from './ProjectMindMap';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import config from '../../config';

interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  features: string[];
  techStack: string[];
}

interface ProjectCreationFlowProps {
  template: ProjectTemplate;
  onClose: () => void;
}

type Step = 'overview' | 'mindmap' | 'details' | 'review';

const ProjectCreationFlow: React.FC<ProjectCreationFlowProps> = ({ template, onClose }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('overview');
  const [projectData, setProjectData] = useState({
    name: template.title,
    description: template.description,
    visibility: 'private' as 'private' | 'public',
    teamSize: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    repository: '',
    tags: template.techStack,
    mindmap: null as any,
    readme: '',
    goals: [] as string[],
  });

  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'mindmap',
      label: 'Plan',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      id: 'details',
      label: 'Details',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      id: 'review',
      label: 'Review',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const handleMindmapComplete = (mindmapData: any) => {
    setProjectData({ ...projectData, mindmap: mindmapData });
    
    // Generate README and goals from mindmap
    const goals = mindmapData.nodes
      .filter((node: any) => node.type === 'feature' || node.type === 'task')
      .map((node: any) => node.label);
    
    const readme = generateReadme(mindmapData);
    
    setProjectData((prev) => ({
      ...prev,
      mindmap: mindmapData,
      goals,
      readme,
    }));
    
    setCurrentStep('details');
  };

  const generateReadme = (mindmapData: any) => {
    const categories = mindmapData.nodes.filter((n: any) => n.type === 'category');
    const features = mindmapData.nodes.filter((n: any) => n.type === 'feature');
    
    return `# ${projectData.name}

## Description
${projectData.description}

## Project Structure
${categories.map((cat: any) => `- ${cat.label}`).join('\n')}

## Features
${features.map((feat: any) => `- [ ] ${feat.label}`).join('\n')}

## Tech Stack
${projectData.tags.map((tech: string) => `- ${tech}`).join('\n')}

## Getting Started
1. Clone the repository
2. Install dependencies
3. Run the development server

## Timeline
- Start Date: ${projectData.startDate}
- Estimated Duration: ${template.duration}

## Contributing
Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.
`;
  };

  const createProject = async () => {
    try {
      // Prepare the project data for submission
      const formData = new FormData();
      formData.append('name', projectData.name);
      formData.append('description', projectData.description);
      formData.append('visibility', projectData.visibility);
      formData.append('team_size', projectData.teamSize.toString());
      formData.append('start_date', projectData.startDate);
      if (projectData.endDate) {
        formData.append('end_date', projectData.endDate);
      }
      if (projectData.repository) {
        formData.append('repository', projectData.repository);
      }
      formData.append('topic', JSON.stringify(projectData.tags));
      formData.append('goals', JSON.stringify(projectData.goals));
      
      // Add mindmap data as project metadata
      if (projectData.mindmap) {
        formData.append('metadata', JSON.stringify({
          mindmap: projectData.mindmap,
          template: template.id,
          category: template.category
        }));
      }

      // Create the project
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/projects/create`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const result = await response.json();
      
      toast.success('Project created successfully!');
      
      // Navigate to the project dashboard
      if (result.project?.short_id) {
        navigate(`/project/${result.project.short_id}/dashboard`);
      } else {
        navigate('/my-projects');
      }
      
      onClose();
    } catch (error) {
      console.error('Project creation error:', error);
      toast.error('Failed to create project. Please try again.');
    }
  };

  const getStepIndex = (step: Step) => steps.findIndex((s) => s.id === step);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Create Project from Template</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      getStepIndex(currentStep) >= index
                        ? 'bg-white text-purple-500'
                        : 'bg-purple-400 text-white'
                    }`}
                  >
                    {step.icon}
                  </div>
                  <span className="ml-2 text-sm font-medium">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-4">
                    <div className="h-1 bg-purple-400 rounded">
                      <div
                        className="h-full bg-white rounded transition-all duration-300"
                        style={{
                          width: getStepIndex(currentStep) > index ? '100%' : '0%',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {currentStep === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-2xl font-bold mb-4">{template.title}</h3>
                <p className="text-gray-600 mb-6">{template.description}</p>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Template Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <span className="font-medium">{template.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Difficulty:</span>
                        <span className="font-medium">{template.difficulty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{template.duration}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">What You'll Build</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {template.features.slice(0, 4).map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-2">Next Step: Create Your Project Plan</h4>
                  <p className="text-sm text-blue-700">
                    You'll create a visual mindmap to plan your project structure, features, and milestones.
                    This will help you organize your thoughts and create a clear roadmap.
                  </p>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={() => setCurrentStep('mindmap')}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    Start Planning
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === 'mindmap' && (
              <motion.div
                key="mindmap"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold mb-4">Create Your Project Mindmap</h3>
                <p className="text-gray-600 mb-4">
                  Organize your project structure visually. Add categories, features, and tasks to create a comprehensive plan.
                </p>
                <ProjectMindMap
                  templateTitle={template.title}
                  templateFeatures={template.features}
                  onComplete={handleMindmapComplete}
                />
              </motion.div>
            )}

            {currentStep === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-bold">Project Details</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={projectData.name}
                      onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visibility
                    </label>
                    <select
                      value={projectData.visibility}
                      onChange={(e) => setProjectData({ ...projectData, visibility: e.target.value as 'private' | 'public' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="private">Private</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Team Size
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={projectData.teamSize}
                      onChange={(e) => setProjectData({ ...projectData, teamSize: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repository URL (optional)
                    </label>
                    <input
                      type="url"
                      value={projectData.repository}
                      onChange={(e) => setProjectData({ ...projectData, repository: e.target.value })}
                      placeholder="https://github.com/username/repo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={projectData.startDate}
                      onChange={(e) => setProjectData({ ...projectData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date (optional)
                    </label>
                    <input
                      type="date"
                      value={projectData.endDate}
                      onChange={(e) => setProjectData({ ...projectData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={projectData.description}
                    onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Goals
                  </label>
                  <div className="space-y-2">
                    {projectData.goals.map((goal, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={goal}
                          onChange={(e) => {
                            const newGoals = [...projectData.goals];
                            newGoals[index] = e.target.value;
                            setProjectData({ ...projectData, goals: newGoals });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          onClick={() => {
                            const newGoals = projectData.goals.filter((_, i) => i !== index);
                            setProjectData({ ...projectData, goals: newGoals });
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setProjectData({ ...projectData, goals: [...projectData.goals, ''] })}
                      className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      + Add Goal
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep('mindmap')}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep('review')}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    Review Project
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold mb-4">Review Your Project</h3>
                
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h4 className="font-semibold mb-4">Project Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{projectData.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Visibility:</span>
                      <span className="ml-2 font-medium capitalize">{projectData.visibility}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Team Size:</span>
                      <span className="ml-2 font-medium">{projectData.teamSize}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <span className="ml-2 font-medium">{template.duration}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h4 className="font-semibold mb-4">README Preview</h4>
                  <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto prose prose-sm max-w-none">
                    <ReactMarkdown>{projectData.readme}</ReactMarkdown>
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-green-900 mb-2">Ready to Create!</h4>
                  <p className="text-sm text-green-700">
                    Your project will be created with the mindmap structure and all the details you've provided.
                    You can always modify these settings later.
                  </p>
                </div>
                
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep('details')}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={createProject}
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all"
                  >
                    Create Project
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ProjectCreationFlow;