import React, { useState, useRef, useEffect } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';

interface DatePickerProps {
  value?: string; // ISO date string (due_date)
  onChange: (date: string | null) => void;
  placeholder?: string;
  startDate?: string; // For displaying existing range
  endDate?: string; // For displaying existing range
  onRangeChange?: (startDate: string | null, endDate: string | null) => void;
  minDate?: Date;
  maxDate?: Date;
  inline?: boolean;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  startDate: startDateProp,
  endDate: endDateProp,
  onRangeChange,
  minDate,
  maxDate,
  inline = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastClickTimeRef = useRef<number>(0);
  const lastClickDateRef = useRef<Date | null>(null);

  // Parse date strings to Date objects
  const parseDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr);
    } catch {
      return null;
    }
  };

  // State for range selection
  const [rangeStart, setRangeStart] = useState<Date | null>(parseDate(startDateProp));
  const [rangeEnd, setRangeEnd] = useState<Date | null>(parseDate(endDateProp));
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [hasCompletedRange, setHasCompletedRange] = useState(false);

  // Update internal state when props change
  useEffect(() => {
    const start = parseDate(startDateProp);
    const end = parseDate(endDateProp);

    if (start || end) {
      setRangeStart(start);
      setRangeEnd(end);
      if (start && end) {
        setHasCompletedRange(true);
        setIsSelectingRange(true);
      }
    }
  }, [startDateProp, endDateProp]);

  // Reset selection state when opening
  useEffect(() => {
    if (isOpen && !startDateProp && !endDateProp && !value) {
      setRangeStart(null);
      setRangeEnd(null);
      setIsSelectingRange(false);
      setHasCompletedRange(false);
    }
  }, [isOpen, startDateProp, endDateProp, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsSelectingRange(false);
        setRangeStart(null);
        setRangeEnd(null);
        setHasCompletedRange(false);
      }
    };

    if (isOpen && !inline) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, inline]);

  const handleDateClick = (dateInput: Date | [Date | null, Date | null] | null) => {
    // Handle different date formats from react-datepicker
    let date: Date | null = null;

    if (Array.isArray(dateInput)) {
      // When selectsRange is true, react-datepicker returns [start, end]
      // We ignore this and handle clicks manually
      return;
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      return;
    }

    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    const isSameDate = lastClickDateRef.current?.toDateString() === date.toDateString();

    // Double-click detection (within 300ms)
    if (timeSinceLastClick < 300 && isSameDate) {
      // Double-click: Set as single date (due date only), close selector
      onChange(date.toISOString());
      setIsSelectingRange(false);
      setRangeStart(null);
      setRangeEnd(null);
      setHasCompletedRange(false);
      setIsOpen(false);
      lastClickTimeRef.current = 0;
      lastClickDateRef.current = null;
      return;
    }

    // Single click handling for range selection
    // If onRangeChange is not provided, disable range selection (e.g., for milestones)
    if (!onRangeChange) {
      // Range selection disabled - treat every click as single date, no confirm needed
      return;
    }

    if (hasCompletedRange) {
      // Third click: Start over - treat as new start date, remove previous period
      setRangeStart(date);
      setRangeEnd(null);
      setIsSelectingRange(true);
      setHasCompletedRange(false);
    } else if (!rangeStart) {
      // First click: Set as start date
      setRangeStart(date);
      setRangeEnd(null);
      setIsSelectingRange(true);
      setHasCompletedRange(false);
    } else {
      // Second click: Either complete range or restart
      if (date < rangeStart) {
        // Clicked before start date: Start over from this date
        setRangeStart(date);
        setRangeEnd(null);
        setIsSelectingRange(true);
        setHasCompletedRange(false);
      } else {
        // Clicked after start date: Set as due date (complete range)
        setRangeEnd(date);
        setIsSelectingRange(true);
        setHasCompletedRange(true);
      }
    }

    lastClickTimeRef.current = now;
    lastClickDateRef.current = date;
  };

  const handleConfirm = () => {
    if (hasCompletedRange && rangeStart && rangeEnd && onRangeChange) {
      // Confirm range selection
      onRangeChange(rangeStart.toISOString(), rangeEnd.toISOString());
    } else if (rangeStart && !rangeEnd) {
      // Only start date selected, treat as single date
      onChange(rangeStart.toISOString());
    }

    // Reset and close
    setIsSelectingRange(false);
    setRangeStart(null);
    setRangeEnd(null);
    setHasCompletedRange(false);
    setIsOpen(false);
  };

  const formatDisplayDate = (): string => {
    const start = rangeStart || parseDate(startDateProp);
    const end = rangeEnd || parseDate(endDateProp);

    if (start && end) {
      return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
    } else if (start) {
      return `${format(start, 'MMM dd')} - ...`;
    } else if (value) {
      const dueDate = parseDate(value);
      return dueDate ? format(dueDate, 'MMM dd, yyyy') : placeholder;
    }
    return placeholder;
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRangeStart(null);
    setRangeEnd(null);
    setIsSelectingRange(false);
    setHasCompletedRange(false);
    if (onRangeChange) {
      onRangeChange(null, null);
    }
    onChange(null);
  };

  const currentDate = parseDate(value);
  // Only use props for initial display, not during active selection
  const displayStart = rangeStart || (!isSelectingRange ? parseDate(startDateProp) : null);
  const displayEnd = rangeEnd || (!isSelectingRange ? parseDate(endDateProp) : null);

  if (inline) {
    return (
      <div className={`inline-date-picker ${className}`}>
        <ReactDatePicker
          selected={null}
          onChange={handleDateClick}
          startDate={displayStart}
          endDate={displayEnd}
          minDate={minDate}
          maxDate={maxDate}
          inline
          calendarClassName="elegant-calendar"
          shouldCloseOnSelect={false}
          disabledKeyboardNavigation={false}
          highlightDates={displayStart && displayEnd ? [] : undefined}
        />

        {/* Instructions and Actions */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          {displayStart && displayEnd ? (
            <div className="text-xs text-green-600 mb-3 text-center font-medium">
              ✓ Range selected: {format(displayStart, 'MMM dd')} - {format(displayEnd, 'MMM dd')}
            </div>
          ) : displayStart && !displayEnd ? (
            <div className="text-xs text-blue-600 mb-3 text-center">
              📅 Click another date to complete the range
            </div>
          ) : (
            <div className="text-xs text-gray-500 mb-3 text-center">
              💡 Double-click for single date • Click two dates for range
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleClear}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear
            </button>

            <button
              onClick={handleConfirm}
              disabled={!displayStart}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                displayStart
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Date Display Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center justify-between w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      >
        <div className="flex items-center gap-2">
          {/* Calendar Icon */}
          <svg
            className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>

          {/* Date Text */}
          <span className={`${(currentDate || displayStart || displayEnd) ? 'text-gray-900 font-medium' : 'text-gray-400'} transition-colors`}>
            {formatDisplayDate()}
          </span>
        </div>

        {/* Clear and Dropdown Icons */}
        <div className="flex items-center gap-1">
          {(currentDate || displayStart || displayEnd) && (
            <div
              onClick={handleClear}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Clear date"
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}

          <svg
            className={`w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-all duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Calendar */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fadeIn">
          <ReactDatePicker
            selected={null}
            onChange={handleDateClick}
            startDate={displayStart}
            endDate={displayEnd}
            minDate={minDate}
            maxDate={maxDate}
            inline
            calendarClassName="elegant-calendar"
            shouldCloseOnSelect={false}
            disabledKeyboardNavigation={false}
            highlightDates={displayStart && displayEnd ? [] : undefined}
          />

          {/* Instructions and Actions */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            {displayStart && displayEnd ? (
              <div className="text-xs text-green-600 mb-3 text-center font-medium">
                ✓ Range selected: {format(displayStart, 'MMM dd')} - {format(displayEnd, 'MMM dd')}
              </div>
            ) : displayStart && !displayEnd ? (
              <div className="text-xs text-blue-600 mb-3 text-center">
                📅 Click another date to complete the range
              </div>
            ) : (
              <div className="text-xs text-gray-500 mb-3 text-center">
                💡 Double-click for single date • Click two dates for range
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleClear}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Clear
              </button>

              <button
                onClick={handleConfirm}
                disabled={!displayStart}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  displayStart
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style>{`
        .elegant-calendar {
          font-family: inherit;
          border: none !important;
        }

        .react-datepicker {
          border: none !important;
          box-shadow: none !important;
        }

        .react-datepicker__header {
          background-color: white !important;
          border-bottom: 1px solid #e5e7eb !important;
          padding-top: 1rem !important;
        }

        .react-datepicker__current-month {
          color: #111827 !important;
          font-weight: 600 !important;
          font-size: 0.95rem !important;
          margin-bottom: 0.75rem !important;
        }

        .react-datepicker__day-name {
          color: #6b7280 !important;
          font-weight: 500 !important;
          font-size: 0.8rem !important;
          width: 2.5rem !important;
          line-height: 2.5rem !important;
        }

        .react-datepicker__day {
          color: #374151 !important;
          width: 2.5rem !important;
          line-height: 2.5rem !important;
          font-size: 0.875rem !important;
          border-radius: 0.5rem !important;
          margin: 0.15rem !important;
          transition: all 0.15s ease !important;
        }

        .react-datepicker__day:hover {
          background-color: #dbeafe !important;
          color: #1e40af !important;
        }

        .react-datepicker__day--selected,
        .react-datepicker__day--in-range,
        .react-datepicker__day--range-start,
        .react-datepicker__day--range-end {
          background-color: #3b82f6 !important;
          color: white !important;
          font-weight: 600 !important;
        }

        .react-datepicker__day--in-selecting-range:not(.react-datepicker__day--in-range) {
          background-color: #dbeafe !important;
          color: #1e40af !important;
        }

        .react-datepicker__day--keyboard-selected {
          background-color: #dbeafe !important;
          color: #1e40af !important;
        }

        .react-datepicker__day--today {
          font-weight: 600 !important;
          color: #3b82f6 !important;
          position: relative !important;
        }

        .react-datepicker__day--today::after {
          content: '' !important;
          position: absolute !important;
          bottom: 0.2rem !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: 0.25rem !important;
          height: 0.25rem !important;
          background-color: #3b82f6 !important;
          border-radius: 50% !important;
        }

        .react-datepicker__day--disabled {
          color: #d1d5db !important;
          cursor: not-allowed !important;
        }

        .react-datepicker__day--disabled:hover {
          background-color: transparent !important;
        }

        .react-datepicker__navigation {
          top: 1rem !important;
        }

        .react-datepicker__navigation--previous {
          border-right-color: #6b7280 !important;
        }

        .react-datepicker__navigation--next {
          border-left-color: #6b7280 !important;
        }

        .react-datepicker__navigation:hover *::before {
          border-color: #111827 !important;
        }

        .react-datepicker__month {
          margin: 1rem !important;
        }

        .react-datepicker__month-container {
          padding: 0 0.5rem !important;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-0.5rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default DatePicker;
