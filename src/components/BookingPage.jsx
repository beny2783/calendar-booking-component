import { useState, useMemo } from 'react';
import DatePicker from './DatePicker';
import TimeSlotSelector from './TimeSlotSelector';
import { convertToISO8601, getUserTimezone, formatISO8601ForDisplay } from '../utils/dateUtils';
import { createBooking } from '../utils/api';
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

  // Get candidate_id and client_id from URL parameters
  const urlParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      candidateId: params.get('candidate_id') ? parseInt(params.get('candidate_id'), 10) : null,
      clientId: params.get('client_id') ? parseInt(params.get('client_id'), 10) : null,
      durationMinutes: params.get('duration_minutes') ? parseInt(params.get('duration_minutes'), 10) : 30,
    };
  }, []);

  const { candidateId, clientId, durationMinutes } = urlParams;

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTime(null); // Reset time when date changes
    setError(null);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

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
          candidate_id: candidateId,
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
  };

  if (isSubmitted && bookingData) {
    const displayInfo = formatISO8601ForDisplay(bookingData.scheduled_at);
    
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="confirmation-message">
            <div className="confirmation-icon">✓</div>
            <h2>Booking Confirmed!</h2>
            <p>Your call has been scheduled for:</p>
            <div className="booking-details">
              <p><strong>Date:</strong> {displayInfo.date}</p>
              <p><strong>Time:</strong> {displayInfo.time} ({displayInfo.timezone})</p>
              <p><strong>Duration:</strong> {bookingData.duration_minutes} minutes</p>
              {bookingData.meeting_link && (
                <p><strong>Meeting Link:</strong> <a href={bookingData.meeting_link} target="_blank" rel="noopener noreferrer">{bookingData.meeting_link}</a></p>
              )}
              <p><strong>Status:</strong> <span className={`status-badge status-${bookingData.status}`}>{bookingData.status}</span></p>
              {bookingData.scheduled_at && (
                <p className="utc-info"><strong>UTC Timestamp:</strong> {bookingData.scheduled_at}</p>
              )}
            </div>
            <p className="confirmation-note">
              You will receive a confirmation email shortly.
            </p>
            <button onClick={handleReset} className="reset-button">
              Book Another Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-container">
        <div className="booking-header">
          <h1>Schedule a Call</h1>
          <p>Select a date and time that works for you</p>
          {durationMinutes !== 30 && (
            <p className="duration-info">Duration: {durationMinutes} minutes</p>
          )}
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {(!candidateId || !clientId) && (
          <div className="error-message">
            <p>Missing required parameters. Please ensure candidate_id and client_id are provided in the URL.</p>
          </div>
        )}

        <div className="booking-content">
          <div className="booking-left">
            <DatePicker 
              selectedDate={selectedDate} 
              onDateSelect={handleDateSelect} 
            />
          </div>

          <div className="booking-right">
            <TimeSlotSelector 
              selectedTime={selectedTime}
              onTimeSelect={handleTimeSelect}
              selectedDate={selectedDate}
            />

            {(selectedDate && selectedTime) && (
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
    </div>
  );
};

export default BookingPage;
