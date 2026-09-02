import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import { getCommunities, getReservationsByDate, removeReservation, updateReservation, updateCommunityInfo, addCourt, getReservationsByMonthRange, getLoginLogs, getCommunityUsers, verifyUser, getLoginLogsByMonthRange } from '../store/api';
import UrbanizationModel from '../components/UrbanizationModel';
import MonthCalendar from '../components/MonthCalendar';
import { getLocalDateString } from '../utils/date';
import { useAlert } from '../components/AlertContext';

const AdminCommunity = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [refresh, setRefresh] = useState(0);
  const [date, setDate] = useState(getLocalDateString());
  const [unlockDate, setUnlockDate] = useState(getLocalDateString());
  const [resHighlights, setResHighlights] = useState({});
  const [unlockHighlights, setUnlockHighlights] = useState({});
  const [editingRes, setEditingRes] = useState(null); // { res, tempName }
  const [community, setCommunity] = useState(null);
  const [dailyReservations, setDailyReservations] = useState([]);
  const [dailyUnlocks, setDailyUnlocks] = useState([]);
  
  // Login Logs State
  const [loginLogs, setLoginLogs] = useState([]);
  const [logsDate, setLogsDate] = useState(getLocalDateString());
  const [logsPage, setLogsPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logsHighlights, setLogsHighlights] = useState({});
  const logsPerPage = 10;
  
  const [communityUsers, setCommunityUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Local state for explicit saving
  const [localName, setLocalName] = useState('');
  const [localAddress, setLocalAddress] = useState('');
  const [localLoginConfig, setLocalLoginConfig] = useState({ portals: 0, floors: [], doors: [], exceptions: [] });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleMonthChange = async (year, month) => {
    const start = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const nextMonthDate = new Date(year, month + 1, 1);
    const end = `${nextMonthDate.getFullYear()}-${(nextMonthDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
    
    const data = await getReservationsByMonthRange(Number(id), start, end);
    setDailyReservations(data || []);
  };

  const handleLogsMonthChange = async (year, month) => {
    if (!id) return;
    const start = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const nextMonthDate = new Date(year, month + 1, 1);
    const end = `${nextMonthDate.getFullYear()}-${(nextMonthDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
    
    const data = await getLoginLogsByMonthRange(Number(id), start, end);
    const unverifiedIds = communityUsers.filter(u => !u.isVerified).map(u => u.id);
    
    const highlights = {};
    data.forEach(log => {
      // Si el log es de un usuario que AHORA está sin verificar, mostramos punto rojo
      if (unverifiedIds.includes(log.user_id)) {
        const dateStr = log.created_at.split('T')[0];
        if (!highlights[dateStr]) highlights[dateStr] = [];
        if (!highlights[dateStr].includes('red')) highlights[dateStr].push('red');
      }
    });
    setLogsHighlights(highlights);
  };

  // Llama a handleLogsMonthChange al cargar los usuarios inicialmente para pintar el mes actual
  useEffect(() => {
    if (communityUsers.length > 0) {
      const d = new Date(logsDate || getLocalDateString());
      handleLogsMonthChange(d.getFullYear(), d.getMonth());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityUsers, refresh]);

  const handleResMonthChange = async (year, month) => {
    const start = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const end = `${year}-${(month + 1).toString().padStart(2, '0')}-31`;
    const data = await getReservationsByMonthRange(start, end);
    const commData = data.filter(r => r.communityId === community?.id);
    
    const hl = {};
    const todayStr = getLocalDateString();
    commData.forEach(r => {
      if (r.userId !== 'SYSTEM_UNLOCKED' && r.date >= todayStr) {
        if (!hl[r.date]) hl[r.date] = [];
        if (!hl[r.date].includes('green')) hl[r.date].push('green');
      }
    });
    setResHighlights(hl);
  };

  const handleUnlockMonthChange = async (year, month) => {
    const start = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const end = `${year}-${(month + 1).toString().padStart(2, '0')}-31`;
    const data = await getReservationsByMonthRange(start, end);
    const commData = data.filter(r => r.communityId === community?.id);
    
    const hl = {};
    const todayStr = getLocalDateString();
    commData.forEach(r => {
      if (r.userId === 'SYSTEM_UNLOCKED' && r.date >= todayStr) {
        if (!hl[r.date]) hl[r.date] = [];
        if (!hl[r.date].includes('red')) hl[r.date].push('red');
      }
    });
    setUnlockHighlights(hl);
  };

  const fetchCommunityData = async () => {
    setLoading(true);
    const comms = await getCommunities();
    const found = comms.find(c => c.id === Number(id));
    
    const users = await getCommunityUsers(Number(id));
    setCommunityUsers(users);

    if (found) {
      setCommunity(found);
      setLocalName(found.name);
      setLocalAddress(found.address || '');
      setLocalLoginConfig(found.loginConfig || { portals: 1, floors: ['b', '1', '2'], doors: ['a', 'b'], exceptions: [] });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCommunityData();
  }, [id, refresh]);

  useEffect(() => {
    const fetchLogs = async () => {
      const result = await getLoginLogs(Number(id), logsDate, logsPage, logsPerPage);
      setLoginLogs(result.data);
      setTotalLogs(result.count);
    };
    fetchLogs();
  }, [id, logsDate, logsPage, refresh]);

  useEffect(() => {
    if (!community) return;
    const fetchReservations = async () => {
      const data = await getReservationsByDate(date);
      setDailyReservations(data.filter(r => r.communityId === community.id && r.userId !== 'SYSTEM_UNLOCKED'));
    };
    fetchReservations();
  }, [date, community, refresh]);

  useEffect(() => {
    if (!community) return;
    const fetchUnlocks = async () => {
      const data = await getReservationsByDate(unlockDate);
      setDailyUnlocks(data.filter(r => r.communityId === community.id && r.userId === 'SYSTEM_UNLOCKED'));
    };
    fetchUnlocks();
  }, [unlockDate, community, refresh]);

  if (loading) {
    return <div className="page-container"><p style={{ color: 'var(--clr-text-muted)' }}>Cargando panel...</p></div>;
  }

  if (!community) {
    return (
      <div className="page-container">
        <p>Urbanización no encontrada.</p>
        <Link to="/admin">Volver al panel</Link>
      </div>
    );
  }

  const handleSaveCommunity = async () => {
    const success = await updateCommunityInfo(community.id, localName, localAddress, localLoginConfig);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setRefresh(r => r + 1);
    } else {
      showAlert("Error al guardar cambios de la urbanización", "Error");
    }
  };

  const handleVerifyUser = async (userId) => {
    const success = await verifyUser(userId);
    if (success) {
      // update local state
      setCommunityUsers(prev => prev.map(u => u.id === userId ? { ...u, isVerified: true } : u));
      setRefresh(r => r + 1);
    }
  };

  const handleSaveReservation = async () => {
    if (!editingRes) return;
    const { res, tempName } = editingRes;
    const success = await updateReservation(date, res.communityId, res.courtId, res.timeSlot, tempName);
    if (success) {
      setEditingRes(null);
      setRefresh(r => r + 1);
    }
  };

  const handleDeleteReservation = async () => {
    if (!editingRes) return;
    const { res } = editingRes;
    if (window.confirm('¿Seguro que quieres eliminar esta reserva?')) {
      const success = await removeReservation(date, res.communityId, res.courtId, res.timeSlot);
      if (success) {
        setEditingRes(null);
        setRefresh(r => r + 1);
      }
    }
  };

  const handleAddCourt = async () => {
    const config = {
      schedules: [
        { start: '09:00', end: '14:00', intervalMinutes: 90 },
        { start: '17:00', end: '22:00', intervalMinutes: 90 }
      ]
    };
    const success = await addCourt(community.id, `Nueva Pista ${community.courts.length + 1}`, '#9ca3af', config);
    if (success) {
      setRefresh(r => r + 1);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => navigate('/admin')}
          style={{ background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '8px' }}
        >
          ←
        </button>
        <div>
          <h1 className="page-title">Gestión de {community.name}</h1>
          <p className="page-subtitle">Ajustes generales y listado de pistas</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Ajustes Superiores */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Ajustes Generales</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <Input 
              label="Nombre de la Urbanización"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
            />
            <Input 
              label="Dirección"
              value={localAddress}
              onChange={(e) => setLocalAddress(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button onClick={handleSaveCommunity} style={{ backgroundColor: 'var(--clr-green)' }}>Guardar Cambios</Button>
            {saveSuccess && <span style={{ color: 'var(--clr-green)', fontSize: '0.9rem', fontWeight: 600 }}>¡Cambios guardados!</span>}
          </div>
        </div>

        {/* Configuración Login Vecinos */}
        <div className="card" style={{ marginBottom: '40px' }}>
          <div className="card-header" style={{ marginBottom: '24px' }}>
            <div className="card-title">Estructura de Acceso (Botonera)</div>
            <p className="card-subtitle">Configura los portales y puertas para que los vecinos accedan sin contraseña.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            <Input 
              type="number"
              label="Número de Portales"
              value={localLoginConfig.portals || 0}
              onChange={(e) => setLocalLoginConfig(p => ({ ...p, portals: Number(e.target.value) }))}
            />
            <Input 
              label="Plantas (separadas por coma)"
              placeholder="b, 1, 2, 3"
              value={localLoginConfig.floors?.join(', ') || ''}
              onChange={(e) => setLocalLoginConfig(p => ({ ...p, floors: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
            />
            <Input 
              label="Puertas (separadas por coma)"
              placeholder="a, b, c"
              value={localLoginConfig.doors?.join(', ') || ''}
              onChange={(e) => setLocalLoginConfig(p => ({ ...p, doors: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
            />
          </div>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--clr-text-muted)', marginBottom: '8px' }}>Excepciones (ej. Portal 13, Puerta 2b)</h4>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {(localLoginConfig.exceptions || []).map((exc, i) => (
                <span key={i} className="badge badge-gray" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {exc}
                  <button 
                    onClick={() => setLocalLoginConfig(p => ({ ...p, exceptions: p.exceptions.filter((_, idx) => idx !== i) }))}
                    style={{ background: 'none', border: 'none', color: 'var(--clr-red)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                  >×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Input id="new-exc" placeholder="p13_2b" style={{ maxWidth: '200px' }} />
              <Button 
                variant="secondary" 
                onClick={() => {
                  const val = document.getElementById('new-exc').value.trim().toLowerCase();
                  if (val && !localLoginConfig.exceptions?.includes(val)) {
                    setLocalLoginConfig(p => ({ ...p, exceptions: [...(p.exceptions || []), val] }));
                    document.getElementById('new-exc').value = '';
                  }
                }}
              >Añadir excepción</Button>
            </div>
          </div>
          <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button onClick={handleSaveCommunity} style={{ backgroundColor: 'var(--clr-green)' }}>Guardar Cambios</Button>
            {saveSuccess && <span style={{ color: 'var(--clr-green)', fontSize: '0.9rem', fontWeight: 600 }}>¡Cambios guardados!</span>}
          </div>
        </div>

        {/* LOGS */}
        <div className="admin-card" style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--clr-text)', margin: 0 }}>Registro de Accesos</h3>
              <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Historial de inicios de sesión en esta urbanización</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Button variant="ghost" size="sm" onClick={() => setLogsDate('')}>Ver todos</Button>
              <Button variant="secondary" size="sm" onClick={() => setRefresh(r => r + 1)}>
                ↻ Refrescar
              </Button>
            </div>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <MonthCalendar 
              value={logsDate || getLocalDateString()} 
              onChange={(d) => { setLogsDate(d); setLogsPage(1); }} 
              onMonthChange={handleLogsMonthChange} 
              highlights={logsHighlights}
            />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--clr-border)', fontSize: '0.85rem', color: 'var(--clr-text-muted)', fontWeight: 600 }}>Usuario</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--clr-border)', fontSize: '0.85rem', color: 'var(--clr-text-muted)', fontWeight: 600 }}>Fecha y Hora</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--clr-border)', fontSize: '0.85rem', color: 'var(--clr-text-muted)', fontWeight: 600 }}>Dispositivo</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--clr-border)', fontSize: '0.85rem', color: 'var(--clr-text-muted)', fontWeight: 600, textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loginLogs.map(log => {
                const userObj = communityUsers.find(u => u.id === log.userId);
                const isVerified = userObj ? userObj.isVerified : true;

                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--clr-border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: 500 }}>
                      {log.userName}
                      {isVerified ? (
                        <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--clr-green)' }}>✓ Autorizado</span>
                      ) : (
                        <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--clr-red)' }}>⚠ Pendiente</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--clr-text-muted)', fontFamily: 'monospace' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>{log.deviceInfo || 'Desconocido'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {!isVerified && (
                        <Button size="sm" onClick={() => handleVerifyUser(log.userId)}>Permitir</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {loginLogs.length === 0 && (
            <p style={{ textAlign: 'center', padding: '24px', color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
              No hay accesos registrados {logsDate ? 'en esta fecha' : 'aún'}.
            </p>
          )}
          
          {totalLogs > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--clr-border)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>
                Mostrando {(logsPage - 1) * logsPerPage + 1} - {Math.min(logsPage * logsPerPage, totalLogs)} de {totalLogs}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                  disabled={logsPage === 1}
                >
                  Anterior
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setLogsPage(p => p + 1)}
                  disabled={logsPage * logsPerPage >= totalLogs}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Visor de Reservas y Desbloqueos en Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '40px' }}>
          
          {/* Card: Reservas */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <div className="card-title">Reservas Reales</div>
            </div>
            
            <MonthCalendar 
              value={date} 
              onChange={setDate} 
              highlights={resHighlights} 
              onMonthChange={handleResMonthChange} 
            />

            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Día seleccionado: {date.split('-').reverse().join('/')}</h3>
              {dailyReservations.length === 0 ? (
                <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                  No hay reservas para esta fecha.
                </p>
              ) : (
                <div className="reservation-list">
                  {dailyReservations.map((res, i) => {
                    const court = community.courts.find(c => c.id === res.courtId);
                    return (
                      <div key={i} className="reservation-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div className="reservation-list-user">{res.userName}</div>
                          <div className="reservation-list-court">{court?.name || 'Pista Eliminada'}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div className="reservation-list-time font-mono">{res.timeSlot}</div>
                          <Button size="sm" variant="secondary" onClick={() => setEditingRes({ res, tempName: res.userName })}>Editar</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Card: Desbloqueos */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <div className="card-title">Desbloqueos Manuales</div>
            </div>
            
            <MonthCalendar 
              value={unlockDate} 
              onChange={setUnlockDate} 
              highlights={unlockHighlights} 
              onMonthChange={handleUnlockMonthChange} 
            />

            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Día seleccionado: {unlockDate.split('-').reverse().join('/')}</h3>
              {dailyUnlocks.length === 0 ? (
                <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                  No hay bloqueos anulados para esta fecha.
                </p>
              ) : (
                <div className="reservation-list">
                  {dailyUnlocks.map((res, i) => {
                    const court = community.courts.find(c => c.id === res.courtId);
                    return (
                      <div key={i} className="reservation-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.8 }}>
                        <div>
                          <div className="reservation-list-user" style={{ color: '#fbbf24' }}>{res.userName}</div>
                          <div className="reservation-list-court">{court?.name || 'Pista Eliminada'}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div className="reservation-list-time font-mono" style={{ color: 'var(--clr-text-muted)' }}>{res.timeSlot}</div>
                          <Button size="sm" variant="danger" onClick={async () => {
                            if (window.confirm('¿Volver a bloquear este horario?')) {
                              const success = await removeReservation(unlockDate, community.id, res.courtId, res.timeSlot);
                              if (success) {
                                setRefresh(r => r + 1);
                              }
                            }
                          }}>Bloquear</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pistas */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Pistas Disponibles</h2>
            <Button onClick={handleAddCourt}>+ Añadir Pista</Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {community.courts.length === 0 ? (
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <p style={{ color: 'var(--clr-text-muted)', fontStyle: 'italic' }}>No hay pistas en esta urbanización. Añade la primera.</p>
              </div>
            ) : null}

            {community.courts.map((court, idx) => (
              <div 
                key={court.id} 
                className="card" 
                style={{ padding: '0', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--clr-border)' }}
                onClick={() => navigate(`/admin/community/${community.id}/court/${court.id}`)}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ height: '220px', backgroundColor: 'var(--clr-surface-2)', position: 'relative' }}>
                  <UrbanizationModel color={court.color || '#9ca3af'} />
                </div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>{court.name}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>
                      {court.config.schedules?.length || 0} franja(s) horaria(s)
                    </span>
                    <span style={{ color: 'var(--clr-green)', fontSize: '0.85rem', fontWeight: 600 }}>Editar Horarios →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {editingRes && (
        <div className="modal-overlay" onClick={() => setEditingRes(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '24px' }}>Editar Reserva</h2>
            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>Horario: <strong style={{ color: 'var(--clr-text)' }}>{editingRes.res.timeSlot}</strong></p>
              <p style={{ fontSize: '0.9rem', color: 'var(--clr-text-muted)', marginBottom: '16px' }}>
                Pista: <strong style={{ color: 'var(--clr-text)' }}>{community.courts.find(c => c.id === editingRes.res.courtId)?.name || 'Desconocida'}</strong>
              </p>
              <Input
                label="Nombre del reservante"
                value={editingRes.tempName}
                onChange={(e) => setEditingRes({ ...editingRes, tempName: e.target.value })}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--clr-border)' }}>
              <Button onClick={handleDeleteReservation} variant="danger" size="sm">Eliminar Reserva</Button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button onClick={() => setEditingRes(null)} variant="ghost" size="sm">Cancelar</Button>
                <Button onClick={handleSaveReservation} style={{ backgroundColor: 'var(--clr-green)' }} size="sm">Guardar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCommunity;
