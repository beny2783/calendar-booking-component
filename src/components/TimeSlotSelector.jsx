import { useState, useMemo, useEffect } from 'react';
import './TimeSlotSelector.css';

const TimeSlotSelector = ({ selectedTime, onTimeSelect, selectedDate, onNext }) => {
  // Popular/common times to show first
  const popularTimes = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];

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
        slots.push({ timeString, hour, minute });
      }
    }
    return slots;
  };

  const allTimeSlots = generateTimeSlots();
  
  // Check if selected date is today
  const isToday = (date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  // Filter out past time slots if the selected date is today
  const getValidTimeSlots = () => {
    if (!selectedDate || !isToday(selectedDate)) {
      // For future dates, return all time slots
      return allTimeSlots;
    }

    // For today, filter out past time slots
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Round up to the next 15-minute interval
    const nextSlotMinute = Math.ceil((currentMinute + 1) / 15) * 15;
    const nextSlotHour = nextSlotMinute >= 60 ? currentHour + 1 : currentHour;
    const adjustedMinute = nextSlotMinute >= 60 ? 0 : nextSlotMinute;

    return allTimeSlots.filter(slot => {
      if (slot.hour > nextSlotHour) return true;
      if (slot.hour === nextSlotHour && slot.minute >= adjustedMinute) return true;
      return false;
    });
  };

  const validSlots = getValidTimeSlots();

  // Group slots by time period
  const groupedSlots = useMemo(() => {
    const groups = {
      popular: [],
      morning: [], // 6 AM - 12 PM
      afternoon: [], // 12 PM - 6 PM
      evening: [], // 6 PM - 12 AM
      night: [] // 12 AM - 6 AM
    };

    validSlots.forEach(slot => {
      const timeString = slot.timeString;
      // Check if it's a popular time
      if (popularTimes.includes(timeString)) {
        groups.popular.push(slot);
      } else if (slot.hour >= 6 && slot.hour < 12) {
        groups.morning.push(slot);
      } else if (slot.hour >= 12 && slot.hour < 18) {
        groups.afternoon.push(slot);
      } else if (slot.hour >= 18 && slot.hour < 24) {
        groups.evening.push(slot);
      } else {
        groups.night.push(slot);
      }
    });

    return groups;
  }, [validSlots]);

  // Check if mobile - use state to handle resize
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [expandedGroups, setExpandedGroups] = useState(isMobile ? ['popular'] : ['popular', 'morning', 'afternoon', 'evening']);

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => 
      prev.includes(groupName) 
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const handleTimeSelect = (time) => {
    // Haptic feedback on mobile (if supported)
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onTimeSelect(time);
  };

  if (!selectedDate) {
    return (
      <div className="time-slot-selector">
        <div className="time-slot-placeholder">
          <svg className="placeholder-icon" width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p className="placeholder-text">Select a date to see available times</p>
          <p className="placeholder-hint">Choose a date from the calendar above</p>
        </div>
      </div>
    );
  }

  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  // Icon components for time groups
  const TimeGroupIcon = ({ groupName }) => {
    const iconProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
    
    switch (groupName) {
      case 'popular':
        return (
          <svg {...iconProps}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        );
      case 'morning':
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        );
      case 'afternoon':
        return (
          <svg {...iconProps}>
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
            <line x1="6" y1="1" x2="6" y2="4"/>
            <line x1="10" y1="1" x2="10" y2="4"/>
            <line x1="14" y1="1" x2="14" y2="4"/>
          </svg>
        );
      case 'evening':
        return (
          <svg {...iconProps}>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        );
      case 'night':
        return (
          <svg {...iconProps}>
            <path d="M17 10c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z"/>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            <path d="M12 6a6 6 0 0 0-6 6 6 6 0 0 0 6 6 6 6 0 0 0 6-6 6 6 0 0 0-6-6z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const renderTimeSlot = (slot) => {
    const isSelected = selectedTime === slot.timeString;
    return (
      <div key={slot.timeString} className={`time-slot-wrapper ${isSelected ? 'selected' : ''}`}>
        <button
          className={`time-slot ${isSelected ? 'selected' : ''}`}
          onClick={() => handleTimeSelect(slot.timeString)}
        >
          {slot.timeString}
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
  };

  const renderGroup = (groupName, slots, label) => {
    if (slots.length === 0) return null;
    
    const isExpanded = expandedGroups.includes(groupName);
    const showGroup = !isMobile || isExpanded;

    return (
      <div key={groupName} className="time-slot-group">
        {isMobile && (
          <button 
            className="time-group-header"
            onClick={() => toggleGroup(groupName)}
          >
            <TimeGroupIcon groupName={groupName} />
            <span className="group-label">{label}</span>
            <span className="group-count">({slots.length})</span>
            <span className={`group-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
          </button>
        )}
        {!isMobile && (
          <div className="time-group-header-static">
            <TimeGroupIcon groupName={groupName} />
            <span className="group-label">{label}</span>
            <span className="group-count">({slots.length})</span>
          </div>
        )}
        {showGroup && (
          <div className="time-slots-grid">
            {slots.map(renderTimeSlot)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="time-slot-selector">
      <h3 className="time-slot-title">{formattedDate}</h3>
      <div className="time-slots-container">
        {groupedSlots.popular.length > 0 && renderGroup('popular', groupedSlots.popular, 'Popular Times')}
        {groupedSlots.morning.length > 0 && renderGroup('morning', groupedSlots.morning, 'Morning (6 AM - 12 PM)')}
        {groupedSlots.afternoon.length > 0 && renderGroup('afternoon', groupedSlots.afternoon, 'Afternoon (12 PM - 6 PM)')}
        {groupedSlots.evening.length > 0 && renderGroup('evening', groupedSlots.evening, 'Evening (6 PM - 12 AM)')}
        {groupedSlots.night.length > 0 && renderGroup('night', groupedSlots.night, 'Night (12 AM - 6 AM)')}
      </div>
    </div>
  );
};

export default TimeSlotSelector;

