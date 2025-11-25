/**
 * API utility functions following FastAPI conventions
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const AUTH_EMAIL = import.meta.env.VITE_AUTH_EMAIL || 'frontend-service@email.com';
const AUTH_PASSWORD = import.meta.env.VITE_AUTH_PASSWORD || 'password';

/**
 * Gets the authentication token from storage
 * @returns {string|null} Bearer token or null
 */
export const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

/**
 * Sets the authentication token in storage
 * @param {string} token - Bearer token
 */
export const setAuthToken = (token) => {
  localStorage.setItem('auth_token', token);
};

/**
 * Removes the authentication token from storage
 */
export const removeAuthToken = () => {
  localStorage.removeItem('auth_token');
};

/**
 * Logs in and retrieves an authentication token
 * @returns {Promise<string>} Access token
 */
export const login = async () => {
  const loginUrl = `${API_BASE_URL}/auth/login`;
  
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username: AUTH_EMAIL,  // FastAPI OAuth2 uses 'username' field
      password: AUTH_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw await handleApiError(response);
  }

  const data = await response.json();
  const token = data.access_token;
  
  if (!token) {
    throw new Error('No access token received from login');
  }

  setAuthToken(token);
  return token;
};

/**
 * Ensures the app is authenticated, logging in if necessary
 * @returns {Promise<string>} Access token
 */
export const ensureAuthenticated = async () => {
  let token = getAuthToken();
  
  // If no token exists, login
  if (!token) {
    token = await login();
  }
  
  return token;
};

/**
 * Makes an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/core/candidate-bookings')
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const apiRequest = async (endpoint, options = {}) => {
  let token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If we get a 401, try to re-authenticate and retry once
  if (response.status === 401 && token) {
    try {
      const newToken = await login();
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (loginError) {
      // Re-authentication failed, return the original 401 response
      console.error('Re-authentication failed:', loginError);
    }
  }

  return response;
};

/**
 * Handles API error responses
 * @param {Response} response - Fetch response
 * @returns {Promise<Error>} Error with message
 */
export const handleApiError = async (response) => {
  let errorMessage = 'An error occurred';
  
  try {
    const errorData = await response.json();
    if (errorData.detail) {
      errorMessage = errorData.detail;
    } else if (typeof errorData === 'string') {
      errorMessage = errorData;
    }
  } catch (e) {
    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
  }

  const error = new Error(errorMessage);
  error.status = response.status;
  return error;
};

/**
 * Creates a new booking
 * @param {object} bookingData - Booking data
 * @param {number} bookingData.candidate_id - Candidate ID
 * @param {number} bookingData.client_id - Client ID
 * @param {string} bookingData.scheduled_at - ISO 8601 datetime string
 * @param {number} bookingData.duration_minutes - Duration in minutes
 * @param {string} bookingData.timezone - IANA timezone (e.g., "America/New_York")
 * @returns {Promise<object>} Created booking object
 */
export const createBooking = async (bookingData) => {
  const response = await apiRequest('/core/candidate-bookings', {
    method: 'POST',
    body: JSON.stringify({
      candidate_id: bookingData.candidate_id,
      client_id: bookingData.client_id,
      scheduled_at: bookingData.scheduled_at,
      duration_minutes: bookingData.duration_minutes || 30,
      timezone: bookingData.timezone,
    }),
  });

  if (!response.ok) {
    throw await handleApiError(response);
  }

  return await response.json();
};

/**
 * Gets a single booking by ID
 * @param {number} bookingId - Booking ID
 * @returns {Promise<object>} Booking object
 */
export const getBooking = async (bookingId) => {
  const response = await apiRequest(`/core/candidate-bookings/${bookingId}`);

  if (!response.ok) {
    throw await handleApiError(response);
  }

  return await response.json();
};

/**
 * Lists bookings with optional filters
 * @param {object} filters - Filter parameters
 * @param {number} filters.candidate_id - Filter by candidate ID
 * @param {number} filters.client_id - Filter by client ID
 * @param {string} filters.status - Filter by status
 * @param {string} filters.scheduled_at_from - ISO 8601 datetime string
 * @param {string} filters.scheduled_at_to - ISO 8601 datetime string
 * @returns {Promise<object[]>} Array of booking objects
 */
export const listBookings = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();
  const endpoint = `/core/candidate-bookings${queryString ? `?${queryString}` : ''}`;

  const response = await apiRequest(endpoint);

  if (!response.ok) {
    throw await handleApiError(response);
  }

  return await response.json();
};

/**
 * Updates a booking
 * @param {number} bookingId - Booking ID
 * @param {object} bookingData - Updated booking data
 * @returns {Promise<object>} Updated booking object
 */
export const updateBooking = async (bookingId, bookingData) => {
  const response = await apiRequest(`/core/candidate-bookings/${bookingId}`, {
    method: 'PUT',
    body: JSON.stringify(bookingData),
  });

  if (!response.ok) {
    throw await handleApiError(response);
  }

  return await response.json();
};

/**
 * Cancels a booking (sets status to "cancelled")
 * @param {number} bookingId - Booking ID
 * @returns {Promise<object>} Updated booking object
 */
export const cancelBooking = async (bookingId) => {
  return updateBooking(bookingId, { status: 'cancelled' });
};

/**
 * Deletes a booking
 * @param {number} bookingId - Booking ID
 * @returns {Promise<void>}
 */
export const deleteBooking = async (bookingId) => {
  const response = await apiRequest(`/core/candidate-bookings/${bookingId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw await handleApiError(response);
  }
};

/**
 * Formats phone number to E.164 format
 * @param {string} phone - Phone number
 * @returns {string} E.164 formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Add + prefix if not present
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

/**
 * Checks if a candidate has any scheduled calls
 * @param {string} candidateId - Candidate UUID
 * @returns {Promise<object|null>} Scheduled call check response or null if not found
 */
export const checkScheduledCall = async (candidateId) => {
  const response = await apiRequest(`/schedule/candidates/${candidateId}/scheduled-call`);

  if (!response.ok) {
    if (response.status === 404) {
      // Candidate not found - return null instead of throwing
      return null;
    }
    throw await handleApiError(response);
  }

  return await response.json();
};

/**
 * Schedules a call for a future date/time
 * @param {object} callData - Call scheduling data
 * @param {string} callData.candidate_id - Candidate UUID (required)
 * @param {string} callData.candidate_phone_number - Candidate's phone number in E.164 format (required)
 * @param {string} callData.scheduled_datetime - ISO 8601 datetime in UTC (required)
 * @returns {Promise<object>} VAPI call response
 */
export const scheduleCall = async (callData) => {
  const requestBody = {
    candidate_id: callData.candidate_id,
    candidate_phone_number: formatPhoneNumber(callData.candidate_phone_number),
    scheduled_datetime: callData.scheduled_datetime,
  };

  const response = await apiRequest('/call-trigger/calls/scheduled', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw await handleApiError(response);
  }

  return await response.json();
};

/**
 * Triggers an immediate call
 * @param {object} callData - Call data
 * @param {string} callData.candidate_id - Candidate UUID (required)
 * @param {string} callData.candidate_phone_number - Candidate's phone number in E.164 format (required)
 * @returns {Promise<object>} VAPI call response
 */
export const triggerImmediateCall = async (callData) => {
  const requestBody = {
    candidate_id: callData.candidate_id,
    candidate_phone_number: formatPhoneNumber(callData.candidate_phone_number),
  };

  const response = await apiRequest('/call-trigger/calls/immediate', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw await handleApiError(response);
  }

  return await response.json();
};

/**
 * Unsubscribes a candidate globally from all Smartlead campaigns
 * @param {string} candidateId - Candidate UUID
 * @returns {Promise<object>} Unsubscribe response
 */
export const unsubscribeCandidateGlobally = async (candidateId) => {
  const response = await apiRequest(`/outreach/candidates/${candidateId}/unsubscribe-global`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw await handleApiError(response);
  }

  return await response.json();
};

