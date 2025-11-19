/**
 * Converts a date and time string to ISO 8601 string with timezone offset
 * @param {Date} date - The selected date (local timezone)
 * @param {string} timeString - Time string in format "H:MM AM/PM" (e.g., "9:00 AM", "2:30 PM")
 * @returns {string} ISO 8601 string with timezone offset (e.g., "2024-01-15T14:30:00-05:00")
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

  // Create a new date object with the selected date and time in local timezone
  const localDateTime = new Date(date);
  localDateTime.setHours(hours, minutes, 0, 0);

  // Get timezone offset in minutes
  const offsetMinutes = localDateTime.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const offsetSign = offsetMinutes <= 0 ? '+' : '-';
  
  // Format offset as +HH:MM or -HH:MM
  const offset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

  // Format as ISO 8601 with timezone offset
  const year = localDateTime.getFullYear();
  const month = String(localDateTime.getMonth() + 1).padStart(2, '0');
  const day = String(localDateTime.getDate()).padStart(2, '0');
  const hour = String(localDateTime.getHours()).padStart(2, '0');
  const minute = String(localDateTime.getMinutes()).padStart(2, '0');
  const second = String(localDateTime.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
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
 * Formats an ISO 8601 datetime string for display in local timezone
 * @param {string} isoString - ISO 8601 string from API
 * @returns {object} Object with formatted date and time strings
 */
export const formatISO8601ForDisplay = (isoString) => {
  const date = parseISO8601(isoString);
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  return {
    date: date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: userTimezone
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: userTimezone
    }),
    timezone: userTimezone
  };
};

/**
 * Gets the user's timezone in IANA format (e.g., "America/New_York")
 * @returns {string} IANA timezone identifier
 */
export const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
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
