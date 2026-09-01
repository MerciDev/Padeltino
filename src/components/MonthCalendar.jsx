import React, { useState, useEffect } from 'react';

const MonthCalendar = ({ value, onChange, highlights = {}, onMonthChange }) => {
  // value is expected to be 'YYYY-MM-DD'
  const initialDate = value ? new Date(value) : new Date();
  
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setCurrentMonth(d.getMonth());
      setCurrentYear(d.getFullYear());
    }
  }, [value]);

  useEffect(() => {
    if (onMonthChange) {
      onMonthChange(currentYear, currentMonth);
    }
  }, [currentYear, currentMonth]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  // Adjust so Monday is 0, Sunday is 6
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDayClick = (day) => {
    const mm = (currentMonth + 1).toString().padStart(2, '0');
    const dd = day.toString().padStart(2, '0');
    onChange(`${currentYear}-${mm}-${dd}`);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const renderDays = () => {
    const days = [];
    
    // Empty slots before first day
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = (currentMonth + 1).toString().padStart(2, '0');
      const dd = d.toString().padStart(2, '0');
      const dateStr = `${currentYear}-${mm}-${dd}`;
      
      const isSelected = value === dateStr;
      const isToday = todayStr === dateStr;
      const dayHighlights = highlights[dateStr] || [];
      
      days.push(
        <div 
          key={d} 
          className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => handleDayClick(d)}
        >
          <span className="calendar-day-number">{d}</span>
          {dayHighlights.length > 0 && (
            <div className="calendar-day-indicators">
              {dayHighlights.includes('green') && <span className="indicator-dot green"></span>}
              {dayHighlights.includes('red') && <span className="indicator-dot red"></span>}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="month-calendar">
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={prevMonth}>←</button>
        <div className="calendar-title">{monthNames[currentMonth]} {currentYear}</div>
        <button className="calendar-nav-btn" onClick={nextMonth}>→</button>
      </div>
      
      <div className="calendar-grid-header">
        {dayNames.map(day => <div key={day} className="calendar-day-name">{day}</div>)}
      </div>
      
      <div className="calendar-grid">
        {renderDays()}
      </div>
    </div>
  );
};

export default MonthCalendar;
