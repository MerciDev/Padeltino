import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCommunities, getReservationsByDate, addReservation } from '../store/api';
import Button from '../components/Button';
import UrbanizationModel from '../components/UrbanizationModel';

const Booking = ({ user }) => {
  const navigate = useNavigate();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyReservations, setDailyReservations] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState(null);
  
  // Custom Modal State
  const [bookingModal, setBookingModal] = useState({ isOpen: false, courtId: null, timeSlot: null, courtName: '' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const comms = await getCommunities();
      setCommunities(comms);
      const res = await getReservationsByDate(date);
      setDailyReservations(res.filter(r => r.communityId === user.communityId));
      setLoading(false);
    };
    fetchData();
  }, [date, user.communityId]);

  const userCommunity = communities.find(c => c.id === user.communityId) || communities[0];
  const courts = userCommunity?.courts || [];

  if (courts.length === 0) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">🚫</div>
          <div className="empty-state-title">No hay pistas</div>
          <div className="empty-state-text">No hay pistas configuradas en tu urbanización aún.</div>
        </div>
      </div>
    );
  }

  // --- Navegación de Fechas ---
  const currentDateObj = new Date(date);
  const prevDate = new Date(currentDateObj);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(currentDateObj);
  nextDate.setDate(nextDate.getDate() + 1);

  const formatDateLabel = (d) => {
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // --- Lógica del Horario (Timetable) ---

  const TIMETABLE_START_HOUR = 8; // 08:00
  const TIMETABLE_END_HOUR = 23; // 23:00
  const HOURS_COUNT = TIMETABLE_END_HOUR - TIMETABLE_START_HOUR + 1;
  const PIXELS_PER_MINUTE = 1; // 1 min = 1px => 60px por hora.

  const parseTime = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const getSlotPositionAndHeight = (startStr, durationMin) => {
    const startMins = parseTime(startStr);
    const timetableStartMins = TIMETABLE_START_HOUR * 60;
    
    // Si empieza antes del inicio del horario, lo limitamos (aunque no debería pasar)
    const relativeStart = Math.max(0, startMins - timetableStartMins);
    
    return {
      top: relativeStart * PIXELS_PER_MINUTE,
      height: durationMin * PIXELS_PER_MINUTE
    };
  };

  const handleBookClick = (courtId, courtName, timeSlot) => {
    setBookingModal({ isOpen: true, courtId, timeSlot, courtName });
  };

  const confirmBooking = async () => {
    const { courtId, timeSlot } = bookingModal;
    const success = await addReservation(date, userCommunity.id, courtId, timeSlot, user.id, user.name);
    if (success) {
      const freshRes = await getReservationsByDate(date);
      setDailyReservations(freshRes.filter(r => r.communityId === userCommunity.id));
      setBookingModal({ isOpen: false, courtId: null, timeSlot: null, courtName: '' });
    } else {
      alert('Este tramo ya está reservado o ha habido un error.');
      setBookingModal({ isOpen: false, courtId: null, timeSlot: null, courtName: '' });
    }
  };

  const closeModal = () => {
    setBookingModal({ isOpen: false, courtId: null, timeSlot: null, courtName: '' });
  };

  if (loading) {
    return <div className="page-container"><p style={{ color: 'var(--clr-text-muted)' }}>Cargando pistas...</p></div>;
  }

  // VISTA 1: Selección de Pista
  if (!selectedCourt) {
    return (
      <div className="page-container" style={{ maxWidth: '1200px' }}>
        <div className="page-header">
          <h1 className="page-title">Selecciona una pista</h1>
          <p className="page-subtitle">{userCommunity.name}</p>
        </div>
        <div className="card-grid">
          {courts.map(court => (
            <div 
              key={court.id} 
              className="card community-card-3d" 
              onClick={() => setSelectedCourt(court)}
              style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}
            >
              <div className="community-card-3d-model" style={{ height: '240px' }}>
                <UrbanizationModel color={court.color || '#9ca3af'} />
              </div>
              <div className="card-content" style={{ padding: '24px' }}>
                <h3 className="card-title" style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{court.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--clr-text-muted)' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: court.color || '#9ca3af' }}></div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Color de pista</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Generamos los bloques renderizables por cada pista
  const courtColumns = [selectedCourt].map(court => {
    const blocks = [];
    
    if (court.config?.schedules) {
      court.config.schedules.forEach(sched => {
        if (!sched.start || !sched.end) return;
        
        let current = parseTime(sched.start);
        const limit = parseTime(sched.end);
        const intv = sched.intervalMinutes || 90;

        while (current + intv <= limit) {
          const next = current + intv;
          
          const format = (mins) => {
            const h = Math.floor(mins / 60).toString().padStart(2, '0');
            const m = (mins % 60).toString().padStart(2, '0');
            return `${h}:${m}`;
          };

          const timeSlot = `${format(current)} - ${format(next)}`;
          
          // Check states
          const isBookedByMe = dailyReservations.some(r => r.courtId === court.id && r.timeSlot === timeSlot && r.userId === user.id);
          const isBookedByOther = !isBookedByMe && dailyReservations.some(r => r.courtId === court.id && r.timeSlot === timeSlot);
          
          blocks.push({
            timeSlot,
            startStr: format(current),
            duration: intv,
            isBookedByMe,
            isBookedByOther
          });

          current = next;
        }
      });
    }

    return { court, blocks };
  });


  return (
    <div className="page-container" style={{ maxWidth: '1200px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => setSelectedCourt(null)}
            style={{ background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Volver a pistas"
          >
            ←
          </button>
          <div>
            <h1 className="page-title">{selectedCourt.name}</h1>
            <p className="page-subtitle">{userCommunity.name} - Horarios</p>
          </div>
        </div>
        
        <div className="date-navigation">
          <Button 
            variant="secondary" 
            onClick={() => setDate(prevDate.toISOString().split('T')[0])}
            className="date-nav-btn"
          >
            ← {formatDateLabel(prevDate)}
          </Button>
          
          <div className="date-current-picker">
            <label>Actual</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>

          <Button 
            variant="secondary" 
            onClick={() => setDate(nextDate.toISOString().split('T')[0])}
            className="date-nav-btn"
          >
            {formatDateLabel(nextDate)} →
          </Button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        
        <div className="timetable-wrapper">
          {/* Eje de Horas */}
          <div className="timetable-time-axis">
            <div className="timetable-header-cell"></div> {/* Espacio vacío superior */}
            <div className="timetable-axis-grid" style={{ height: `${HOURS_COUNT * 60}px` }}>
              {Array.from({ length: HOURS_COUNT }).map((_, i) => (
                <div key={i} className="timetable-axis-label" style={{ height: '60px' }}>
                  <span>{`${(TIMETABLE_START_HOUR + i).toString().padStart(2, '0')}:00`}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Columnas de Pistas */}
          <div className="timetable-columns">
            {courtColumns.map(({ court, blocks }) => (
              <div key={court.id} className="timetable-column">
                
                {/* Cabecera */}
                <div className="timetable-header-cell" style={{ borderBottom: `3px solid ${court.color || 'var(--clr-border)'}` }}>
                  <div style={{ fontWeight: 600, color: 'var(--clr-text)', fontSize: '0.95rem' }}>{court.name}</div>
                </div>

                {/* Grid (Fondo rayado horizontal para guiar la vista) */}
                <div className="timetable-grid" style={{ height: `${HOURS_COUNT * 60}px` }}>
                  {Array.from({ length: HOURS_COUNT }).map((_, i) => (
                    <div key={i} className="timetable-grid-line" style={{ height: '60px' }}></div>
                  ))}

                  {/* Bloques de Reservas */}
                  {blocks.map((block, idx) => {
                    const { top, height } = getSlotPositionAndHeight(block.startStr, block.duration);
                    
                    let bgColor = 'var(--clr-surface-2)';
                    let borderColor = 'var(--clr-border)';
                    let opacity = 1;
                    let cursor = 'pointer';

                    if (block.isBookedByMe) {
                      bgColor = court.color || 'var(--clr-green)';
                      borderColor = court.color || 'var(--clr-green)';
                    } else if (block.isBookedByOther) {
                      bgColor = court.color || 'var(--clr-green)'; // Use court color for taken too!
                      borderColor = 'var(--clr-border)';
                      opacity = 0.6;
                      cursor = 'not-allowed';
                    } else {
                      // Disponible
                      bgColor = `${court.color || '#4ade80'}15`; // 15% opacity hexa (aprox)
                      borderColor = `${court.color || '#4ade80'}40`; // 40% opacity
                    }

                    return (
                      <div 
                        key={idx}
                        className={`timetable-slot ${block.isBookedByMe ? 'is-mine' : block.isBookedByOther ? 'is-taken' : 'is-free'}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: bgColor,
                          borderColor: borderColor,
                          opacity: opacity,
                          cursor: cursor
                        }}
                        onClick={() => {
                          if (!block.isBookedByMe && !block.isBookedByOther) {
                            handleBookClick(court.id, court.name, block.timeSlot);
                          }
                        }}
                      >
                        <div className="timetable-slot-time">{block.timeSlot}</div>
                        {block.isBookedByMe && <div className="timetable-slot-status">✓ Reservado por ti</div>}
                        {block.isBookedByOther && <div className="timetable-slot-status">Ocupado</div>}
                        {!block.isBookedByMe && !block.isBookedByOther && <div className="timetable-slot-status">Disponible</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {bookingModal.isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Confirmar Reserva</h2>
            <p style={{ color: 'var(--clr-text-muted)', marginBottom: '24px' }}>
              Estás a punto de reservar <strong>{bookingModal.courtName}</strong> en el horario de <strong>{bookingModal.timeSlot}</strong>.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <Button onClick={closeModal} variant="secondary">Cancelar</Button>
              <Button onClick={confirmBooking} style={{ backgroundColor: 'var(--clr-green)' }}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;
