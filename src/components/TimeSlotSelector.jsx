import './TimeSlotSelector.css';

const TimeSlotSelector = ({ selectedTime, onTimeSelect, selectedDate }) => {
  // Generate time slots 24/7 in 15-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        const timeString = time.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  if (!selectedDate) {
    return (
      <div className="time-slot-selector">
        <p className="time-slot-placeholder">Please select a date first</p>
      </div>
    );
  }

  return (
    <div className="time-slot-selector">
      <h3 className="time-slot-title">Select a time</h3>
      <div className="time-slots-grid">
        {timeSlots.map((time) => (
          <button
            key={time}
            className={`time-slot ${selectedTime === time ? 'selected' : ''}`}
            onClick={() => onTimeSelect(time)}
          >
            {time}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimeSlotSelector;

