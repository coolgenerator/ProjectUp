import { useState } from 'react';
import { getTimezoneOffset } from '../components/projectDashboard/datasets/timeZone';

export const useAvailability = () => {
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [timeZone, setTimeZone] = useState<number>();
    const [timePeriod, setTimePeriod] = useState<{ start: string; end: string }>({
        start: "09:00",
        end: "17:00",
    });

    const handleSaveAvailability = ({
        dates,
        timeZone,
        timePeriod,
    }: {
        dates: string[];
        timeZone: number;
        timePeriod: { start: string; end: string };
    }) => {
        setAvailableDates(dates);
        setTimeZone(timeZone);
        setTimePeriod(timePeriod);
    };

    const handleTimeZoneChange = (newTimeZone: string) => {
        const timeDiff = getTimezoneOffset(newTimeZone) - (timeZone ?? 0);

        const adjustTime = (timeStr: string, diff: number): string => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            let newHours = hours + diff;

            if (newHours >= 24) {
                newHours -= 24;
            } else if (newHours < 0) {
                newHours += 24;
            }

            return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        };

        setTimePeriod(prev => ({
            start: adjustTime(prev.start, timeDiff),
            end: adjustTime(prev.end, timeDiff)
        }));

        setTimeZone(getTimezoneOffset(newTimeZone));

        const adjustedDates = availableDates.map(date => {
            const dateObj = new Date(date);
            dateObj.setHours(dateObj.getHours() + timeDiff);
            return dateObj.toISOString().split('T')[0];
        });

        setAvailableDates(adjustedDates);
    };

    return {
        availableDates,
        timeZone,
        timePeriod,
        handleSaveAvailability,
        handleTimeZoneChange
    };
}; 