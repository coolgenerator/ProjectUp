// Helper function to get all available timezones
export const getAvailableTimeZones = (): string[] => {
    return [
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Anchorage',
        'Pacific/Honolulu',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Asia/Dubai',
        'Australia/Sydney'
    ];
};

// Helper function to get timezone offset for a specific timezone
export const getTimezoneOffset = (timezone: string): number => {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset'
    });

    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find(part => part.type === 'timeZoneName');
    if (!offsetPart) return 0;

    const offset = offsetPart.value.replace('GMT', '').replace('UTC', '');
    return parseInt(offset); // Keep as minutes
};

// Helper function to get user's default timezone
export const getUserDefaultTimezone = (): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// Helper function to format timezone label
export const getFormattedLabel = (timezone: string): string => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'long'
    });

    const parts = formatter.formatToParts(new Date());
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || timezone;
    const offset = getTimezoneOffset(timezone); // Already in minutes
    const sign = offset >= 0 ? '+' : '';

    return `${timezone} (${timeZoneName}) (UTC${sign}${offset})`;
};

// Helper function to check if a date is within DST period
export const isDST = (date: Date, timezone: string): boolean => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
    });

    const parts = formatter.formatToParts(date);
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || '';
    return timeZoneName.includes('DT'); // Checks for PDT, EDT, etc.
};

// Helper function to get the current offset including DST
export const getCurrentOffset = (timezone: string): number => {
    return getTimezoneOffset(timezone);
};

// Export interface for timezone info
export interface TimeZoneInfo {
    value: string;  // Changed from number to string to store timezone name
    label: string;
    region: string;
}

// Generate timezone options with user's timezone first
export const timeZones: TimeZoneInfo[] = (() => {
    const userTimezone = getUserDefaultTimezone();
    const allTimezones = getAvailableTimeZones();

    // Put user's timezone first if it's in our list
    const userTimezoneIndex = allTimezones.indexOf(userTimezone);
    if (userTimezoneIndex !== -1) {
        allTimezones.splice(userTimezoneIndex, 1);
    }

    // Create the final array with user's timezone first
    const timezones = userTimezoneIndex !== -1
        ? [userTimezone, ...allTimezones]
        : allTimezones;

    return timezones.map(tz => ({
        value: tz,
        label: getFormattedLabel(tz),
        region: tz.split('/')[0]
    }));
})();