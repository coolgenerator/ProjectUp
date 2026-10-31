import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Users } from 'lucide-react';
import { Task, Section } from '../../types/task';
import { Milestone } from '../../types/project/milestone';
import { WorkItem, taskToWorkItem } from '../../types/workItem';
import { Meeting, getProjectMeetings } from '../../services/meetingService';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import TaskDetailDrawer from '../project/TaskManagement/TaskDetailDrawer';
import MeetingDetailModal from './MeetingDetailModal';

type CalendarView = 'day' | 'week' | 'month';

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end?: Date;
    type: 'task' | 'meeting';
    color: string;
    data: Task | Meeting;
}

interface ProjectCalendarProps {
    projectId: number | string;
    tasks?: Task[];
    meetings?: Meeting[];
}

type EventFilter = 'all' | 'tasks' | 'meetings';

const ProjectCalendar: React.FC<ProjectCalendarProps> = ({ projectId, tasks: propTasks, meetings: propMeetings }) => {
    const [view, setView] = useState<CalendarView>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [showTaskDetail, setShowTaskDetail] = useState(false);
    const [showMeetingDetail, setShowMeetingDetail] = useState(false);
    const [tasks, setTasks] = useState<Task[]>(propTasks || []);
    const [meetings, setMeetings] = useState<Meeting[]>(propMeetings || []);
    const [loading, setLoading] = useState(true);
    const [eventFilter, setEventFilter] = useState<EventFilter>('all');
    const [sections, setSections] = useState<Section[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [projectMembers, setProjectMembers] = useState<Array<{ user_id: number; username: string; name: string }>>([]);

    // Fetch tasks and meetings if not provided as props
    useEffect(() => {
        const fetchData = async () => {
            if (propTasks && propMeetings) {
                setTasks(propTasks);
                setMeetings(propMeetings);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // Fetch tasks
                const tasksPromise = fetchWithAuth(`/api/tasks/project/${projectId}?limit=500`)
                    .then(response => response.ok ? response.json() : { tasks: [] })
                    .then(data => data.tasks || [])
                    .catch(() => []);

                // Fetch meetings - handle both number and string projectId
                const meetingsPromise = typeof projectId === 'number'
                    ? getProjectMeetings(projectId).catch(() => [])
                    : Promise.resolve([]);

                const [tasksData, meetingsData] = await Promise.all([tasksPromise, meetingsPromise]);

                setTasks(tasksData);
                setMeetings(meetingsData);
            } catch (error) {
                console.error('Failed to load calendar data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId, propTasks, propMeetings]);

    // Fetch sections, milestones, and project members
    useEffect(() => {
        const fetchProjectData = async () => {
            if (!projectId) return;

            try {
                // Fetch sections
                const sectionsResponse = await fetchWithAuth(`/api/sections/project/${projectId}`);
                if (sectionsResponse.ok) {
                    const sectionsData = await sectionsResponse.json();
                    setSections(sectionsData.sections || []);
                }

                // Fetch milestones
                const milestonesResponse = await fetchWithAuth(`/api/project/${projectId}/milestones`);
                if (milestonesResponse.ok) {
                    const milestonesData = await milestonesResponse.json();
                    setMilestones(milestonesData.milestones || []);
                }

                // Fetch project members
                const membersResponse = await fetchWithAuth(`/api/project/${projectId}/members`);
                if (membersResponse.ok) {
                    const membersData = await membersResponse.json();
                    setProjectMembers(membersData.members || []);
                }
            } catch (error) {
                console.error('Failed to fetch project data:', error);
            }
        };

        fetchProjectData();
    }, [projectId]);

    // Cleanup body class on unmount
    useEffect(() => {
        return () => {
            document.body.classList.remove('calendar-task-modal-open');
        };
    }, []);

    // Convert tasks and meetings to calendar events with filtering
    const events = useMemo<CalendarEvent[]>(() => {
        const taskEvents: CalendarEvent[] = (eventFilter === 'all' || eventFilter === 'tasks')
            ? tasks
                .filter(task => task.due_date || task.start_date)
                .map(task => {
                    const startDate = new Date(task.start_date || task.due_date!);
                    const endDate = task.due_date ? new Date(task.due_date) : new Date(startDate);
                    return {
                        id: task.id,
                        title: task.title,
                        start: startDate,
                        end: endDate,
                        type: 'task' as const,
                        color: getTaskColor(task.status),
                        data: task,
                    };
                })
            : [];

        const meetingEvents: CalendarEvent[] = (eventFilter === 'all' || eventFilter === 'meetings')
            ? meetings.map(meeting => ({
                id: meeting.id,
                title: meeting.title,
                start: new Date(meeting.start_time),
                end: new Date(meeting.end_time),
                type: 'meeting' as const,
                color: getMeetingColor(meeting.status),
                data: meeting,
            }))
            : [];

        return [...taskEvents, ...meetingEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
    }, [tasks, meetings, eventFilter]);

    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event);
        if (event.type === 'task') {
            setShowTaskDetail(true);
            // Add class to body for centering drawer
            document.body.classList.add('calendar-task-modal-open');
        } else {
            setShowMeetingDetail(true);
        }
    };

    const handleCloseDetail = () => {
        setShowTaskDetail(false);
        setShowMeetingDetail(false);
        setSelectedEvent(null);
        // Remove class from body
        document.body.classList.remove('calendar-task-modal-open');
    };

    const handleTaskUpdate = async (itemId: string, updates: Partial<Task> | Partial<Milestone>) => {
        try {
            const response = await fetchWithAuth(`/api/tasks/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (response.ok) {
                // Refresh tasks
                if (!propTasks) {
                    const tasksResponse = await fetchWithAuth(`/api/tasks/project/${projectId}?limit=500`);
                    if (tasksResponse.ok) {
                        const tasksData = await tasksResponse.json();
                        setTasks(tasksData.tasks || []);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    };

    const handleTaskDelete = async (itemId: string) => {
        try {
            const response = await fetchWithAuth(`/api/tasks/${itemId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                // Close detail and refresh tasks
                handleCloseDetail();
                if (!propTasks) {
                    const tasksResponse = await fetchWithAuth(`/api/tasks/project/${projectId}?limit=500`);
                    if (tasksResponse.ok) {
                        const tasksData = await tasksResponse.json();
                        setTasks(tasksData.tasks || []);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (view === 'day') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        } else if (view === 'week') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        } else {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        }
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const getHeaderText = () => {
        const options: Intl.DateTimeFormatOptions = view === 'day'
            ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            : { year: 'numeric', month: 'long' };
        return currentDate.toLocaleDateString('en-US', options);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigateDate('prev')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-700" />
                        </button>
                        <button
                            onClick={goToToday}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Today
                        </button>
                        <button
                            onClick={() => navigateDate('next')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-700" />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900">{getHeaderText()}</h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Event Filter */}
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setEventFilter('all')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                    eventFilter === 'all'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setEventFilter('tasks')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                    eventFilter === 'tasks'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Tasks
                            </button>
                            <button
                                onClick={() => setEventFilter('meetings')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                    eventFilter === 'meetings'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Meetings
                            </button>
                        </div>

                        {/* View Switcher */}
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                            {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setView(v)}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                                        view === v
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {v.charAt(0).toUpperCase() + v.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar View */}
            <div className="p-4">
                {view === 'month' && (
                    <MonthView
                        currentDate={currentDate}
                        events={events}
                        onEventClick={handleEventClick}
                    />
                )}
                {view === 'week' && (
                    <WeekView
                        currentDate={currentDate}
                        events={events}
                        onEventClick={handleEventClick}
                    />
                )}
                {view === 'day' && (
                    <DayView
                        currentDate={currentDate}
                        events={events}
                        onEventClick={handleEventClick}
                    />
                )}
            </div>

            {/* Detail Modal - Custom centered modal */}
            {showTaskDetail && selectedEvent?.type === 'task' && (
                <>
                    <TaskDetailDrawer
                        open={showTaskDetail}
                        workItem={taskToWorkItem(selectedEvent.data as Task)}
                        onClose={handleCloseDetail}
                        onUpdate={handleTaskUpdate}
                        onDelete={handleTaskDelete}
                        sections={sections}
                        milestones={milestones}
                        projectMembers={projectMembers}
                    />
                    <style>{`
                        /* Override MUI Drawer to make it centered modal - only when calendar modal is open */
                        body.calendar-task-modal-open .MuiDrawer-root {
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                        }

                        body.calendar-task-modal-open .MuiDrawer-root .MuiPaper-root {
                            position: relative !important;
                            max-width: 1000px !important;
                            width: 90vw !important;
                            max-height: 90vh !important;
                            height: auto !important;
                            border-radius: 12px !important;
                            transform: none !important;
                            left: auto !important;
                            right: auto !important;
                            top: auto !important;
                            bottom: auto !important;
                            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
                        }

                        /* Hide Copy link and More options buttons in calendar modal */
                        body.calendar-task-modal-open .MuiDrawer-root .MuiIconButton-root[title="Copy link"],
                        body.calendar-task-modal-open .MuiDrawer-root .MuiIconButton-root[title="More options"] {
                            display: none !important;
                        }

                        /* More aggressive hiding - target any button that's not the close button */
                        body.calendar-task-modal-open .MuiDrawer-root header .MuiIconButton-root:not([aria-label="close"]) {
                            display: none !important;
                        }
                    `}</style>
                </>
            )}
            {showMeetingDetail && selectedEvent?.type === 'meeting' && (
                <MeetingDetailModal
                    meeting={selectedEvent.data as Meeting}
                    onClose={handleCloseDetail}
                />
            )}
        </div>
    );
};

// Month View Component
const MonthView: React.FC<{
    currentDate: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
}> = ({ currentDate, events, onEventClick }) => {
    const weeks = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const weeks: Date[][] = [];
        let currentWeek: Date[] = [];

        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            currentWeek.push(date);

            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }

        return weeks;
    }, [currentDate]);

    // Get all dates in the calendar view
    const allDates = useMemo(() => weeks.flat(), [weeks]);

    // Process events to identify multi-day spans for each week
    const eventSpans = useMemo(() => {
        const spans: Array<{
            event: CalendarEvent;
            weekIdx: number;
            startCol: number;
            endCol: number;
            isStart: boolean;
            isEnd: boolean;
        }> = [];

        events.forEach(event => {
            const eventStart = new Date(event.start);
            eventStart.setHours(0, 0, 0, 0);

            const eventEnd = event.end ? new Date(event.end) : new Date(event.start);
            eventEnd.setHours(23, 59, 59, 999);

            // Find which weeks this event spans
            weeks.forEach((week, weekIdx) => {
                const weekStart = new Date(week[0]);
                weekStart.setHours(0, 0, 0, 0);
                const weekEnd = new Date(week[6]);
                weekEnd.setHours(23, 59, 59, 999);

                // Check if event overlaps with this week
                if (eventEnd >= weekStart && eventStart <= weekEnd) {
                    // Calculate start and end columns for this week
                    let startCol = 0;
                    let endCol = 6;
                    let isStart = false;
                    let isEnd = false;

                    // Find the actual start column
                    for (let i = 0; i < 7; i++) {
                        const dayDate = new Date(week[i]);
                        dayDate.setHours(0, 0, 0, 0);
                        if (dayDate >= eventStart) {
                            startCol = i;
                            isStart = dayDate.toDateString() === eventStart.toDateString();
                            break;
                        }
                    }

                    // Find the actual end column
                    const eventEndDay = new Date(eventEnd);
                    eventEndDay.setHours(0, 0, 0, 0);
                    for (let i = 6; i >= 0; i--) {
                        const dayDate = new Date(week[i]);
                        dayDate.setHours(0, 0, 0, 0);
                        if (dayDate <= eventEndDay) {
                            endCol = i;
                            isEnd = dayDate.toDateString() === eventEndDay.toDateString();
                            break;
                        }
                    }

                    spans.push({
                        event,
                        weekIdx,
                        startCol,
                        endCol,
                        isStart,
                        isEnd,
                    });
                }
            });
        });

        return spans;
    }, [events, weeks]);

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isCurrentMonth = (date: Date) => {
        return date.getMonth() === currentDate.getMonth();
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="calendar-month">
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 mb-px">
                {weekDays.map(day => (
                    <div key={day} className="bg-white p-2 text-center text-sm font-semibold text-gray-600">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="relative">
                {weeks.map((week, weekIdx) => (
                    <div key={weekIdx} className="relative">
                        {/* Day cells */}
                        <div className="grid grid-cols-7 gap-px bg-gray-200">
                            {week.map((date, dayIdx) => {
                                const isCurrentDay = isToday(date);
                                const inCurrentMonth = isCurrentMonth(date);

                                return (
                                    <div
                                        key={`${weekIdx}-${dayIdx}`}
                                        className={`bg-white min-h-[120px] p-2 ${
                                            !inCurrentMonth ? 'bg-gray-50' : ''
                                        }`}
                                    >
                                        <div className={`text-sm font-medium mb-1 ${
                                            isCurrentDay
                                                ? 'w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center'
                                                : inCurrentMonth
                                                ? 'text-gray-900'
                                                : 'text-gray-400'
                                        }`}>
                                            {date.getDate()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Event bars for this week */}
                        <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ marginTop: '32px' }}>
                            {eventSpans
                                .filter(span => span.weekIdx === weekIdx)
                                .map((span, idx) => {
                                    return (
                                        <div
                                            key={`${span.event.id}-${weekIdx}-${idx}`}
                                            onClick={() => onEventClick(span.event)}
                                            className={`absolute px-2 py-1 text-xs cursor-pointer truncate pointer-events-auto hover:opacity-80 transition-opacity ${span.event.color}`}
                                            style={{
                                                top: `${idx * 24}px`,
                                                left: `calc(${(span.startCol / 7) * 100}% + ${span.startCol}px)`,
                                                width: `calc(${((span.endCol - span.startCol + 1) / 7) * 100}% + ${span.endCol - span.startCol}px)`,
                                                borderTopLeftRadius: span.isStart ? '8px' : '0',
                                                borderBottomLeftRadius: span.isStart ? '8px' : '0',
                                                borderTopRightRadius: span.isEnd ? '8px' : '0',
                                                borderBottomRightRadius: span.isEnd ? '8px' : '0',
                                            }}
                                            title={span.event.title}
                                        >
                                            {span.isStart && span.event.title}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Week View Component
const WeekView: React.FC<{
    currentDate: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
}> = ({ currentDate, events, onEventClick }) => {
    const weekDays = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            return date;
        });
    }, [currentDate]);

    const getEventsForDate = (date: Date) => {
        return events.filter(event => {
            const eventStart = new Date(event.start);
            eventStart.setHours(0, 0, 0, 0); // Reset to start of day

            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0); // Reset to start of day

            // If event has an end date, check if date is within the range
            if (event.end) {
                const eventEnd = new Date(event.end);
                eventEnd.setHours(23, 59, 59, 999); // End of day

                return checkDate >= eventStart && checkDate <= eventEnd;
            }

            // If no end date, just check start date
            return eventStart.toDateString() === checkDate.toDateString();
        });
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    return (
        <div className="grid grid-cols-7 gap-2">
            {weekDays.map(date => {
                const dayEvents = getEventsForDate(date);
                const isCurrentDay = isToday(date);

                return (
                    <div key={date.toISOString()} className="border border-gray-200 rounded-lg p-3 min-h-[400px]">
                        <div className={`text-center mb-3 ${isCurrentDay ? 'font-bold' : ''}`}>
                            <div className="text-xs text-gray-500">
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className={`text-lg ${
                                isCurrentDay
                                    ? 'w-8 h-8 mx-auto rounded-full bg-indigo-600 text-white flex items-center justify-center'
                                    : 'text-gray-900'
                            }`}>
                                {date.getDate()}
                            </div>
                        </div>
                        <div className="space-y-2">
                            {dayEvents.map(event => (
                                <div
                                    key={event.id}
                                    onClick={() => onEventClick(event)}
                                    className={`text-xs px-2 py-2 rounded cursor-pointer ${event.color} hover:opacity-80 transition-opacity`}
                                >
                                    <div className="font-medium truncate">{event.title}</div>
                                    {event.end && (
                                        <div className="text-xs mt-1 opacity-75">
                                            {event.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Day View Component
const DayView: React.FC<{
    currentDate: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
}> = ({ currentDate, events, onEventClick }) => {
    const dayEvents = useMemo(() => {
        return events.filter(event => {
            const eventStart = new Date(event.start);
            eventStart.setHours(0, 0, 0, 0);

            const checkDate = new Date(currentDate);
            checkDate.setHours(0, 0, 0, 0);

            // If event has an end date, check if current date is within the range
            if (event.end) {
                const eventEnd = new Date(event.end);
                eventEnd.setHours(23, 59, 59, 999);

                return checkDate >= eventStart && checkDate <= eventEnd;
            }

            // If no end date, just check start date
            return eventStart.toDateString() === checkDate.toDateString();
        });
    }, [currentDate, events]);

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="max-h-[600px] overflow-y-auto">
            {dayEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No events scheduled for this day</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {dayEvents.map(event => (
                        <div
                            key={event.id}
                            onClick={() => onEventClick(event)}
                            className={`p-4 rounded-lg cursor-pointer ${event.color} hover:opacity-80 transition-opacity border-l-4`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="font-semibold text-sm mb-1">{event.title}</div>
                                    {event.end && (
                                        <div className="text-xs opacity-75 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {event.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                            {' - '}
                                            {event.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded">
                                    {event.type === 'meeting' ? 'Meeting' : 'Task'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Helper functions
const getTaskColor = (status: string): string => {
    const colors: Record<string, string> = {
        todo: 'bg-gray-100 text-gray-700 border-gray-400',
        in_progress: 'bg-blue-100 text-blue-700 border-blue-400',
        review: 'bg-amber-100 text-amber-700 border-amber-400',
        blocked: 'bg-red-100 text-red-700 border-red-400',
        done: 'bg-green-100 text-green-700 border-green-400',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-400';
};

const getMeetingColor = (status: string): string => {
    const colors: Record<string, string> = {
        scheduled: 'bg-indigo-100 text-indigo-700 border-indigo-400',
        in_progress: 'bg-green-100 text-green-700 border-green-400',
        completed: 'bg-gray-100 text-gray-700 border-gray-400',
        cancelled: 'bg-red-100 text-red-700 border-red-400',
    };
    return colors[status] || 'bg-indigo-100 text-indigo-700 border-indigo-400';
};

export default ProjectCalendar;
