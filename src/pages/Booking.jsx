import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCommunities, getReservationsByDate, addReservation, removeReservation, getReservationsByMonthRange } from '../store/api';
import Button from '../components/Button';
import UrbanizationModel from '../components/UrbanizationModel';
import MonthCalendar from '../components/MonthCalendar';
import { getLocalDateString } from '../utils/date';
import { useAlert } from '../components/AlertContext';

const Booking = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert } = useAlert();

  const [date, setDate] = useState(location.state?.date || getLocalDateString());
  const [dailyReservations, setDailyReservations] = useState([]);
  const [highlights, setHighlights] = useState({});
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const handleMonthChange = async (year, month) => {
    const start = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const end = `${year}-${(month + 1).toString().padStart(2, '0')}-31`;
    const data = await getReservationsByMonthRange(start, end);
    const commData = data.filter(r => r.communityId === user.communityId);
    
    const hl = {};
    const todayStr = getLocalDateString();
    commData.forEach(r => {
      if (r.date >= todayStr) {
        if (!hl[r.date]) hl[r.date] = [];
        if (r.userId === 'SYSTEM_UNLOCKED') {
          if (!hl[r.date].includes('red')) hl[r.date].push('red');
        } else {
          if (!hl[r.date].includes('green')) hl[r.date].push('green');
        }
      }
    });
    setHighlights(hl);
  };

  // Auto-select court if provided in navigation state
  useEffect(() => {
    if (location.state?.courtId && communities.length > 0) {
      const userComm = communities.find(c => c.id === user.communityId);
      if (userComm) {
        const targetCourt = userComm.courts.find(c => c.id === location.state.courtId);
        if (targetCourt) setSelectedCourt(targetCourt);
      }
    }
  }, [location.state, communities, user.communityId]);
  
  // Modals state
  const [bookingModal, setBookingModal] = useState({ isOpen: false, courtId: null, timeSlot: null, courtName: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', confirmText: 'Confirmar', action: null });
  const [infoModal, setInfoModal] = useState({ isOpen: false, courtId: null, courtName: '', timeSlot: null, bookedByName: '', isOwner: false });

  useEffect(() => {
    // Si no está verificado, bloquear (no debería poder entrar aquí, pero por si acaso con la URL directa)
    if (user && !user.isVerified && !user.isAdmin) {
      showAlert("No puedes reservar hasta que el administrador verifique tu cuenta.", "Acceso Denegado");
      navigate('/dashboard');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const comms = await getCommunities();
      setCommunities(comms);
      const res = await getReservationsByDate(date);
      setDailyReservations(res.filter(r => r.communityId === user.communityId));
      setLoading(false);
    };
    fetchData();
  }, [date, user.communityId, refresh]);

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
    const court = courts.find(c => c.id === courtId);
    if (!court) return;

    if (!user.isAdmin) {
      const limit = court.config.maxReservationsPerDay || 0;
      if (limit > 0) {
        // Contar cuantas reservas tiene el usuario en ESTE court para la fecha seleccionada
        const userReservationsForCourt = dailyReservations.filter(
          r => r.courtId === courtId && r.userId === user.id
        );
        
        if (userReservationsForCourt.length >= limit) {
          showAlert(`Has alcanzado el límite diario de reservas en esta pista (${limit} franja${limit > 1 ? 's' : ''}).`, 'Límite alcanzado');
          return;
        }
      }
    }

    setBookingModal({ isOpen: true, courtId, timeSlot, courtName });
  };

  const handleCancelClick = (courtId, timeSlot) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancelar Reserva',
      message: '¿Estás seguro de que deseas eliminar esta reserva?',
      confirmText: 'Eliminar',
      action: async () => {
        const success = await removeReservation(date, userCommunity.id, courtId, timeSlot);
        if (success) {
          setRefresh(r => r + 1);
        } else {
          showAlert('Error al cancelar la reserva.', 'Error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setInfoModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleInfoClick = (courtId, courtName, timeSlot, bookedByName, isOwner) => {
    setInfoModal({ isOpen: true, courtId, courtName, timeSlot, bookedByName, isOwner });
  };

  const confirmBooking = async () => {
    const { courtId, timeSlot } = bookingModal;
    const success = await addReservation(date, userCommunity.id, courtId, timeSlot, user.id, user.name);
    if (success) {
      setRefresh(r => r + 1);
      setBookingModal({ isOpen: false, courtId: null, timeSlot: null, courtName: '' });
    } else {
      showAlert('Este tramo ya está reservado o ha habido un error.', 'Error de reserva');
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
          const isForceUnlocked = dailyReservations.some(r => r.courtId === court.id && r.timeSlot === timeSlot && r.userId === 'SYSTEM_UNLOCKED');
          const myReservation = dailyReservations.find(r => r.courtId === court.id && r.timeSlot === timeSlot && r.userId === user.id && r.userId !== 'SYSTEM_UNLOCKED');
          const otherReservation = !myReservation && dailyReservations.find(r => r.courtId === court.id && r.timeSlot === timeSlot && r.userId !== 'SYSTEM_UNLOCKED');
          
          const isBookedByMe = !!myReservation;
          const isBookedByOther = !!otherReservation;
          const bookedByName = otherReservation ? otherReservation.userName : null;
          
          let isLockedByTime = false;
          let lockReason = null;
          
          const [y, m, d] = date.split('-').map(Number);
          const slotDate = new Date(y, m - 1, d, Math.floor(current / 60), current % 60);
          
          // 1. Check if in the past
          if (slotDate.getTime() < Date.now()) {
            isLockedByTime = true;
            lockReason = 'Pasado';
          } 
          // 2. Check advance booking limit
          else if (court.config?.advanceBookingLimit !== undefined && court.config.advanceBookingLimit !== null && !isForceUnlocked) {
            const limitHours = court.config.advanceBookingLimit;
            
            const todayMidnight = new Date();
            todayMidnight.setHours(0, 0, 0, 0);
            
            const slotMidnight = new Date(slotDate);
            slotMidnight.setHours(0, 0, 0, 0);
            
            const diffDays = Math.round((slotMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
            
            if (limitHours === 0) {
              if (diffDays > 0) {
                isLockedByTime = true;
                lockReason = 'Sólo Mismo Día';
              }
            } else {
              const allowedDays = Math.floor(limitHours / 24);
              if (diffDays > allowedDays) {
                isLockedByTime = true;
                lockReason = `En ${allowedDays} día${allowedDays !== 1 ? 's' : ''}`;
              }
            }
          }

          blocks.push({
            timeSlot,
            startStr: format(current),
            duration: intv,
            isBookedByMe,
            isBookedByOther,
            bookedByName,
            isLockedByTime,
            isForceUnlocked,
            lockReason
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
        
        <div className="date-navigation" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <MonthCalendar 
            value={date} 
            onChange={setDate} 
            highlights={highlights} 
            onMonthChange={handleMonthChange} 
          />
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
                    <div key={i} className="timetable-grid-line" style={{ height: '60px' }}>
                    </div>
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
                      borderColor = '#fbbf24'; // Borde doradito
                      cursor = 'pointer';
                    } else if (block.isBookedByOther) {
                      bgColor = court.color || 'var(--clr-green)'; // Use court color for taken too!
                      borderColor = 'var(--clr-border)';
                      opacity = 0.6;
                      cursor = 'pointer';
                    } else if (block.isLockedByTime) {
                      bgColor = 'var(--clr-surface-2)';
                      borderColor = 'var(--clr-border)';
                      opacity = 0.6;
                      cursor = user.isAdmin ? 'pointer' : 'not-allowed';
                    } else if (block.isForceUnlocked) {
                      bgColor = `${court.color || '#4ade80'}25`; // Slightly more highlighted
                      borderColor = court.color || '#4ade80'; 
                    } else {
                      // Disponible
                      bgColor = `${court.color || '#4ade80'}15`; // 15% opacity hexa (aprox)
                      borderColor = `${court.color || '#4ade80'}40`; // 40% opacity
                    }

                    return (
                      <div 
                        key={idx}
                        className={`timetable-slot ${block.isBookedByMe ? 'is-mine' : block.isBookedByOther ? 'is-taken' : (block.isLockedByTime ? 'is-locked' : 'is-free')}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: bgColor,
                          borderColor: borderColor,
                          opacity: opacity,
                          cursor: cursor
                        }}
                        onClick={async () => {
                          if (block.isBookedByMe || block.isBookedByOther) {
                            handleInfoClick(court.id, court.name, block.timeSlot, block.bookedByName, block.isBookedByMe);
                            return;
                          }
                          
                          if (!block.isBookedByMe && !block.isBookedByOther) {
                            if (block.isLockedByTime) {
                              if (user.isAdmin) {
                                // Admin unlocking for everyone
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Desbloquear Horario',
                                  message: '¿Deseas desbloquear este horario para que los usuarios puedan reservarlo libremente?',
                                  confirmText: 'Desbloquear',
                                  action: async () => {
                                    const success = await addReservation(date, userCommunity.id, court.id, block.timeSlot, 'SYSTEM_UNLOCKED', 'Desbloqueo Manual');
                                    if (success) {
                                      setRefresh(r => r + 1);
                                    }
                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                              }
                              return;
                            }
                            
                            if (block.isForceUnlocked && user.isAdmin) {
                              // Admin re-locking it (optional, but good UX if they click it by mistake)
                              setConfirmModal({
                                isOpen: true,
                                title: 'Restaurar Bloqueo',
                                message: 'Este horario fue desbloqueado manualmente. ¿Deseas volver a aplicar la regla de tiempo y bloquearlo?',
                                confirmText: 'Bloquear',
                                action: async () => {
                                  const success = await removeReservation(date, userCommunity.id, court.id, block.timeSlot);
                                  if (success) {
                                    const freshRes = await getReservationsByDate(date);
                                    setDailyReservations(freshRes.filter(r => r.communityId === userCommunity.id));
                                  }
                                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                }
                              });
                              return;
                            }

                            handleBookClick(court.id, court.name, block.timeSlot);
                          }
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--clr-text-muted)', marginBottom: '4px' }}>
                          {block.timeSlot}
                        </div>
                        {block.isBookedByMe && <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Tu Reserva</div>}
                        {block.isBookedByOther && <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text)' }}>Reservado por {block.bookedByName || 'Usuario'}</div>}
                        {block.isLockedByTime && <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><span>🔒</span> {block.lockReason}</div>}
                        {!block.isBookedByMe && !block.isBookedByOther && !block.isLockedByTime && (
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: court.color || 'var(--clr-green)' }}>
                            Libre {block.isForceUnlocked && <span style={{fontSize: '0.7rem', color: 'var(--clr-text-muted)', fontWeight: 'normal'}}>(Desbloq.)</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Modal de Información de Reserva */}
      {infoModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Detalles de la Reserva</h2>
            <div className="modal-body">
              <div style={{ background: 'var(--clr-surface-2)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}><strong>{infoModal.courtName}</strong></p>
                <p style={{ margin: '0 0 8px 0', color: 'var(--clr-text-muted)' }}>Fecha: {formatDateLabel(new Date(date))}</p>
                <p style={{ margin: '0 0 8px 0', color: 'var(--clr-text-muted)' }}>Hora: {infoModal.timeSlot}</p>
                <p style={{ margin: 0, color: 'var(--clr-text)' }}>Reservado por: <strong>{infoModal.bookedByName || 'Usuario'}</strong></p>
              </div>
            </div>
            <div className="modal-actions" style={{ flexDirection: (infoModal.isOwner || user.isAdmin) ? 'row' : 'column' }}>
              <Button variant="secondary" onClick={() => setInfoModal({ isOpen: false, courtId: null, courtName: '', timeSlot: null, bookedByName: '', isOwner: false })}>
                Cerrar
              </Button>
              {(infoModal.isOwner || user.isAdmin) && (
                <Button onClick={() => handleCancelClick(infoModal.courtId, infoModal.timeSlot)} variant="danger">
                  Cancelar Reserva
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reserva */}
      {bookingModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Confirmar Reserva</h2>
            <div className="modal-body">
              <div style={{ background: 'var(--clr-surface-2)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}><strong>{bookingModal.courtName}</strong></p>
                <p style={{ margin: '0 0 8px 0', color: 'var(--clr-text-muted)' }}>Fecha: {formatDateLabel(new Date(date))}</p>
                <p style={{ margin: 0, color: 'var(--clr-text-muted)' }}>Hora: {bookingModal.timeSlot}</p>
              </div>
            </div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setBookingModal({ isOpen: false, courtId: null, timeSlot: null, courtName: '' })}>Cancelar</Button>
              <Button onClick={confirmBooking}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Genérico de Confirmación */}
      {confirmModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">{confirmModal.title}</h2>
            <div className="modal-body">
              <p style={{ color: 'var(--clr-text-muted)', fontSize: '1rem', marginBottom: '24px' }}>
                {confirmModal.message}
              </p>
            </div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>Cancelar</Button>
              <Button onClick={confirmModal.action}>{confirmModal.confirmText}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;
