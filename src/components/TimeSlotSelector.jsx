import './TimeSlotSelector.css';

const TimeSlotSelector = ({ selectedTime, onTimeSelect, selectedDate, onNext }) => {
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

  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="time-slot-selector">
      <h3 className="time-slot-title">{formattedDate}</h3>
      <div className="time-slots-grid">
        {timeSlots.map((time) => {
          const isSelected = selectedTime === time;
          return (
            <div key={time} className={`time-slot-wrapper ${isSelected ? 'selected' : ''}`}>
              <button
                className={`time-slot ${isSelected ? 'selected' : ''}`}
                onClick={() => onTimeSelect(time)}
              >
                {time}
              </button>
              {isSelected && onNext && (
                <button
                  className="time-slot-next-button"
                  onClick={onNext}
                >
                  Next
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSlotSelector;

