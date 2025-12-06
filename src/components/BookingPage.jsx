import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import DatePicker from './DatePicker';
import TimeSlotSelector from './TimeSlotSelector';
import { convertToISO8601, getUserTimezone, formatISO8601ForDisplay } from '../utils/dateUtils';
import { createBooking, checkScheduledCall, scheduleCall, triggerImmediateCall, unsubscribeCandidateGlobally, cancelScheduledCall } from '../utils/api';
import './BookingPage.css';

const BookingPage = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bookingData, setBookingData] = useState(null);
  const [scheduledCallInfo, setScheduledCallInfo] = useState(null);
  const [candidatePhoneNumber, setCandidatePhoneNumber] = useState(null); // Phone number from API
  const [isCheckingCall, setIsCheckingCall] = useState(false);
  const [isTriggeringCall, setIsTriggeringCall] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isImmediateCall, setIsImmediateCall] = useState(false); // Track if this is immediate call
  const [confirmedPhoneNumber, setConfirmedPhoneNumber] = useState('');
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [unsubscribeSuccess, setUnsubscribeSuccess] = useState(false);
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isScheduledCallExpanded, setIsScheduledCallExpanded] = useState(true); // Default to expanded (desktop)
  const phoneInputRef = useRef(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 480;
      setIsMobile(mobile);
      if (mobile) {
        setIsScheduledCallExpanded(false); // Collapse on mobile
      } else {
        setIsScheduledCallExpanded(true); // Expand on desktop
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get candidate_id from URL path parameter
  const { candidate_id: candidateIdFromPath } = useParams();
  
  // Get parameters from URL (path param takes precedence over query param)
  const urlParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      candidateId: candidateIdFromPath || params.get('candidate_id'), // Read from path first, fallback to query
      clientId: params.get('client_id') ? parseInt(params.get('client_id'), 10) : null,
      durationMinutes: params.get('duration_minutes') ? parseInt(params.get('duration_minutes'), 10) : 5,
    };
  }, [candidateIdFromPath]);

  const { candidateId, clientId, durationMinutes } = urlParams;

  // Helper function to validate UK phone numbers
  const isValidUKPhone = (phone) => {
    // Remove spaces and ensure it starts with +44
    const cleaned = phone.replace(/\s/g, '');
    if (!cleaned.startsWith('+44')) return false;
    
    // Remove +44 to get the national number
    const nationalNumber = cleaned.substring(3);
    
    // UK phone number patterns:
    // Mobile: 7xxxxxxxxx (10 digits after +44)
    // Landline: 2xxxxxxxxx or 1xxxxxxxxx (10-11 digits after +44)
    // Must be 10-11 digits after +44
    if (nationalNumber.length < 10 || nationalNumber.length > 11) return false;
    
    // Must start with valid UK prefixes
    const validPrefixes = [
      '7', // Mobile
      '20', '23', '24', '28', '29', // London, Cardiff, etc.
      '113', '114', '115', '116', '117', '118', '119', // Leeds, etc.
      '121', '131', '141', '151', '161', '171', '181', '191', // Major cities
      '1' // Other landlines
    ];
    
    return validPrefixes.some(prefix => nationalNumber.startsWith(prefix));
  };

  const loadScheduledCall = useCallback(async () => {
    if (!candidateId) return;
    
    setIsCheckingCall(true);
    try {
      const data = await checkScheduledCall(candidateId);
      console.log('Scheduled call data:', data); // Debug: check what API returns
      
      // Extract phone number from response (NEW: candidate_phone_number field)
      if (data?.candidate_phone_number) {
        let phone = data.candidate_phone_number;
        // If it's a UK number without +44, add it
        if (phone.startsWith('44') && !phone.startsWith('+44')) {
          phone = '+' + phone;
        } else if (phone.startsWith('0')) {
          // If it starts with 0, replace with +44
          phone = '+44' + phone.substring(1);
        }
        setCandidatePhoneNumber(phone);
        // Store without +44 prefix for input display (will be added on blur/submit)
        setConfirmedPhoneNumber(phone.replace(/^\+44/, ''));
      } else {
        setCandidatePhoneNumber(null);
        setConfirmedPhoneNumber(''); // Reset to empty, will show +44 prefix
      }
      
      // Extract scheduled call info
      // Only set scheduledCallInfo if has_scheduled_call is explicitly true AND next_scheduled_call exists
      // Also check that status is not CANCELED and call is in the future
      if (data && data.has_scheduled_call === true && data.next_scheduled_call) {
        const callStatus = data.next_scheduled_call.status?.toUpperCase();
        const scheduledTime = data.next_scheduled_call.scheduled ? new Date(data.next_scheduled_call.scheduled) : null;
        const isFuture = data.is_future;
        
        // Don't show canceled calls or past calls
        if (callStatus !== 'CANCELED' && callStatus !== 'CANCELLED' && isFuture && scheduledTime && scheduledTime > new Date()) {
          setScheduledCallInfo({
            scheduledTime: scheduledTime,
            isFuture: isFuture,
            status: data.next_scheduled_call.status,
          });
        } else {
          // Explicitly clear if call is canceled or in the past
          if (callStatus === 'CANCELED' || callStatus === 'CANCELLED') {
            console.log('Call is canceled, clearing scheduledCallInfo');
          } else if (!isFuture || (scheduledTime && scheduledTime <= new Date())) {
            console.log('Call is in the past, clearing scheduledCallInfo');
          }
          setScheduledCallInfo(null);
        }
      } else {
        // Explicitly clear if no call exists
        setScheduledCallInfo(null);
      }
    } catch (err) {
      console.error('Error checking scheduled call:', err);
      // Clear scheduled call info on error to avoid stale data
      setScheduledCallInfo(null);
    } finally {
      setIsCheckingCall(false);
    }
  }, [candidateId]);

  // Load existing scheduled call on mount (if we have candidate_id)
  useEffect(() => {
    if (candidateId) {
      loadScheduledCall();
    }
  }, [candidateId, loadScheduledCall]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTime(null); // Reset time when date changes
    setError(null);
    setShowConfirmationModal(false); // Close modal if open
    
    // On mobile, scroll to time selection after a short delay
    if (window.innerWidth <= 480) {
      setTimeout(() => {
        const timeSection = document.querySelector('.time-slot-section');
        if (timeSection) {
          timeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setError(null);
    // Don't auto-open modal - let user click "Next" button instead
  };

  const handleScheduleCall = async (phoneNumberToUse = null) => {
    const phoneNumber = phoneNumberToUse || confirmedPhoneNumber;
    
    if (!candidateId) {
      setError('Missing required parameter: candidate_id must be provided');
      return;
    }

    if (!phoneNumber || phoneNumber.trim() === '') {
      setError('Please enter a valid phone number');
      return;
    }

    if (!selectedDate || !selectedTime) {
      setError('Please select both a date and time');
      return;
    }

    // Parse time string (format: "H:MM AM/PM" or "HH:MM AM/PM")
    const timeMatch = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) {
      setError('Invalid time format');
      return;
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

    // Combine date and time - treat as UK timezone and convert to UTC
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    
    // Create a date string in UK timezone format
    const ukDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    
    // Convert UK local time to UTC
    // We'll use a method that creates a date assuming UK timezone
    // Create a date object representing the UK time, then get its UTC equivalent
    const ukTimeMs = Date.UTC(year, month, day, hours, minutes, 0);
    // Get what this UTC time displays as in UK
    const testDate = new Date(ukTimeMs);
    const ukDisplay = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(testDate);
    
    const displayedUKHour = parseInt(ukDisplay.find(p => p.type === 'hour').value);
    const displayedUKMinute = parseInt(ukDisplay.find(p => p.type === 'minute').value);
    
    // Calculate offset
    const hourOffset = hours - displayedUKHour;
    const minuteOffset = minutes - displayedUKMinute;
    const totalOffsetMs = (hourOffset * 60 + minuteOffset) * 60000;
    
    // Adjust to get correct UTC time
    const selectedDateTime = new Date(ukTimeMs - totalOffsetMs);

    // Validate the selected time is in the future
    // Compare in UK timezone context
    const now = new Date();
    const nowUKStr = now.toLocaleString('en-GB', { timeZone: 'Europe/London', hour12: false });
    const selectedUKStr = selectedDateTime.toLocaleString('en-GB', { timeZone: 'Europe/London', hour12: false });
    
    if (selectedDateTime <= now) {
      setError('Cannot schedule a call in the past');
      return;
    }

    // Check if candidate already has a scheduled call
    if (scheduledCallInfo?.isFuture) {
      const existingCallDate = scheduledCallInfo.scheduledTime.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const existingCallTime = scheduledCallInfo.scheduledTime.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const confirm = window.confirm(
        `You already have a call scheduled for ${existingCallDate} at ${existingCallTime}.\n\n` +
        `Scheduling a new call will replace your existing scheduled call. Do you want to continue?`
      );
      if (!confirm) return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert to UTC ISO string (required by API)
      const scheduledDatetime = selectedDateTime.toISOString();

      const result = await scheduleCall({
        candidate_id: candidateId,
        candidate_phone_number: phoneNumber,
        scheduled_datetime: scheduledDatetime,
      });

      // Success!
      setBookingData({
        ...result,
        scheduled_at: scheduledDatetime,
        status: 'SCHEDULED',
      });
      setIsSubmitted(true);

      // Refresh scheduled call info
      await loadScheduledCall();
      
      // Close modal on success
      setShowConfirmationModal(false);
    } catch (err) {
      console.error('Error scheduling call:', err);
      setError(err.message || 'Failed to schedule call. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSchedule = async () => {
    // Validate phone number
    // confirmedPhoneNumber may or may not have +44 prefix
    let digits = confirmedPhoneNumber.replace(/^\+44/, '').replace(/\s/g, '').trim();
    
    if (!digits || digits.length === 0) {
      setError('Please enter a valid UK phone number');
      return;
    }
    
    // Remove any leading 0
    digits = digits.replace(/^0+/, '');
    
    // Construct full number with +44
    const phoneNumber = '+44' + digits;
    
    if (!isValidUKPhone(phoneNumber)) {
      setError('Please enter a valid UK phone number (10-11 digits after +44)');
      return;
    }

    // Keep modal open to show loading state
    setError(null);
    setIsLoading(true);

    // Handle immediate call or scheduled call
    try {
      if (isImmediateCall) {
        await handleImmediateCallConfirm(phoneNumber);
      } else {
        await handleScheduleCall(phoneNumber);
      }
    } catch (err) {
      // Error handling is done in the individual functions
      // Reset loading state if needed
      setIsLoading(false);
    }
  };

  const handleImmediateCallConfirm = async (phoneNumber) => {
    setIsTriggeringCall(true);
    setError(null);

    try {
      const result = await triggerImmediateCall({
        candidate_id: candidateId,
        candidate_phone_number: phoneNumber,
      });

      // Success!
      setBookingData({
        ...result,
        status: 'TRIGGERED',
      });
      setIsSubmitted(true);

      // Refresh scheduled call info
      await loadScheduledCall();
      
      // Close modal on success - this will show the confirmation screen
      setShowConfirmationModal(false);
    } catch (err) {
      console.error('Error triggering immediate call:', err);
      setError(err.message || 'Failed to trigger call. Please try again.');
      // Keep modal open on error so user can see the error and try again
    } finally {
      setIsTriggeringCall(false);
      setIsImmediateCall(false);
      setIsLoading(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmationModal(false);
    setIsImmediateCall(false);
    setError(null);
  };

  const handleUnsubscribe = async () => {
    if (!candidateId) {
      setError('Missing required parameter: candidate_id must be provided');
      return;
    }

    setIsUnsubscribing(true);
    setError(null);

    try {
      await unsubscribeCandidateGlobally(candidateId);
      setUnsubscribeSuccess(true);
      setShowUnsubscribeModal(false);
    } catch (err) {
      console.error('Error unsubscribing candidate:', err);
      setError(err.message || 'Failed to unsubscribe. Please try again.');
    } finally {
      setIsUnsubscribing(false);
    }
  };

  const handleOpenUnsubscribeModal = () => {
    setShowUnsubscribeModal(true);
    setError(null);
  };

  const handleCloseUnsubscribeModal = () => {
    setShowUnsubscribeModal(false);
    setError(null);
  };

  const handleCancelScheduledCall = async () => {
    if (!candidateId) {
      setError('Missing required parameter: candidate_id must be provided');
      return;
    }

    // Confirm cancellation
    const confirm = window.confirm(
      'Are you sure you want to cancel your scheduled call? This action cannot be undone.'
    );
    if (!confirm) return;

    setIsCanceling(true);
    setError(null);

    try {
      const result = await cancelScheduledCall(candidateId);
      
      // Show success message
      if (result.canceled_count > 0) {
        // Refresh scheduled call info
        await loadScheduledCall();
        // Clear any selected date/time since call is canceled
        setSelectedDate(null);
        setSelectedTime(null);
      } else {
        setError('No scheduled calls found to cancel');
      }
    } catch (err) {
      console.error('Error canceling scheduled call:', err);
      setError(err.message || 'Failed to cancel call. Please try again.');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleImmediateCall = async () => {
    if (!candidateId) {
      setError('Missing required parameter: candidate_id must be provided');
      return;
    }

    // Get phone number from API if not already loaded
    let phoneNumberToUse = candidatePhoneNumber;
    if (!phoneNumberToUse) {
      setIsTriggeringCall(true);
      try {
        const data = await checkScheduledCall(candidateId);
        if (!data?.candidate_phone_number) {
          setError('Candidate has no phone number. Cannot make a call.');
          setIsTriggeringCall(false);
          return;
        }
        phoneNumberToUse = data.candidate_phone_number;
        setCandidatePhoneNumber(phoneNumberToUse);
        // Format phone number for display
        let phone = phoneNumberToUse;
        if (phone.startsWith('44') && !phone.startsWith('+44')) {
          phone = '+' + phone;
        } else if (phone.startsWith('0')) {
          phone = '+44' + phone.substring(1);
        }
        setConfirmedPhoneNumber(phone.replace(/^\+44/, ''));
      } catch (err) {
        console.error('Error getting candidate phone number:', err);
        setError('Failed to get candidate information. Please try again.');
        setIsTriggeringCall(false);
        return;
      } finally {
        setIsTriggeringCall(false);
      }
    } else {
      // Format existing phone number for display
      let phone = phoneNumberToUse;
      if (phone.startsWith('44') && !phone.startsWith('+44')) {
        phone = '+' + phone;
      } else if (phone.startsWith('0')) {
        phone = '+44' + phone.substring(1);
      }
      setConfirmedPhoneNumber(phone.replace(/^\+44/, ''));
    }

    // Open confirmation modal for immediate call
    setIsImmediateCall(true);
    setShowConfirmationModal(true);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Use new scheduling API if candidate_id and candidate_phone_number are provided
    if (candidateId && candidatePhoneNumber) {
      await handleScheduleCall();
    } else if (clientId) {
      // Fall back to old booking API
      await handleLegacyBooking();
    } else {
      setError('Missing required parameters');
    }
  };

  const handleLegacyBooking = async () => {
    if (!candidateId || !clientId) {
      setError('Missing required parameters: candidate_id and client_id must be provided in the URL');
      return;
    }

    if (selectedDate && selectedTime && name && email) {
      setIsLoading(true);
      try {
        // Convert selected date and time to ISO 8601 with timezone
        const scheduledAt = convertToISO8601(selectedDate, selectedTime);
        const timezone = getUserTimezone();

        // Create booking via API
        const booking = await createBooking({
          candidate_id: parseInt(candidateId, 10),
          client_id: clientId,
          scheduled_at: scheduledAt,
          duration_minutes: durationMinutes,
          timezone: timezone,
        });

        setBookingData(booking);
        setIsSubmitted(true);
      } catch (err) {
        console.error('Error creating booking:', err);
        setError(err.message || 'Failed to create booking. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleReset = () => {
    setSelectedDate(null);
    setSelectedTime(null);
    setName('');
    setEmail('');
    setBookingData(null);
    setError(null);
    setIsSubmitted(false);
    setIsImmediateCall(false);
    setShowConfirmationModal(false);
  };

  if (isSubmitted && bookingData) {
    const displayInfo = bookingData.scheduled_at 
      ? formatISO8601ForDisplay(bookingData.scheduled_at)
      : { date: 'N/A', time: 'N/A', timezone: 'UTC' };
    
    return (
      <div className="booking-page">
        <div className="booking-container">
            <div className="confirmation-message">
              <div className="confirmation-icon">✓</div>
              <h2>
                {bookingData.status === 'TRIGGERED' ? 'Call Initiated!' : 
                 candidatePhoneNumber ? 'Call Scheduled!' : 'Booking Confirmed!'}
              </h2>
              <p>
                {bookingData.status === 'TRIGGERED' 
                  ? 'Your call is being initiated now.' 
                  : 'Your call has been scheduled for:'}
              </p>
            {((bookingData.status !== 'TRIGGERED' && bookingData.scheduled_at) || bookingData.duration_minutes || bookingData.meeting_link) && (
              <div className="booking-details">
                {bookingData.status !== 'TRIGGERED' && bookingData.scheduled_at && (
                  <>
                    <p><strong>Date:</strong> {displayInfo.date}</p>
                    <p><strong>Time:</strong> {displayInfo.time} ({displayInfo.timezone})</p>
                  </>
                )}
                {bookingData.duration_minutes && (
                  <p><strong>Duration:</strong> {bookingData.duration_minutes} minutes</p>
                )}
                {bookingData.meeting_link && (
                  <p><strong>Meeting Link:</strong> <a href={bookingData.meeting_link} target="_blank" rel="noopener noreferrer">{bookingData.meeting_link}</a></p>
                )}
              </div>
            )}
            {!candidatePhoneNumber && (
              <p className="confirmation-note">
                You will receive a confirmation email shortly.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-container">
        {/* Error messages at top */}
        {error && (
          <div className="error-message-top">
            <svg className="error-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p>{error}</p>
          </div>
        )}

        {!candidateId && (
          <div className="error-message-top">
            <p>Missing required parameter: candidate_id must be provided in the URL.</p>
          </div>
        )}

        {/* Show warning if candidate has no phone number */}
        {candidateId && !isCheckingCall && candidatePhoneNumber === null && (
          <div className="error-message-top">
            <p>⚠️ Candidate has no phone number. Cannot schedule or trigger calls.</p>
          </div>
        )}

        <div className="booking-layout">
          {/* Left Panel - Event Details */}
          <div className="event-details-panel">
            <div className="event-info">
              <h1 className="event-title">Let's Find Your Best Next Role</h1>
              
              <div className="event-meta">
                <div className="meta-item">
                  <svg className="meta-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>{durationMinutes} min phone call</span>
                </div>
              </div>
              
              <div className="event-description">
                <p>
                  Schedule a brief call with Emma, our virtual recruiter. In this short chat she'll learn what you're looking for, share relevant openings, and make sure any roles we discuss align with your goals and experience.
                </p>
              </div>

              {/* Show existing scheduled call info */}
              {scheduledCallInfo && !isCheckingCall && (
                <div className={`scheduled-call-info ${!scheduledCallInfo.isFuture ? 'warning' : ''} ${isMobile ? 'collapsible' : ''}`}>
                  <div 
                    className="scheduled-call-header"
                    onClick={isMobile ? () => setIsScheduledCallExpanded(!isScheduledCallExpanded) : undefined}
                    style={isMobile ? { cursor: 'pointer' } : {}}
                  >
                    <span className="scheduled-call-label">Existing Scheduled Call</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`scheduled-call-status status-${scheduledCallInfo.status?.toLowerCase() || 'scheduled'}`}>
                        {scheduledCallInfo.status}
                      </span>
                      {isMobile && (
                        <span className={`expand-arrow ${isScheduledCallExpanded ? 'expanded' : ''}`}>▼</span>
                      )}
                    </div>
                  </div>
                  {(!isMobile || isScheduledCallExpanded) && (
                    <>
                      <div className="scheduled-call-time">
                        {scheduledCallInfo.scheduledTime?.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}, {scheduledCallInfo.scheduledTime?.toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </div>
                      {!scheduledCallInfo.isFuture && (
                        <div className="warning-text">This call is in the past</div>
                      )}
                      {scheduledCallInfo.isFuture && (
                        <button
                          onClick={handleCancelScheduledCall}
                          disabled={isCanceling}
                          className="cancel-call-button"
                        >
                          {isCanceling ? 'Canceling...' : 'Cancel Call'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Immediate call button - Alternative to scheduling */}
              {candidateId && (
                <div className="immediate-call-section">
                  {scheduledCallInfo && (
                    <div className="call-now-divider">
                      <span>or</span>
                    </div>
                  )}
                  <p className="call-now-label">Prefer to speak immediately</p>
                  <button
                    onClick={handleImmediateCall}
                    disabled={isTriggeringCall || isCheckingCall}
                    className="immediate-call-button"
                  >
                    {isTriggeringCall ? 'Calling...' : 'Call Now'}
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Unsubscribe section - moved to bottom */}
          {candidateId && (
            <div className="unsubscribe-section-bottom">
              <button
                onClick={handleOpenUnsubscribeModal}
                className="unsubscribe-button-bottom"
                disabled={isUnsubscribing}
              >
                {isUnsubscribing ? 'Unsubscribing...' : 'Unsubscribe'}
              </button>
            </div>
          )}

          {/* Right Panel - Calendar & Time Selection */}
          <div className="calendar-panel">
            <div className="calendar-panel-header sticky-header">
              <h2 className="panel-title">Select a Date & Time</h2>
            </div>

            {/* Rescheduling warning - outside flex container */}
            {scheduledCallInfo?.isFuture && selectedDate && (
              <div className="rescheduling-warning">
                <svg className="rescheduling-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-4H7V4h2v4z" fill="currentColor"/>
                </svg>
                <span>
                  You have an existing call scheduled. Selecting a new time will reschedule your call.
                </span>
              </div>
            )}

            <div className="calendar-time-container">
              <div className="calendar-section">
                <DatePicker 
                  selectedDate={selectedDate} 
                  onDateSelect={handleDateSelect} 
                />
                {!isMobile && (
                  <div className="timezone-selector">
                    <label>Time zone</label>
                    <div className="timezone-display">
                      {new Date().toLocaleTimeString('en-GB', { 
                        timeZone: 'Europe/London',
                        timeZoneName: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).split(' ').pop()} - Europe/London
                    </div>
                  </div>
                )}
                {isMobile && (
                  <div className="timezone-badge-mobile">
                    {new Date().toLocaleTimeString('en-GB', { 
                      timeZone: 'Europe/London',
                      timeZoneName: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).split(' ').pop()} - Europe/London
                  </div>
                )}
              </div>

              {selectedDate && (
                <div className="time-slot-section">
                  <TimeSlotSelector 
                    selectedTime={selectedTime}
                    onTimeSelect={handleTimeSelect}
                    selectedDate={selectedDate}
                    onNext={candidateId && !clientId ? () => setShowConfirmationModal(true) : null}
                  />
                </div>
              )}
            </div>

            {/* Legacy booking form */}
            {(selectedDate && selectedTime && clientId) && (
              <div className="booking-form-container">
                <h3 className="form-title">Your Information</h3>
                <form onSubmit={handleSubmit} className="booking-form">
                  <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Enter your name"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email"
                      disabled={isLoading}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="submit-button"
                    disabled={isLoading || !candidateId || !clientId}
                  >
                    {isLoading ? 'Scheduling...' : 'Confirm Booking'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmationModal && (isImmediateCall || (selectedDate && selectedTime)) && (
        <div className="modal-overlay" onClick={handleCancelConfirmation}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {isImmediateCall 
                  ? 'Confirm Immediate Call' 
                  : scheduledCallInfo?.isFuture 
                    ? 'Reschedule Your Call' 
                    : 'Confirm Your Call'}
              </h2>
              <button 
                className="modal-close-button"
                onClick={handleCancelConfirmation}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {/* Rescheduling notice */}
              {!isImmediateCall && scheduledCallInfo?.isFuture && (
                <div className="rescheduling-notice">
                  <svg className="rescheduling-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-4H7V4h2v4z" fill="currentColor"/>
                  </svg>
                  <div>
                    <strong>You have an existing call scheduled</strong>
                    <p>
                      Your current call on {scheduledCallInfo.scheduledTime.toLocaleDateString('en-GB', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })} at {scheduledCallInfo.scheduledTime.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} will be replaced with the new time below.
                    </p>
                  </div>
                </div>
              )}

              {!isImmediateCall && selectedDate && selectedTime && (
                <div className="confirmation-details">
                  <h3>New Call Details</h3>
                  <div className="detail-row">
                    <strong>Date:</strong> {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="detail-row">
                    <strong>Time:</strong> {selectedTime}
                  </div>
                </div>
              )}

              {isImmediateCall && (
                <div className="confirmation-details">
                  <h3>Call Details</h3>
                  <div className="detail-row">
                    <strong>Type:</strong> Immediate Call
                  </div>
                  <div className="detail-row">
                    <strong>Status:</strong> Call will be initiated immediately after confirmation
                  </div>
                </div>
              )}

              <div className="phone-number-section">
                <label htmlFor="confirm-phone">Phone Number</label>
                {!candidatePhoneNumber && (
                  <div className="warning-message" style={{ marginBottom: '12px', padding: '12px', background: '#fff3e0', border: '1px solid #ff9800', borderRadius: '8px' }}>
                    <p style={{ margin: 0, color: '#f57c00', fontSize: '14px' }}>
                      ⚠️ No phone number found for this candidate. Please enter a phone number.
                    </p>
                  </div>
                )}
                
                <div className="phone-input-wrapper">
                  <div className="phone-prefix">
                    <span className="uk-flag">🇬🇧</span>
                    <span className="country-code">+44</span>
                  </div>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    id="confirm-phone"
                    value={confirmedPhoneNumber.replace(/^\+44/, '').replace(/\s/g, '')}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/[^\d]/g, '');
                      // Limit to 10-11 digits (UK mobile/landline)
                      if (value.length <= 11) {
                        setConfirmedPhoneNumber(value);
                      }
                    }}
                    onFocus={() => {
                      // Auto-scroll input into view on mobile
                      if (isMobile && phoneInputRef.current) {
                        setTimeout(() => {
                          phoneInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                      }
                    }}
                    onBlur={(e) => {
                      // Format on blur: ensure it's stored with +44 prefix
                      const digits = e.target.value.replace(/\s/g, '');
                      if (digits) {
                        setConfirmedPhoneNumber('+44' + digits);
                      }
                    }}
                    placeholder="7700123456"
                    className="phone-input"
                    disabled={isLoading}
                    required
                    maxLength={11} // 11 digits max
                  />
                </div>
                
                {confirmedPhoneNumber && confirmedPhoneNumber.replace(/^\+44/, '').replace(/\s/g, '').length > 0 && (
                  <div className="phone-validation">
                    {(() => {
                      const digits = confirmedPhoneNumber.replace(/^\+44/, '').replace(/\s/g, '');
                      const fullNumber = '+44' + digits;
                      return isValidUKPhone(fullNumber) ? (
                        <span className="validation-success">✓ Valid UK number</span>
                      ) : (
                        <span className="validation-error">Please enter a valid UK phone number</span>
                      );
                    })()}
                  </div>
                )}
                
                <p className="phone-hint">
                  {candidatePhoneNumber 
                    ? 'Please confirm or update your phone number. UK numbers only.'
                    : 'Please enter your UK phone number (mobile or landline)'}
                </p>
              </div>

              {error && (
                <div className="error-message">
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={handleCancelConfirmation}
                className="modal-cancel-button"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSchedule}
                className="modal-confirm-button"
                disabled={(() => {
                  if (isLoading || isTriggeringCall) return true;
                  const digits = confirmedPhoneNumber.replace(/^\+44/, '').replace(/\s/g, '').trim();
                  if (!digits || digits.length === 0) return true;
                  return !isValidUKPhone('+44' + digits);
                })()}
              >
                {isLoading 
                  ? (scheduledCallInfo?.isFuture ? 'Rescheduling...' : 'Scheduling...') 
                  : isTriggeringCall 
                    ? 'Calling...' 
                    : isImmediateCall 
                      ? 'Confirm & Call Now' 
                      : scheduledCallInfo?.isFuture 
                        ? 'Reschedule Call' 
                        : 'Confirm & Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsubscribe Confirmation Modal */}
      {showUnsubscribeModal && (
        <div className="modal-overlay" onClick={handleCloseUnsubscribeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Unsubscribe from All Campaigns</h2>
              <button 
                className="modal-close-button"
                onClick={handleCloseUnsubscribeModal}
                aria-label="Close"
                disabled={isUnsubscribing}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="unsubscribe-warning">
                <svg className="unsubscribe-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                </svg>
                <div>
                  <strong>This action cannot be easily undone</strong>
                  <p>
                    This will unsubscribe you from ALL campaigns and prevent you from being added to any future campaigns. 
                    You will no longer receive job opportunities from us.
                  </p>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={handleCloseUnsubscribeModal}
                className="modal-cancel-button"
                disabled={isUnsubscribing}
              >
                Cancel
              </button>
              <button
                onClick={handleUnsubscribe}
                className="modal-confirm-button unsubscribe-confirm-button"
                disabled={isUnsubscribing}
              >
                {isUnsubscribing ? 'Unsubscribing...' : 'Yes, Unsubscribe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsubscribe Success Message */}
      {unsubscribeSuccess && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Unsubscribed Successfully</h2>
            </div>
            <div className="modal-body">
              <div className="unsubscribe-success">
                <div className="success-icon">✓</div>
                <p>You have been successfully unsubscribed from all campaigns.</p>
                <p>You will no longer receive job opportunities from us.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => {
                  setUnsubscribeSuccess(false);
                  window.location.reload();
                }}
                className="modal-confirm-button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingPage;
