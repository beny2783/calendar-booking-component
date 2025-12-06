import { useState } from 'react';
import './DatePicker.css';

const DatePicker = ({ selectedDate, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isPastDate = (date) => {
    if (!date) return false;
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    return dateOnly < today;
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date) => {
    if (!date) return false;
    return date.toDateString() === today.toDateString();
  };

  const handleDateClick = (date) => {
    if (date && !isPastDate(date)) {
      onDateSelect(date);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <div className="date-picker">
      <div className="date-picker-header">
        <button onClick={goToPreviousMonth} className="month-nav-button">
          ‹
        </button>
        <h3 className="month-year">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button onClick={goToNextMonth} className="month-nav-button">
          ›
        </button>
      </div>
      
      <div className="day-names">
        {dayNames.map(day => (
          <div key={day} className="day-name">{day}</div>
        ))}
      </div>
      
      <div className="calendar-grid">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="calendar-day empty"></div>;
          }
          
          const past = isPastDate(date);
          const selected = isSelected(date);
          const isTodayDate = isToday(date);
          
          return (
            <button
              key={date.toISOString()}
              className={`calendar-day ${past ? 'past' : ''} ${selected ? 'selected' : ''} ${isTodayDate ? 'today' : ''}`}
              onClick={() => handleDateClick(date)}
              disabled={past}
            >
              {date.getDate()}
              {isTodayDate && !selected && <span className="today-badge">Today</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DatePicker;

