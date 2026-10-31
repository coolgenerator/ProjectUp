import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onChange: (startDate: string | undefined, endDate: string | undefined) => void;
  label?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  label = 'Due Date'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    // Initialize to the month of existing date, or current month
    if (startDate) return new Date(startDate);
    if (endDate) return new Date(endDate);
    return new Date();
  });
  const [selectingRange, setSelectingRange] = useState(false);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(
    startDate ? new Date(startDate) : null
  );
  const [tempEndDate, setTempEndDate] = useState<Date | null>(
    endDate ? new Date(endDate) : null
  );

  useEffect(() => {
    setTempStartDate(startDate ? new Date(startDate) : null);
    setTempEndDate(endDate ? new Date(endDate) : null);

    // Update currentMonth to show the month of the selected date
    if (startDate) {
      setCurrentMonth(new Date(startDate));
    } else if (endDate) {
      setCurrentMonth(new Date(endDate));
    }
  }, [startDate, endDate]);

  // When opening the calendar, navigate to the appropriate month
  useEffect(() => {
    if (isOpen) {
      if (tempStartDate) {
        setCurrentMonth(new Date(tempStartDate));
      } else if (tempEndDate) {
        setCurrentMonth(new Date(tempEndDate));
      } else {
        // No existing date, show current month
        setCurrentMonth(new Date());
      }
    }
  }, [isOpen, tempStartDate, tempEndDate]);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isInRange = (date: Date, start: Date | null, end: Date | null): boolean => {
    if (!start || !end) return false;
    const actualStart = start <= end ? start : end;
    const actualEnd = start <= end ? end : start;
    return date >= actualStart && date <= actualEnd;
  };

  const handleDateClick = (date: Date) => {
    if (!selectingRange && !tempStartDate) {
      // First click - could be single date or start of range
      setTempStartDate(date);
      setTempEndDate(null);
    } else if (selectingRange && tempStartDate && !tempEndDate) {
      // Second click in range mode - set end date
      const newEndDate = date;
      const actualStart = tempStartDate <= newEndDate ? tempStartDate : newEndDate;
      const actualEnd = tempStartDate <= newEndDate ? newEndDate : tempStartDate;

      setTempStartDate(actualStart);
      setTempEndDate(actualEnd);
      onChange(formatDate(actualStart), formatDate(actualEnd));
      setIsOpen(false);
      setSelectingRange(false);
    } else {
      // Reset and start new selection
      setTempStartDate(date);
      setTempEndDate(null);
      setSelectingRange(false);
    }
  };

  const handleDateMouseDown = (date: Date) => {
    setTempStartDate(date);
    setTempEndDate(null);
    setSelectingRange(true);
  };

  const handleDateMouseEnter = (date: Date) => {
    if (selectingRange && tempStartDate) {
      setHoverDate(date);
    }
  };

  const handleDateMouseUp = (date: Date) => {
    if (selectingRange && tempStartDate) {
      const actualStart = tempStartDate <= date ? tempStartDate : date;
      const actualEnd = tempStartDate <= date ? date : tempStartDate;

      if (isSameDay(actualStart, actualEnd)) {
        // Single day selection
        onChange(formatDate(actualStart), undefined);
        setTempEndDate(null);
      } else {
        // Range selection
        onChange(formatDate(actualStart), formatDate(actualEnd));
        setTempEndDate(actualEnd);
      }

      setIsOpen(false);
      setSelectingRange(false);
      setHoverDate(null);
    }
  };

  const handleClear = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    onChange(undefined, undefined);
    setIsOpen(false);
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Date[] = [];

    // Add previous month's days
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push(prevDate);
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Add next month's days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const displayValue = (() => {
    if (tempStartDate && tempEndDate && !isSameDay(tempStartDate, tempEndDate)) {
      return `${tempStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${tempEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (tempStartDate) {
      return tempStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return 'Select date or range';
  })();

  return (
    <div className="relative">
      <label className="block text-sm font-bold text-slate-700 mb-2">
        {label} <span className="text-xs font-normal text-slate-500">(Click or swipe)</span>
      </label>

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-purple-300 transition-all shadow-sm bg-white flex items-center justify-between"
      >
        <span className={tempStartDate ? 'text-slate-900' : 'text-slate-400'}>
          {displayValue}
        </span>
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white rounded-xl shadow-2xl border-2 border-slate-200 p-4 w-80">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              type="button"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <span className="font-bold text-slate-900">{monthName}</span>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              type="button"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 select-none">
            {days.map((date, index) => {
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              const isToday = isSameDay(date, new Date());
              const isStart = tempStartDate && isSameDay(date, tempStartDate);
              const isEnd = tempEndDate && isSameDay(date, tempEndDate);
              const isInSelectedRange = tempStartDate && tempEndDate && isInRange(date, tempStartDate, tempEndDate);
              const isInHoverRange = selectingRange && tempStartDate && hoverDate && isInRange(date, tempStartDate, hoverDate);

              return (
                <button
                  key={index}
                  type="button"
                  onMouseDown={() => handleDateMouseDown(date)}
                  onMouseEnter={() => handleDateMouseEnter(date)}
                  onMouseUp={() => handleDateMouseUp(date)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!selectingRange) {
                      handleDateClick(date);
                    }
                  }}
                  className={`
                    py-2 text-sm rounded-lg transition-all
                    ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-900'}
                    ${isToday && !isStart && !isEnd ? 'bg-blue-50 border border-blue-300' : ''}
                    ${isStart || isEnd ? 'bg-purple-600 text-white font-bold' : ''}
                    ${isInSelectedRange && !isStart && !isEnd ? 'bg-purple-100' : ''}
                    ${isInHoverRange && !isStart && !isEnd ? 'bg-purple-50' : ''}
                    ${isCurrentMonth && !isStart && !isEnd && !isInSelectedRange && !isInHoverRange ? 'hover:bg-slate-100' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 px-3 py-2 text-sm border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                if (tempStartDate && !tempEndDate) {
                  onChange(formatDate(tempStartDate), undefined);
                }
                setIsOpen(false);
                setSelectingRange(false);
              }}
              className="flex-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Done
            </button>
          </div>

          {/* Hint */}
          <div className="mt-3 text-xs text-slate-500 text-center">
            Click for single date • Click & drag for range
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
