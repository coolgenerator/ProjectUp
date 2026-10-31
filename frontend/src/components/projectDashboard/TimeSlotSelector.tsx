import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, startOfDay } from 'date-fns';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    CalendarIcon,
    XMarkIcon,
    CheckIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    PencilIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import './TimeSlotSelector.css';
import { timeZones } from './datasets/timeZone';

// Meeting color options for different meetings
const meetingColors = [
    { bg: 'rgba(25, 118, 210, 0.2)', border: '#1976d2' },     // Blue
    { bg: 'rgba(156, 39, 176, 0.2)', border: '#9c27b0' },     // Purple
    { bg: 'rgba(233, 30, 99, 0.2)', border: '#e91e63' },      // Pink
    { bg: 'rgba(255, 87, 34, 0.2)', border: '#ff5722' },      // Orange
    { bg: 'rgba(0, 150, 136, 0.2)', border: '#009688' },      // Teal
    { bg: 'rgba(121, 85, 72, 0.2)', border: '#795548' }       // Brown
];

interface TimeSlot {
    id: string;
    day: Date;
    time: string;
    selected: boolean;
    count: number;
    users: string[];
    start: Date;
    end: Date;
}

interface MeetingTime {
    id: string;
    name: string;
    slots: TimeSlot[];
    colorIndex: number;
}

interface DateRange {
    start: Date;
    end: Date;
}

interface TimeConstraints {
    start: string;
    end: string;
}

interface TimeSlotSelectorProps {
    initialDate: Date;
    daysToShow: number;
    onSelectionChange: (selections: MeetingTime[]) => void;
    isAdmin: boolean;
    selectedDateRange: DateRange;
    timeConstraints: TimeConstraints;
    visible: boolean;
    timeZone: string;
    onTimeZoneChange: (timeZone: string) => void;
}

const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({
    initialDate,
    daysToShow,
    onSelectionChange,
    isAdmin,
    selectedDateRange,
    timeConstraints,
    visible,
    timeZone,
    onTimeZoneChange
}) => {
    const startDate = useRef(startOfDay(initialDate));
    const gridContainerRef = useRef<HTMLDivElement>(null);
    const prevPropsRef = useRef({
        selectedDateRange: selectedDateRange,
        visible: true,
        timeConstraints,
        timeZone
    });

    const [displayedDays, setDisplayedDays] = useState<Date[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
    const [isExpanded, setIsExpanded] = useState(visible);
    const [selectedTimeSlots, setSelectedTimeSlots] = useState<TimeSlot[]>([]);
    const [pendingTimeSlots, setPendingTimeSlots] = useState<TimeSlot[]>([]);
    const [meetingTimes, setMeetingTimes] = useState<MeetingTime[]>([]);
    const [tempMeetingSlots, setTempMeetingSlots] = useState<TimeSlot[]>([]);
    const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
    const [meetingName, setMeetingName] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isDeselecting, setIsDeselecting] = useState(false);
    const [calculatedDaysToShow, setCalculatedDaysToShow] = useState(daysToShow);
    const [currentPage, setCurrentPage] = useState(0);
    const [currentTimezone, setCurrentTimezone] = useState<string>(timeZone);

    // Combined useEffect to handle all prop changes properly
    useEffect(() => {
        // Handle visibility change
        if (isExpanded !== visible && prevPropsRef.current.visible !== visible) {
            setIsExpanded(visible);
            prevPropsRef.current.visible = visible;
        }

        // Handle selectedDateRange change
        if (prevPropsRef.current.selectedDateRange !== selectedDateRange) {
            // Set the start date to the first date in the range
            const newStartDate = startOfDay(selectedDateRange.start);

            if (startDate.current.getTime() !== newStartDate.getTime()) {
                startDate.current = newStartDate;
                setCurrentPage(0); // Reset to first page
            }

            prevPropsRef.current.selectedDateRange = selectedDateRange;
            generateDaysAndTimeSlots();
        }

        // Handle timeConstraints change
        if (JSON.stringify(prevPropsRef.current.timeConstraints) !== JSON.stringify(timeConstraints)) {
            prevPropsRef.current.timeConstraints = { ...timeConstraints };
            generateDaysAndTimeSlots();
        }

        // Handle timeZone change
        if (timeZone !== undefined && prevPropsRef.current.timeZone !== timeZone) {
            setCurrentTimezone(timeZone);
            prevPropsRef.current.timeZone = timeZone;
            generateDaysAndTimeSlots();
        }
    }, [visible, selectedDateRange, timeConstraints, timeZone]);

    // Use useEffect with no dependencies for first render initialization
    useEffect(() => {
        generateDaysAndTimeSlots();

        // Setup resize observer instead of event listener
        const resizeObserver = new ResizeObserver((entries) => {
            if (entries[0]) {
                calculateDaysToShow();
            }
        });

        if (gridContainerRef.current) {
            resizeObserver.observe(gridContainerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // useEffect specifically for responding to calculatedDaysToShow and currentPage changes
    useEffect(() => {
        const totalDays = Math.ceil((selectedDateRange.end.getTime() - selectedDateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (totalDays === 0) {
            generateDaysAndTimeSlots();
        }
    }, [calculatedDaysToShow, currentPage]);

    const calculateDaysToShow = () => {
        if (!gridContainerRef.current) return;

        const containerWidth = gridContainerRef.current.clientWidth;
        const minDayWidth = 160; // Minimum width for a day column
        const padding = 15; // Gap between columns

        // Calculate how many days can fit
        const maxDays = Math.floor((containerWidth + padding) / (minDayWidth + padding));
        const newValue = Math.max(1, maxDays);

        // Only update if the value has changed
        if (newValue !== calculatedDaysToShow) {
            setCalculatedDaysToShow(newValue);
        }
    };

    const handleTimezoneChange = (newTimezone: string) => {
        setCurrentTimezone(newTimezone);
        onTimeZoneChange(newTimezone);
    };

    const renderTimezoneSelector = () => {
        return (
            <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Timezone:</span>
                <select
                    value={currentTimezone}
                    onChange={(e) => handleTimezoneChange(e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                >
                    {timeZones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                            {tz.label}
                        </option>
                    ))}
                </select>
            </div>
        );
    };

    const generateDaysAndTimeSlots = useCallback(() => {
        const days: Date[] = [];
        const timeSlots: TimeSlot[] = [];
        const now = new Date();

        // Get current time in the selected timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: currentTimezone,
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        });

        const currentTimeStr = formatter.format(now);
        const [currentHour, currentMinute] = currentTimeStr.split(':').map(Number);
        const currentTime = currentHour * 60 + currentMinute;

        // Generate days within the selected date range
        const startDate = new Date(selectedDateRange.start);
        const endDate = new Date(selectedDateRange.end);
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            days.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Generate time slots
        const [startHour, startMinute] = timeConstraints.start.split(':').map(Number);
        const [endHour, endMinute] = timeConstraints.end.split(':').map(Number);
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;

        days.forEach((date: Date) => {
            const isToday = date.toDateString() === now.toDateString();
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);

            for (let time = startTime; time < endTime; time += 30) {
                const slotStart = new Date(dayStart);
                slotStart.setMinutes(time);
                const slotEnd = new Date(dayStart);
                slotEnd.setMinutes(time + 30);

                // Skip past time slots for today
                if (isToday && time < currentTime) continue;

                timeSlots.push({
                    id: `${date.toISOString()}-${time}`,
                    day: date,
                    time: `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}`,
                    selected: false,
                    count: 0,
                    users: [],
                    start: slotStart,
                    end: slotEnd
                });
            }
        });

        setDisplayedDays(days);
        setTimeSlots(timeSlots);
    }, [currentTimezone, timeConstraints, selectedDateRange]);

    const handlePreviousPage = () => {
        const totalDays = Math.ceil((selectedDateRange.end.getTime() - selectedDateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        // Only allow paging if we have many days to show
        if (totalDays > calculatedDaysToShow) {
            setCurrentPage(prev => Math.max(0, prev - 1));
        }
    };

    const handleNextPage = () => {
        const totalDays = Math.ceil((selectedDateRange.end.getTime() - selectedDateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        // Only allow paging if we have many days to show
        if (totalDays > calculatedDaysToShow &&
            (currentPage + 1) * calculatedDaysToShow < totalDays) {
            setCurrentPage(prev => prev + 1);
        }
    };

    // Use useMemo to memoize the visibleDays array and pagination state
    const { visibleDays, isPrevDisabled, isNextDisabled } = React.useMemo(() => {
        let visibleDaysArray = displayedDays;

        const totalDays = Math.ceil((selectedDateRange.end.getTime() - selectedDateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (totalDays > calculatedDaysToShow) {
            const startIdx = currentPage * calculatedDaysToShow;
            const endIdx = Math.min(startIdx + calculatedDaysToShow, displayedDays.length);
            visibleDaysArray = displayedDays.slice(startIdx, endIdx);
        }

        // Calculate if next/prev buttons should be disabled
        const isPrevButtonDisabled = currentPage === 0;
        const isNextButtonDisabled = totalDays <= calculatedDaysToShow ||
            (currentPage + 1) * calculatedDaysToShow >= totalDays;

        return {
            visibleDays: visibleDaysArray,
            isPrevDisabled: isPrevButtonDisabled,
            isNextDisabled: isNextButtonDisabled
        };
    }, [displayedDays, currentPage, calculatedDaysToShow, selectedDateRange]);

    const handleMouseDown = (slot: TimeSlot, isAdminMeetingMode: boolean = false) => {
        // Determine if we're in deselection mode based on slot's current state
        const isDeselectionMode = isAdminMeetingMode
            ? tempMeetingSlots.some(s => s.id === slot.id)
            : selectedTimeSlots.some(s => s.id === slot.id) || pendingTimeSlots.some(s => s.id === slot.id);

        setIsDeselecting(isDeselectionMode);

        if (isAdmin && editingMeetingId) {
            // Handle meeting time selection for admin
            if (isDeselectionMode) {
                // Remove if already selected
                setTempMeetingSlots(prev => prev.filter(s => s.id !== slot.id));
            } else {
                // Add if not selected
                setTempMeetingSlots(prev => [...prev, slot]);
            }
        } else {
            // Handle regular availability selection
            if (isDeselectionMode) {
                // Toggle off (remove from selection)
                setPendingTimeSlots(prev => prev.filter(s => s.id !== slot.id));
                setSelectedTimeSlots(prev => prev.filter(s => s.id !== slot.id));
            } else {
                // Toggle on (add to selection)
                setPendingTimeSlots(prev => [...prev, { ...slot, selected: true }]);
            }
        }

        setIsDragging(true);
    };

    const handleMouseEnter = (slot: TimeSlot) => {
        if (!isDragging) return;

        if (isAdmin && editingMeetingId) {
            // Handle meeting time selection for admin
            const slotExists = tempMeetingSlots.some(s => s.id === slot.id);

            if (isDeselecting && slotExists) {
                // If deselecting and slot exists, remove it
                setTempMeetingSlots(prev => prev.filter(s => s.id !== slot.id));
            } else if (!isDeselecting && !slotExists) {
                // If selecting and slot doesn't exist, add it
                setTempMeetingSlots(prev => [...prev, slot]);
            }
        } else {
            // Handle regular availability selection
            const pendingSlotIndex = pendingTimeSlots.findIndex(s => s.id === slot.id);
            const selectedSlotIndex = selectedTimeSlots.findIndex(s => s.id === slot.id);

            if (isDeselecting) {
                // If in deselect mode, remove from both arrays if present
                if (pendingSlotIndex !== -1) {
                    setPendingTimeSlots(prev => prev.filter(s => s.id !== slot.id));
                }
                if (selectedSlotIndex !== -1) {
                    setSelectedTimeSlots(prev => prev.filter(s => s.id !== slot.id));
                }
            } else {
                // If in select mode, add if not already in either array
                if (pendingSlotIndex === -1 && selectedSlotIndex === -1) {
                    setPendingTimeSlots(prev => [...prev, { ...slot, selected: true }]);
                }
            }
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleSlotClick = (slot: TimeSlot) => {
        // Only update the selected time slot if not in admin editing mode
        if (!(isAdmin && editingMeetingId !== null)) {
            setSelectedTimeSlot(selectedTimeSlot?.id === slot.id ? null : slot);
        }
    };

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    const confirmAvailabilitySelections = () => {
        // Combine existing selections with pending ones
        const updatedSlots = [...pendingTimeSlots];

        // Update the timeSlots state
        setTimeSlots(prev =>
            prev.map(slot => {
                const pendingSlot = updatedSlots.find(s => s.id === slot.id);
                if (pendingSlot) {
                    return {
                        ...slot,
                        selected: true,
                        count: slot.count + 1,
                        users: [...slot.users, 'Current User'] // Replace userData with a placeholder
                    };
                }
                return slot;
            })
        );

        // Update selected slots
        setSelectedTimeSlots(prev => {
            const newSelections = [...prev];
            updatedSlots.forEach(pending => {
                if (!newSelections.some(s => s.id === pending.id)) {
                    newSelections.push({ ...pending, selected: true });
                }
            });
            return newSelections;
        });

        // Clear pending selections
        setPendingTimeSlots([]);

        // Notify parent component if needed
        if (onSelectionChange) {
            onSelectionChange(meetingTimes);
        }
    };

    const cancelPendingSelections = () => {
        setPendingTimeSlots([]);
    };

    const startEditingMeeting = () => {
        setTempMeetingSlots([]);
        setMeetingName('Meeting ' + (meetingTimes.length + 1));
        setEditingMeetingId('new');
    };

    const editExistingMeeting = (meeting: MeetingTime) => {
        setTempMeetingSlots([...meeting.slots]);
        setMeetingName(meeting.name);
        setEditingMeetingId(meeting.id);
    };

    const cancelMeetingEdit = () => {
        setTempMeetingSlots([]);
        setEditingMeetingId(null);
        setMeetingName('');
    };

    const confirmMeetingTime = () => {
        if (tempMeetingSlots.length === 0) {
            return; // Don't create empty meeting times
        }

        if (editingMeetingId === 'new') {
            // Create a new meeting time with a new color
            const colorIndex = meetingTimes.length % meetingColors.length;

            const newMeeting: MeetingTime = {
                id: Date.now().toString(),
                name: meetingName || `Meeting ${meetingTimes.length + 1}`,
                slots: [...tempMeetingSlots],
                colorIndex: colorIndex
            };

            setMeetingTimes(prev => [...prev, newMeeting]);
        } else if (editingMeetingId) {
            // Update existing meeting time
            setMeetingTimes(prev =>
                prev.map(meeting =>
                    meeting.id === editingMeetingId
                        ? { ...meeting, name: meetingName, slots: [...tempMeetingSlots] }
                        : meeting
                )
            );
        }

        // Reset state
        setTempMeetingSlots([]);
        setEditingMeetingId(null);
        setMeetingName('');
    };

    const deleteMeeting = (meetingId: string) => {
        setMeetingTimes(prev => prev.filter(meeting => meeting.id !== meetingId));
    };

    // Check if a time slot is part of a meeting time
    const isMeetingTimeSlot = (slotId: string) => {
        return meetingTimes.some(meeting =>
            meeting.slots.some(slot => slot.id === slotId)
        );
    };

    const getMeetingForSlot = (slotId: string) => {
        return meetingTimes.find(meeting =>
            meeting.slots.some(slot => slot.id === slotId)
        );
    };

    // Get the color style for a specific meeting time slot
    const getMeetingColorStyle = (slotId: string) => {
        const meeting = getMeetingForSlot(slotId);
        if (!meeting) return {};

        const colorStyle = meetingColors[meeting.colorIndex];
        return {
            backgroundColor: colorStyle.bg,
            borderColor: colorStyle.border,
            borderWidth: '2px',
            borderStyle: 'solid'
        };
    };

    // Determine if a slot is in the current editing session
    const isTempMeetingSlot = (slotId: string) => {
        return tempMeetingSlots.some(slot => slot.id === slotId);
    };

    // Determine if a slot is in pending selection
    const isPendingSelection = (slotId: string) => {
        return pendingTimeSlots.some(slot => slot.id === slotId);
    };

    // Determine if a slot is in user's selections
    const isUserSelection = (slotId: string) => {
        return selectedTimeSlots.some(slot => slot.id === slotId);
    };

    return (
        <div className="time-slot-main-container">
            <div className="time-slot-header">
                <h3>Time Slot Selector</h3>
                <button className="fold-button" onClick={toggleExpanded}>
                    {isExpanded ? (
                        <ChevronUpIcon className="h-5 w-5" />
                    ) : (
                        <ChevronDownIcon className="h-5 w-5" />
                    )}
                </button>
            </div>

            {isExpanded && (
                <>
                    {meetingTimes.length > 0 && (
                        <div className="meeting-times-list">
                            {meetingTimes.map(meeting => {
                                const colorStyle = meetingColors[meeting.colorIndex];
                                return (
                                    <div
                                        key={meeting.id}
                                        className="meeting-time-item"
                                        style={{
                                            backgroundColor: colorStyle.bg,
                                            borderColor: colorStyle.border
                                        }}
                                    >
                                        <div
                                            className="meeting-time-header"
                                            style={{ backgroundColor: colorStyle.border, color: 'white' }}
                                        >
                                            <h4>{meeting.name}</h4>
                                        </div>
                                        <div className="meeting-time-slots">
                                            {meeting.slots.map(slot => (
                                                <div
                                                    key={slot.id}
                                                    className="meeting-slot-pill"
                                                    style={{
                                                        backgroundColor: `${colorStyle.bg}`,
                                                        borderColor: colorStyle.border,
                                                        color: colorStyle.border
                                                    }}
                                                >
                                                    {format(new Date(slot.day), 'MMM d')} • {slot.time}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="meeting-actions">
                                            <button
                                                className="small-button edit-btn"
                                                onClick={() => editExistingMeeting(meeting)}
                                                disabled={!!editingMeetingId}
                                                style={{
                                                    backgroundColor: `${colorStyle.bg}`,
                                                    borderColor: colorStyle.border,
                                                    color: colorStyle.border
                                                }}
                                            >
                                                <PencilIcon className="h-3 w-3" /> Edit
                                            </button>
                                            <button
                                                className="small-button delete-btn"
                                                onClick={() => deleteMeeting(meeting.id)}
                                            >
                                                <TrashIcon className="h-3 w-3" /> Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="time-slot-controls">
                        {renderTimezoneSelector()}
                    </div>

                    <div className="time-slot-content-wrapper">
                        <div className="time-slot-grid-container" ref={gridContainerRef}>
                            <div className="time-slot-date-range">
                                <button
                                    className="date-nav-button"
                                    onClick={handlePreviousPage}
                                    disabled={isPrevDisabled}
                                >
                                    <ChevronLeftIcon className="h-5 w-5" />
                                </button>

                                {visibleDays.length > 0 && (
                                    <div className="pagination-indicator">
                                        {format(visibleDays[0], 'MMM d')} - {format(visibleDays[visibleDays.length - 1], 'MMM d, yyyy')}
                                    </div>
                                )}

                                <button className="date-nav-button" onClick={handleNextPage} disabled={isNextDisabled}>
                                    <ChevronRightIcon className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="time-slot-container auto-fit">
                                {visibleDays.map((day, dayIndex) => (
                                    <div key={dayIndex} className="time-slot-section">
                                        <div className="date-header">
                                            <CalendarIcon className="h-5 w-5 calendar-icon" />
                                            <h3>{format(day, 'EEEE, MMM d')}</h3>
                                        </div>

                                        <div className="time-slot-column">
                                            {timeSlots
                                                .filter(slot => format(new Date(slot.day), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
                                                .map(slot => {
                                                    const isMeetingTime = isMeetingTimeSlot(slot.id);
                                                    const isEditing = isTempMeetingSlot(slot.id);
                                                    const isPending = isPendingSelection(slot.id);
                                                    const isUserSelectionSlot = isUserSelection(slot.id);
                                                    const isInAdminEditMode = isAdmin && editingMeetingId !== null;

                                                    // Apply meeting specific color styles if it's a meeting time slot
                                                    const colorStyle = isMeetingTime ? getMeetingColorStyle(slot.id) : {};

                                                    return (
                                                        <div
                                                            key={slot.id}
                                                            className={`time-slot 
                                                                      ${isUserSelectionSlot ? 'user-selection' : ''}
                                                                      ${isPending ? 'pending-selection' : ''} 
                                                                      ${isMeetingTime ? 'meeting-time' : ''} 
                                                                      ${isEditing ? 'temp-meeting-time' : ''}`}
                                                            style={colorStyle}
                                                            onMouseDown={() => handleMouseDown(slot, isInAdminEditMode)}
                                                            onMouseEnter={() => handleMouseEnter(slot)}
                                                            onMouseUp={handleMouseUp}
                                                            onClick={() => isInAdminEditMode ? undefined : handleSlotClick(slot)}
                                                        >
                                                            <span className="time-slot-text">{slot.time}</span>
                                                            {!isInAdminEditMode && !isEditing && slot.count > 0 &&
                                                                <span className="time-slot-count">{slot.count}</span>
                                                            }
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="time-slot-details-panel">
                            {selectedTimeSlot && editingMeetingId === null ? (
                                <>
                                    <div className="slot-details-header">
                                        <h3>
                                            {format(new Date(selectedTimeSlot.day), 'EEEE, MMM d')} • {selectedTimeSlot.time}
                                        </h3>
                                        <button
                                            className="close-button-small"
                                            onClick={() => setSelectedTimeSlot(null)}
                                        >
                                            <XMarkIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="slot-details-content">
                                        {isMeetingTimeSlot(selectedTimeSlot.id) && (
                                            <div className="slot-info">
                                                <p><strong>Meeting:</strong> {getMeetingForSlot(selectedTimeSlot.id)?.name}</p>
                                            </div>
                                        )}

                                        <div className="selected-users">
                                            <h4>People available ({selectedTimeSlot.users.length}):</h4>
                                            {selectedTimeSlot.users.length > 0 ? (
                                                <ul>
                                                    {selectedTimeSlot.users.map(user => (
                                                        <li key={user}>{user}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="no-users-message">No one has selected this time slot yet.</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="instructions-panel">
                                    <div className="slot-details-header">
                                        <h3>Instructions</h3>
                                    </div>
                                    <div className="instructions">
                                        <ul className="instruction-list">
                                            <li>Click and drag to select multiple time slots you're available for</li>
                                            <li>Click on a time slot to see who else is available</li>
                                            <li>To deselect time slots, click or drag over selected slots</li>
                                            <li>Click the Confirm button to save your selections</li>
                                        </ul>

                                        {pendingTimeSlots.length > 0 && (
                                            <div className="selection-actions">
                                                <button className="confirm-button" onClick={confirmAvailabilitySelections}>
                                                    <CheckIcon className="h-4 w-4 mr-1" />
                                                    Confirm Selections
                                                </button>
                                                <button className="cancel-button" onClick={cancelPendingSelections}>
                                                    Cancel
                                                </button>
                                            </div>
                                        )}

                                        {isAdmin && (
                                            <>
                                                <div className="admin-instructions">
                                                    <p>Admin Functions:</p>
                                                    <ul className="admin-instruction-list">
                                                        <li>Click "Add meeting time" to create a new meeting time</li>
                                                        <li>Click and drag to select multiple time slots for the meeting</li>
                                                        <li>Click and drag over selected slots to deselect them</li>
                                                        <li>Enter a name for the meeting time group</li>
                                                        <li>Click "Confirm" to save the meeting time</li>
                                                    </ul>
                                                </div>

                                                {editingMeetingId ? (
                                                    <>
                                                        <div className="meeting-name-input">
                                                            <label htmlFor="meeting-name">Meeting Name:</label>
                                                            <input
                                                                id="meeting-name"
                                                                type="text"
                                                                value={meetingName}
                                                                onChange={(e) => setMeetingName(e.target.value)}
                                                                placeholder="e.g. Project Kickoff"
                                                            />
                                                        </div>

                                                        {tempMeetingSlots.length > 0 && (
                                                            <div className="temp-slots-list">
                                                                <p><strong>Selected slots:</strong></p>
                                                                {tempMeetingSlots.map(slot => (
                                                                    <div key={slot.id} className="temp-slot-item">
                                                                        {format(new Date(slot.day), 'MMM d')} • {slot.time}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="admin-actions">
                                                            <button
                                                                className="confirm-button"
                                                                onClick={confirmMeetingTime}
                                                                disabled={tempMeetingSlots.length === 0}
                                                            >
                                                                <CheckIcon className="h-4 w-4 mr-1" />
                                                                Confirm Meeting Time
                                                            </button>
                                                            <button
                                                                className="cancel-button"
                                                                onClick={cancelMeetingEdit}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="admin-actions">
                                                        <button
                                                            className="confirm-button"
                                                            onClick={startEditingMeeting}
                                                        >
                                                            Add Meeting Time
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <div className="instruction-hint">
                                            Tip: After you confirm your availability, others will be able to see it when making their selections!
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TimeSlotSelector;
