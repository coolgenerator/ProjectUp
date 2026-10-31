import React, { useState, useEffect } from "react";
import Select from "react-select";
import "./ScheduleMeeting.css"; // Include custom styles
import { timeZones, getTimezoneOffset, TimeZoneInfo } from "./datasets/timeZone";
import { ChevronDownIcon, ChevronUpIcon, ArrowPathIcon, CalendarIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface ScheduleMeetingProps {
    onSaveAvailability: (data: {
        dates: string[];
        timeZone: number;
        timePeriod: { start: string; end: string };
    }) => void;
}

const ScheduleMeeting: React.FC<ScheduleMeetingProps> = ({ onSaveAvailability }) => {
    // Define formatDate and today before usage
    const formatDate = (date: Date): string => date.toISOString().split("T")[0];

    // Get user's local timezone offset
    const userTimezoneOffset = new Date().getTimezoneOffset();
    const userTimezone = -userTimezoneOffset / 60; // Convert minutes to hours

    // Get user's timezone name
    const userTimezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log("User's timezone name:", userTimezoneName);

    // Create today's date in user's timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the timezone that matches the user's local timezone and location
    const defaultTimeZone = timeZones.find(tz => {
        // First check if the timezone value matches
        if (!tz || !tz.value) return false;
        const tzOffset = getTimezoneOffset(tz.value);
        if (tzOffset !== userTimezone) return false;

        // Then check if the timezone label contains the user's location
        const locationMatch = tz.label.toLowerCase().includes(userTimezoneName.toLowerCase().split('/')[0]);
        return locationMatch;
    }) || timeZones.find(tz => tz && getTimezoneOffset(tz.value) === userTimezone) || timeZones[0];

    const defaultTimePeriod = { start: "09:00", end: "17:00" };

    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [hoveredDates, setHoveredDates] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isDeselecting, setIsDeselecting] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZoneInfo>(defaultTimeZone);
    const [timePeriod, setTimePeriod] = useState<{ start: string; end: string }>(defaultTimePeriod);
    const [isTimeSlotAreaOpen, setIsTimeSlotAreaOpen] = useState(true);
    const [hasShared, setHasShared] = useState(false);

    // For time sliders
    const [startHourValue, setStartHourValue] = useState(9);
    const [startMinuteValue, setStartMinuteValue] = useState(0);
    const [endHourValue, setEndHourValue] = useState(17);
    const [endMinuteValue, setEndMinuteValue] = useState(0);

    // Update timePeriod when slider values change
    useEffect(() => {
        const startTime = `${startHourValue.toString().padStart(2, "0")}:${startMinuteValue === 0 ? "00" : "30"}`;
        const endTime = `${endHourValue.toString().padStart(2, "0")}:${endMinuteValue === 0 ? "00" : "30"}`;

        setTimePeriod({
            start: startTime,
            end: endTime
        });
    }, [startHourValue, startMinuteValue, endHourValue, endMinuteValue]);

    // Auto-save default dates on initial render
    useEffect(() => {
        // Only save when dates are explicitly shared by the user
        if (hasShared) {
            onSaveAvailability({
                dates: selectedDates,
                timeZone: getTimezoneOffset(selectedTimeZone.value),
                timePeriod
            });
        }
    }, [hasShared]);

    const getDaysInMonth = (date: Date): (Date | null)[] => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const lastDateOfMonth = new Date(year, month + 1, 0).getDate();
        const adjustedFirstDay = firstDayOfMonth === 0 ? 7 : firstDayOfMonth + 1;
        const days = Array.from({ length: lastDateOfMonth }, (_, i) => new Date(year, month, i + 1));
        const paddingDays = Array.from({ length: adjustedFirstDay - 1 }, () => null);

        return [...paddingDays, ...days];
    };

    const handleMouseDown = (date: Date | null) => {
        if (!date) return;
        const formattedDate = formatDate(date);
        setIsDragging(true);

        setIsDeselecting(selectedDates.includes(formattedDate)); // Set toggle state based on current selection

        setHoveredDates([formattedDate]);
    };

    const handleMouseEnter = (date: Date | null) => {
        if (!isDragging || !date) return;

        const formattedDate = formatDate(date);

        setHoveredDates((prev) =>
            prev.includes(formattedDate) ? prev : [...prev, formattedDate]
        );
    };

    const handleMouseUp = () => {
        setIsDragging(false);

        // Add or remove hovered dates based on toggle state
        setSelectedDates((prev) =>
            isDeselecting
                ? prev.filter((date) => !hoveredDates.includes(date)) // Remove hovered dates
                : Array.from(new Set([...prev, ...hoveredDates])) // Add hovered dates
        );
        setHoveredDates([]);
    };

    const changeMonth = (direction: "prev" | "next") => {
        setCurrentMonth((prev) => {
            const newMonth = new Date(
                prev.getFullYear(),
                prev.getMonth() + (direction === "next" ? 1 : -1),
                1
            );
            return newMonth;
        });
    };

    const handleSave = () => {
        onSaveAvailability({
            dates: selectedDates,
            timeZone: getTimezoneOffset(selectedTimeZone.value),
            timePeriod,
        });
        setHasShared(true);
    };

    const handleReset = () => {
        setSelectedDates([]);
        setSelectedTimeZone(defaultTimeZone);
        setTimePeriod(defaultTimePeriod);
        setCurrentMonth(new Date());
        setStartHourValue(9);
        setStartMinuteValue(0);
        setEndHourValue(17);
        setEndMinuteValue(0);
        setHasShared(false);
    };

    const toggleTimeSlotArea = () => {
        setIsTimeSlotAreaOpen(!isTimeSlotAreaOpen);
    };

    const formatTimeDisplay = (hour: number, minute: number): string => {
        const minuteStr = minute === 0 ? "00" : "30";
        const period = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        return `${displayHour}:${minuteStr} ${period}`;
    };

    // Calculate the percentage for start time restriction based on end time
    const getStartTimeRestrictionPercentage = () => {
        const totalPositions = 48; // 24 hours * 2 positions per hour
        const endPosition = endHourValue * 2 + (endMinuteValue === 30 ? 1 : 0);
        return ((totalPositions - endPosition) / totalPositions) * 100;
    };

    // Calculate the percentage for end time restriction based on start time
    const getEndTimeRestrictionPercentage = () => {
        const totalPositions = 48; // 24 hours * 2 positions per hour
        const startPosition = startHourValue * 2 + (startMinuteValue === 30 ? 1 : 0);
        return (startPosition / totalPositions) * 100;
    };

    // Update isTimeSlotAvailable function to handle timezone correctly
    const isTimeSlotAvailable = (date: Date, timeZone: string | undefined): boolean => {
        if (!timeZone) return false;

        const now = new Date();
        const userTimezoneOffset = now.getTimezoneOffset();
        const targetTimezoneOffset = getTimezoneOffset(timeZone) * 60; // Convert hours to minutes

        // Adjust the current time to the target timezone
        const adjustedNow = new Date(now.getTime() + (targetTimezoneOffset + userTimezoneOffset) * 60000);
        const targetDate = new Date(date.getTime() + (targetTimezoneOffset + userTimezoneOffset) * 60000);

        // Set both dates to start of day for comparison
        adjustedNow.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        // If the date is today, check if the time slot is in the past
        if (formatDate(targetDate) === formatDate(adjustedNow)) {
            return targetDate >= adjustedNow;
        }

        // For future dates, all slots are available
        return targetDate >= adjustedNow;
    };

    const days = getDaysInMonth(currentMonth);
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <div className="schedule-meeting-wrapper">
            <div className="schedule-meeting-card">
                <div className="schedule-meeting-header">
                    <h3>Select Your Availability</h3>
                    <div className="schedule-meeting-actions">
                        <button
                            className="reset-button"
                            onClick={handleReset}
                            title="Reset all selections"
                        >
                            <ArrowPathIcon className="h-4 w-4 mr-1" />
                            Reset
                        </button>
                        <button
                            className="toggle-button"
                            onClick={toggleTimeSlotArea}
                            aria-expanded={isTimeSlotAreaOpen}
                            title={isTimeSlotAreaOpen ? "Collapse time slot area" : "Expand time slot area"}
                        >
                            {isTimeSlotAreaOpen ? (
                                <ChevronUpIcon className="h-5 w-5" />
                            ) : (
                                <ChevronDownIcon className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                </div>

                <div className={`schedule-meeting-content ${isTimeSlotAreaOpen ? 'expanded' : 'collapsed'}`}>
                    <div
                        className="schedule-meeting"
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {/* Header */}
                        <div className="calendar-header">
                            <button
                                className="month-nav-button"
                                onClick={() => changeMonth("prev")}
                                aria-label="Previous month"
                            >
                                &lt;
                            </button>
                            <h2>
                                {currentMonth.toLocaleString("default", { month: "long" })}{" "}
                                {currentMonth.getFullYear()}
                            </h2>
                            <button
                                className="month-nav-button"
                                onClick={() => changeMonth("next")}
                                aria-label="Next month"
                            >
                                &gt;
                            </button>
                        </div>

                        {/* Time Zone Selector */}
                        <div className="time-zone-selector">
                            <label htmlFor="timeZone">Time Zone:</label>
                            <Select
                                id="timeZone"
                                options={timeZones}
                                value={selectedTimeZone}
                                onChange={(value) => setSelectedTimeZone(value!)}
                                className="time-zone-dropdown"
                                classNamePrefix="time-zone-select"
                                isSearchable={true}
                            />
                        </div>

                        {/* Weekdays */}
                        <div className="weekdays">
                            {weekdays.map((day) => (
                                <span key={day}>{day}</span>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="calendar-grid">
                            {days.map((day, index) => {
                                if (!day) {
                                    return <div key={index} className="day empty"></div>;
                                }

                                const formattedDate = formatDate(day);
                                const isSelected = selectedDates.includes(formattedDate);
                                const isHovered = hoveredDates.includes(formattedDate);
                                const isToday = formatDate(today) === formattedDate;
                                const isAvailable = isTimeSlotAvailable(day, selectedTimeZone.value);

                                let className = "day";
                                if (!isAvailable) className += " disabled";
                                if (isSelected) className += " selected";
                                if (isHovered) className += " hovered";
                                if (isToday) className += " today";

                                return (
                                    <div
                                        key={formattedDate}
                                        className={className}
                                        onMouseDown={() => isAvailable && handleMouseDown(day)}
                                        onMouseEnter={() => isAvailable && handleMouseEnter(day)}
                                    >
                                        {day.getDate()}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Time Period Selector with Sliders */}
                        <div className="time-period-selector">
                            <div className="time-period-field">
                                <label htmlFor="start-time">Start Time: {formatTimeDisplay(startHourValue, startMinuteValue)}</label>
                                <div className="time-slider-container">
                                    <div className="restriction-overlay start-restriction" style={{ width: `${getStartTimeRestrictionPercentage()}%`, right: '0' }}></div>
                                    <input
                                        type="range"
                                        className="time-slider"
                                        min="0"
                                        max="47"
                                        value={startHourValue * 2 + (startMinuteValue === 30 ? 1 : 0)}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            const hour = Math.floor(value / 2);
                                            const minute = value % 2 === 0 ? 0 : 30;

                                            // Make sure start time doesn't exceed end time
                                            if (hour < endHourValue || (hour === endHourValue && minute < endMinuteValue)) {
                                                setStartHourValue(hour);
                                                setStartMinuteValue(minute);
                                            }
                                        }}
                                    />
                                    <div className="time-boundaries">
                                        <span>12 AM</span>
                                        <span>12 PM</span>
                                        <span>11:30 PM</span>
                                    </div>
                                </div>
                            </div>

                            <div className="time-period-field">
                                <label htmlFor="end-time">End Time: {formatTimeDisplay(endHourValue, endMinuteValue)}</label>
                                <div className="time-slider-container">
                                    <div className="restriction-overlay end-restriction" style={{ width: `${getEndTimeRestrictionPercentage()}%` }}></div>
                                    <input
                                        type="range"
                                        className="time-slider"
                                        min="0"
                                        max="47"
                                        value={endHourValue * 2 + (endMinuteValue === 30 ? 1 : 0)}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            const hour = Math.floor(value / 2);
                                            const minute = value % 2 === 0 ? 0 : 30;

                                            // Make sure end time doesn't precede start time
                                            if (hour > startHourValue || (hour === startHourValue && minute > startMinuteValue)) {
                                                setEndHourValue(hour);
                                                setEndMinuteValue(minute);
                                            }
                                        }}
                                    />
                                    <div className="time-boundaries">
                                        <span>12 AM</span>
                                        <span>12 PM</span>
                                        <span>11:30 PM</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="schedule-meeting-footer">
                    <div className="selected-dates-summary">
                        {selectedDates.length > 0 ? (
                            <>
                                <CalendarIcon className="h-4 w-4 mr-1" />
                                Selected dates <span className="date-count">{selectedDates.length}</span>
                                {hasShared && (
                                    <span className="shared-status">
                                        <span className="dot"></span>Shared
                                    </span>
                                )}
                            </>
                        ) : (
                            <span className="no-dates-message">
                                <XCircleIcon className="h-4 w-4 mr-1" />
                                No dates selected
                            </span>
                        )}
                    </div>
                    <button
                        className={`save-button ${selectedDates.length === 0 ? 'disabled' : ''}`}
                        onClick={handleSave}
                        disabled={selectedDates.length === 0}
                    >
                        Share with Team
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScheduleMeeting;
