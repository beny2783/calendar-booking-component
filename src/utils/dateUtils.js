/**
 * Converts a date and time string to ISO 8601 string in UTC, treating input as UK time
 * @param {Date} date - The selected date
 * @param {string} timeString - Time string in format "H:MM AM/PM" (e.g., "9:00 AM", "2:30 PM")
 * @returns {string} ISO 8601 string in UTC (e.g., "2024-01-15T14:30:00Z")
 */
export const convertToISO8601 = (date, timeString) => {
  // Parse the time string (e.g., "9:00 AM" or "2:30 PM")
  const timeMatch = timeString.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!timeMatch) {
    throw new Error('Invalid time format');
  }

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[3].toUpperCase();

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  // Create date components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(hours).padStart(2, '0');
  const minute = String(minutes).padStart(2, '0');
  
  // Create a date string in ISO format (treating it as UK local time)
  const ukDateTimeString = `${year}-${month}-${day}T${hour}:${minute}:00`;
  
  // Convert UK local time to UTC
  // We'll create a date object and use timezone conversion
  // Method: Create date as if it's in UK, then get UTC equivalent
  const ukDateParts = {
    year,
    month: parseInt(month) - 1,
    day: parseInt(day),
    hour,
    minute
  };
  
  // Use a reference UTC date to calculate offset
  const referenceUTC = new Date(Date.UTC(ukDateParts.year, ukDateParts.month, ukDateParts.day, ukDateParts.hour, ukDateParts.minute));
  
  // Get what this UTC time would display as in UK timezone
  const ukDisplay = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(referenceUTC);
  
  // Calculate the difference and adjust
  const ukHour = parseInt(ukDisplay.find(p => p.type === 'hour').value);
  const ukMinute = parseInt(ukDisplay.find(p => p.type === 'minute').value);
  const targetHour = parseInt(hour);
  const targetMinute = parseInt(minute);
  
  // Calculate offset in hours
  const hourDiff = targetHour - ukHour;
  const minuteDiff = targetMinute - ukMinute;
  const totalDiffMinutes = hourDiff * 60 + minuteDiff;
  
  // Adjust the UTC date
  const adjustedUTC = new Date(referenceUTC.getTime() + totalDiffMinutes * 60000);
  
  return adjustedUTC.toISOString();
};

/**
 * Parses an ISO 8601 datetime string and converts it to local timezone for display
 * @param {string} isoString - ISO 8601 string (e.g., "2024-01-15T14:30:00+00:00" or "2024-01-15T14:30:00Z")
 * @returns {Date} Date object in local timezone
 */
export const parseISO8601 = (isoString) => {
  return new Date(isoString);
};

/**
 * Formats an ISO 8601 datetime string for display in UK timezone
 * @param {string} isoString - ISO 8601 string from API
 * @returns {object} Object with formatted date and time strings
 */
export const formatISO8601ForDisplay = (isoString) => {
  const date = parseISO8601(isoString);
  const ukTimezone = 'Europe/London';
  
  return {
    date: date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: ukTimezone
    }),
    time: date.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: ukTimezone
    }),
    timezone: ukTimezone
  };
};

/**
 * Gets the UK timezone in IANA format
 * @returns {string} IANA timezone identifier (always "Europe/London")
 */
export const getUserTimezone = () => {
  return 'Europe/London';
};

/**
 * Converts a date to ISO 8601 date string (no time)
 * @param {Date} date - Date object
 * @returns {string} ISO 8601 date string (e.g., "2024-01-15")
 */
export const toISODateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
