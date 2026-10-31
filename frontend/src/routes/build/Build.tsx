import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BuildIcon from '@mui/icons-material/Build';
import CodeIcon from '@mui/icons-material/Code';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import GroupsIcon from '@mui/icons-material/Groups';

const Build: React.FC = () => {
  const [activeSection, setActiveSection] = useState(0);

  const sections = [
    {
      id: 0,
      title: 'Start Building',
      icon: <CodeIcon className="w-6 h-6" />,
      description: 'Begin your project journey',
      gradient: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50'
    },
    {
      id: 1,
      title: 'Collaborate',
      icon: <GroupsIcon className="w-6 h-6" />,
      description: 'Work with your team',
      gradient: 'from-green-500 to-teal-500',
      bgColor: 'bg-green-50'
    },
    {
      id: 2,
      title: 'Launch',
      icon: <RocketLaunchIcon className="w-6 h-6" />,
      description: 'Deploy your creation',
      gradient: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full mb-4">
            <BuildIcon className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Build
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your ideas into reality with powerful tools and collaboration
          </p>
        </motion.div>

        {/* Section Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-6xl mx-auto"
        >
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {sections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                onClick={() => setActiveSection(section.id)}
                className={`
                  relative group cursor-pointer bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6
                  transform transition-all duration-300 hover:scale-105
                  ${activeSection === section.id ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}
                `}
              >
                <div className={`inline-flex items-center justify-center p-3 bg-gradient-to-r ${section.gradient} rounded-xl mb-4`}>
                  {section.icon}
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-2">{section.title}</h3>
                <p className="text-gray-600">{section.description}</p>
                
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
              </motion.div>
            ))}
          </div>

          {/* Content Area */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8"
            >
              {activeSection === 0 && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">Start Your Project</h2>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    Choose from templates, frameworks, and tools to kickstart your development journey. 
                    Our platform provides everything you need to build amazing applications.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      { icon: '⚡', title: 'Quick Start Templates', desc: 'Pre-configured project templates' },
                      { icon: '🛠️', title: 'Development Tools', desc: 'Integrated IDE and debugging' },
                      { icon: '📚', title: 'Learning Resources', desc: 'Tutorials and documentation' },
                      { icon: '🔧', title: 'Custom Configuration', desc: 'Flexible project setup' }
                    ].map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl"
                      >
                        <span className="text-2xl">{feature.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-800">{feature.title}</h4>
                          <p className="text-sm text-gray-600">{feature.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 1 && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">Team Collaboration</h2>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    Work seamlessly with your team members. Share code, review changes, 
                    and build together in real-time.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      { icon: '👥', title: 'Real-time Collaboration', desc: 'Code together simultaneously' },
                      { icon: '💬', title: 'Team Communication', desc: 'Built-in chat and video calls' },
                      { icon: '📝', title: 'Code Reviews', desc: 'Collaborative review process' },
                      { icon: '📊', title: 'Project Management', desc: 'Track progress and tasks' }
                    ].map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start space-x-4 p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl"
                      >
                        <span className="text-2xl">{feature.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-800">{feature.title}</h4>
                          <p className="text-sm text-gray-600">{feature.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 2 && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">Launch Your Project</h2>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    Deploy your application with confidence. Our platform provides hosting, 
                    monitoring, and scaling capabilities.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      { icon: '🚀', title: 'One-Click Deploy', desc: 'Instant deployment to production' },
                      { icon: '🌍', title: 'Global CDN', desc: 'Fast content delivery worldwide' },
                      { icon: '📈', title: 'Analytics & Monitoring', desc: 'Track performance metrics' },
                      { icon: '🔒', title: 'Security & SSL', desc: 'Built-in security features' }
                    ].map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start space-x-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl"
                      >
                        <span className="text-2xl">{feature.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-800">{feature.title}</h4>
                          <p className="text-sm text-gray-600">{feature.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Build;