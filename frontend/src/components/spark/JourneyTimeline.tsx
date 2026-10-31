import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, startOfMonth, addMonths } from 'date-fns';

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'inspiration' | 'learning' | 'milestone' | 'project' | 'breakthrough' | 'collaboration';
  title: string;
  description: string;
  impact: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  linkedItems?: string[];
  reflection?: string;
  image?: string;
}

interface JourneyTimelineProps {
  userId?: string;
}

const JourneyTimeline: React.FC<JourneyTimelineProps> = ({ userId }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [zoom, setZoom] = useState(1);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [filter, setFilter] = useState<string>('all');

  // Event type configurations with SVG icons
  const eventTypeConfig = {
    inspiration: { 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      color: 'from-yellow-400 to-orange-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-400',
      label: 'Inspiration Sparked'
    },
    learning: { 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'from-blue-400 to-indigo-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-400',
      label: 'Learning Milestone'
    },
    milestone: { 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      ),
      color: 'from-red-400 to-pink-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-400',
      label: 'Major Milestone'
    },
    project: { 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'from-green-400 to-emerald-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-400',
      label: 'Project Launched'
    },
    breakthrough: { 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      color: 'from-purple-400 to-pink-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-400',
      label: 'Breakthrough Moment'
    },
    collaboration: { 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'from-teal-400 to-cyan-500',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-400',
      label: 'Collaboration Started'
    }
  };

  // Generate mock timeline data
  const generateMockEvents = useCallback((): TimelineEvent[] => {
    const mockEvents: TimelineEvent[] = [];
    const now = new Date();
    const types: TimelineEvent['type'][] = ['inspiration', 'learning', 'milestone', 'project', 'breakthrough', 'collaboration'];
    
    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 365);
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() - daysAgo);
      
      const type = types[Math.floor(Math.random() * types.length)];
      
      mockEvents.push({
        id: `event-${i}`,
        date: eventDate,
        type,
        title: `${eventTypeConfig[type].label} #${i}`,
        description: `This marks an important ${type} in your journey. ${
          type === 'breakthrough' ? 'A moment of clarity that changed everything.' :
          type === 'project' ? 'Successfully launched after weeks of hard work.' :
          type === 'inspiration' ? 'A spark that led to amazing possibilities.' :
          'Another step forward in the learning journey.'
        }`,
        impact: Math.ceil(Math.random() * 5) as 1 | 2 | 3 | 4 | 5,
        tags: ['innovation', 'growth', 'learning', 'achievement'].slice(0, Math.floor(Math.random() * 3) + 1),
        linkedItems: Math.random() > 0.5 ? [`item-${Math.floor(Math.random() * 20)}`, `item-${Math.floor(Math.random() * 20)}`] : undefined,
        reflection: Math.random() > 0.6 ? 'This was a turning point that taught me valuable lessons about perseverance and innovation.' : undefined,
        image: Math.random() > 0.7 ? `https://picsum.photos/400/300?random=${i}` : undefined
      });
    }
    
    return mockEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, []);

  // Initialize timeline data
  useEffect(() => {
    setEvents(generateMockEvents());
  }, [generateMockEvents]);

  // Filter events
  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(event => event.type === filter);

  // Calculate timeline dimensions
  const getTimelineLayout = () => {
    if (filteredEvents.length === 0) return { totalWidth: 1000, monthWidth: 100 };
    
    const firstDate = filteredEvents[0].date;
    const lastDate = filteredEvents[filteredEvents.length - 1].date;
    const totalDays = differenceInDays(lastDate, firstDate);
    const pixelsPerDay = 15 * zoom;
    const totalWidth = Math.max(totalDays * pixelsPerDay, 1000);
    
    return { totalWidth, firstDate, lastDate, totalDays, pixelsPerDay };
  };

  // Scroll controls
  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleScrollToToday = () => {
    if (scrollContainerRef.current && filteredEvents.length > 0) {
      const layout = getTimelineLayout();
      const today = new Date();
      const daysFromStart = differenceInDays(today, layout.firstDate!);
      const position = daysFromStart * layout.pixelsPerDay!;
      
      scrollContainerRef.current.scrollTo({
        left: position - scrollContainerRef.current.clientWidth / 2,
        behavior: 'smooth'
      });
    }
  };

  // Handle event selection
  const handleEventClick = (event: TimelineEvent) => {
    setSelectedEvent(event);
    setReflectionText(event.reflection || '');
    setShowReflectionModal(true);
  };

  // Save reflection
  const handleSaveReflection = () => {
    if (selectedEvent) {
      setEvents(prev => prev.map(event => 
        event.id === selectedEvent.id 
          ? { ...event, reflection: reflectionText } 
          : event
      ));
      setShowReflectionModal(false);
    }
  };

  const layout = getTimelineLayout();

  // Generate month markers
  const generateMonthMarkers = () => {
    if (!layout.firstDate || !layout.lastDate) return [];
    
    const markers = [];
    let currentDate = startOfMonth(layout.firstDate);
    const endDate = startOfMonth(layout.lastDate);
    
    while (currentDate <= endDate) {
      const daysFromStart = differenceInDays(currentDate, layout.firstDate);
      const position = daysFromStart * layout.pixelsPerDay!;
      
      markers.push({
        date: new Date(currentDate),
        position,
        label: format(currentDate, 'MMM yyyy')
      });
      
      currentDate = addMonths(currentDate, 1);
    }
    
    return markers;
  };

  return (
    <div className="w-full h-full">
      {/* Controls Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Your Learning Journey
            </h2>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              {filteredEvents.length} Events
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Filter Buttons */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filter === 'all' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              {Object.entries(eventTypeConfig).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filter === type 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={config.label}
                >
                  <span className="w-4 h-4">{config.icon}</span>
                </button>
              ))}
            </div>

            {/* Zoom Controls */}
            <div className="flex gap-1">
              <button
                onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.5))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </button>
              <button
                onClick={() => setZoom(prev => Math.min(prev * 1.25, 3))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Zoom In"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </button>
              <button
                onClick={handleScrollToToday}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-500"
                title="Go to Today"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: '500px' }}>
        {/* Navigation Buttons */}
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Scrollable Timeline */}
        <div
          ref={scrollContainerRef}
          className="h-full overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-gray-100"
        >
          <div 
            className="relative h-full"
            style={{ width: layout.totalWidth, minWidth: '100%' }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-b from-purple-50/20 via-transparent to-pink-50/20" />

            {/* Center Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-200 via-purple-300 to-pink-200 -translate-y-1/2" />

            {/* Month Markers */}
            {generateMonthMarkers().map((marker, index) => (
              <div
                key={`month-${index}`}
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: `${marker.position}px` }}
              >
                <div className="w-px h-6 bg-gray-300" />
                <span className="absolute top-8 left-1/2 -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                  {marker.label}
                </span>
              </div>
            ))}

            {/* Today Marker */}
            {layout.firstDate && (
              <motion.div
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                className="absolute top-0 bottom-0 w-0.5 bg-red-400"
                style={{ 
                  left: `${differenceInDays(new Date(), layout.firstDate) * layout.pixelsPerDay}px`,
                }}
              >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-1 bg-red-500 text-white text-xs rounded-full whitespace-nowrap">
                  Today
                </span>
              </motion.div>
            )}

            {/* Events */}
            {layout.firstDate && filteredEvents.map((event, index) => {
              const daysFromStart = differenceInDays(event.date, layout.firstDate);
              const position = daysFromStart * layout.pixelsPerDay;
              const isAbove = index % 2 === 0;
              const config = eventTypeConfig[event.type];
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02, type: 'spring', stiffness: 300 }}
                  className="absolute"
                  style={{ 
                    left: `${position}px`,
                    top: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: hoveredEvent === event.id ? 20 : 10
                  }}
                  onMouseEnter={() => setHoveredEvent(event.id)}
                  onMouseLeave={() => setHoveredEvent(null)}
                >
                  {/* Connection Line */}
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: index * 0.02 + 0.1 }}
                    className={`absolute left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b ${config.color}`}
                    style={{
                      top: isAbove ? '-120px' : '0',
                      height: '120px',
                      originY: isAbove ? 'bottom' : 'top'
                    }}
                  />

                  {/* Event Node */}
                  <button
                    onClick={() => handleEventClick(event)}
                    className={`
                      absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                      flex items-center justify-center
                      bg-gradient-to-r ${config.color} text-white
                      rounded-full shadow-lg hover:shadow-xl
                      transform transition-all duration-300 hover:scale-110
                      cursor-pointer
                    `}
                    style={{
                      width: `${40 + event.impact * 8}px`,
                      height: `${40 + event.impact * 8}px`,
                    }}
                  >
                    {config.icon}
                  </button>

                  {/* Event Card (on hover) */}
                  <AnimatePresence>
                    {hoveredEvent === event.id && (
                      <motion.div
                        initial={{ opacity: 0, y: isAbove ? 10 : -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: isAbove ? 10 : -10 }}
                        className={`
                          absolute left-1/2 -translate-x-1/2
                          ${isAbove ? 'bottom-full mb-20' : 'top-full mt-20'}
                          w-64 bg-white rounded-xl shadow-2xl overflow-hidden
                          cursor-pointer
                        `}
                        onClick={() => handleEventClick(event)}
                      >
                        {event.image && (
                          <img
                            src={event.image}
                            alt={event.title}
                            className="w-full h-32 object-cover"
                          />
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-800 mb-1">{event.title}</h3>
                          <p className="text-sm text-gray-500 mb-2">{format(event.date, 'MMM d, yyyy')}</p>
                          
                          {/* Impact Stars */}
                          <div className="flex gap-1 mb-3">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={`text-lg ${i < event.impact ? 'text-yellow-400' : 'text-gray-300'}`}
                              >
                                ★
                              </span>
                            ))}
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1">
                            {event.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Journey Statistics */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Journey Insights</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(eventTypeConfig).map(([type, config]) => {
            const count = events.filter(e => e.type === type).length;
            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border-2 ${config.borderColor} ${config.bgColor} hover:shadow-lg transition-all`}
              >
                <div className="text-center">
                  <div className="flex justify-center mb-2 text-gray-700">
                    {React.cloneElement(config.icon, { className: "w-8 h-8" })}
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{count}</p>
                  <p className="text-xs text-gray-600 mt-1">{config.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Reflection Modal */}
      <AnimatePresence>
        {showReflectionModal && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowReflectionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`p-6 bg-gradient-to-r ${eventTypeConfig[selectedEvent.type].color}`}>
                <div className="flex items-start justify-between text-white">
                  <div className="flex items-center gap-4">
                    <div className="text-white">
                      {React.cloneElement(eventTypeConfig[selectedEvent.type].icon, { className: "w-10 h-10" })}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedEvent.title}</h2>
                      <p className="text-white/80">{format(selectedEvent.date, 'MMMM d, yyyy')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowReflectionModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <p className="text-gray-700 mb-6">{selectedEvent.description}</p>

                {/* Impact Level */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Impact Level</h3>
                  <div className="flex gap-2">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-2xl ${i < selectedEvent.impact ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                {/* Related Items */}
                {selectedEvent.linkedItems && selectedEvent.linkedItems.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Related Items</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.linkedItems.map((itemId, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                        >
                          {itemId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reflection */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Reflection</h3>
                  <textarea
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    placeholder="What did you learn from this experience? How did it shape your journey?"
                    className="w-full p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={4}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowReflectionModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveReflection}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Save Reflection
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JourneyTimeline;