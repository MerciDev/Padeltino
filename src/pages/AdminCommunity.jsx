import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import { getCommunities, getReservationsByDate, removeReservation, updateReservation, updateCommunityInfo, addCourt, getReservationsByMonthRange } from '../store/api';
import UrbanizationModel from '../components/UrbanizationModel';
import MonthCalendar from '../components/MonthCalendar';
import { getLocalDateString } from '../utils/date';

const AdminCommunity = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);
  const [date, setDate] = useState(getLocalDateString());
  const [unlockDate, setUnlockDate] = useState(getLocalDateString());
  const [resHighlights, setResHighlights] = useState({});
  const [unlockHighlights, setUnlockHighlights] = useState({});
  const [editingRes, setEditingRes] = useState(null); // { res, tempName }
  const [community, setCommunity] = useState(null);
  const [dailyReservations, setDailyReservations] = useState([]);
  const [dailyUnlocks, setDailyUnlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Local state for explicit saving
  const [localName, setLocalName] = useState('');
  const [localAddress, setLocalAddress] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    if (found) {
      setCommunity(found);
      setLocalName(found.name);
      setLocalAddress(found.address || '');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCommunityData();
  }, [id, refresh]);

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
    const success = await updateCommunityInfo(community.id, localName, localAddress);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setRefresh(r => r + 1);
    } else {
      alert("Error al guardar urbanización");
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
