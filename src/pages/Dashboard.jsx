import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import { getUserReservations, getAllReservations, getCommunities, updateUserPassword, getUser, getOpenReservations, joinReservationByCode } from '../store/api';
import PageLoader from '../components/PageLoader';
import { getLocalDateString } from '../utils/date';
import { getLocalDeviceId } from '../utils/device';
import { useAlert } from '../components/AlertContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, Key } from 'lucide-react';
const formatDate = (isoStr) => {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
};

const Dashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [userReservations, setUserReservations] = useState([]);
  const [openReservations, setOpenReservations] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [newPwdConfirm, setNewPwdConfirm] = useState('');
  const [pwdError, setPwdError] = useState('');
  
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  
  const { showAlert } = useAlert();

  const handlePasswordChange = async () => {
    if (newPwd !== newPwdConfirm) {
      setPwdError('Las contraseñas no coinciden.');
      return;
    }
    if (newPwd.length < 4) {
      setPwdError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    
    const success = await updateUserPassword(user.id, newPwd);
    if (success) {
      showAlert('Contraseña actualizada correctamente.', 'Éxito');
      setPwdModalOpen(false);
      setNewPwd('');
      setNewPwdConfirm('');
      setPwdError('');
    } else {
      setPwdError('Error al actualizar la contraseña. Inténtalo de nuevo.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const comms = await getCommunities();
      setCommunities(comms);

      // Solo obtenemos las reservas del propio usuario para el panel principal.
      // Los administradores gestionan las reservas de otros desde el calendario.
      let reservations = await getUserReservations(user.id);
      reservations.sort((a, b) => new Date(a.date) - new Date(b.date));
      setUserReservations(reservations);
      
      if (user.communityId) {
        const openRes = await getOpenReservations(user.communityId);
        setOpenReservations(openRes);
      }
      
      if (user.isVerified && !user.hasPassword && !user.isAdmin) {
        setPwdModalOpen(true);
      }
      
      setLoading(false);
    };
    
    fetchData();
  }, [user.id, user.isAdmin, user.isVerified, user.hasPassword]);

  // Polling para detectar cuando el administrador verifica la cuenta
  useEffect(() => {
    if (user.isVerified || user.isAdmin) return;
    
    const interval = setInterval(async () => {
      const dbUser = await getUser(user.id);
      if (dbUser && dbUser.isVerified) {
        // El administrador lo acaba de verificar.
        // Comprobar si el dispositivo autorizado coincide con el dispositivo actual
        const localDevice = getLocalDeviceId();
        
        // Actualizar el estado global del usuario (y el localStorage)
        const updatedUser = { ...user, isVerified: true, hasPassword: !!dbUser.password };
        localStorage.setItem('padeltino_user', JSON.stringify(updatedUser));
        if (setUser) setUser(updatedUser);
        
        // Si el dispositivo coincide o si no hay dispositivo guardado (fallback por si acaso), le dejamos cambiar pwd
        if (!dbUser.allowed_device_id || dbUser.allowed_device_id === localDevice) {
          if (!dbUser.password) {
            setPwdModalOpen(true);
          }
        }
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user, setUser]);
  
  const today = getLocalDateString();
  const upcoming = userReservations.filter(r => r.date >= today);
  
  const userCommunity = communities.find(c => c.id === user.communityId) || communities[0];
  const totalCourts = userCommunity ? userCommunity.courts?.length || 0 : 0;

  if (loading) {
    return <PageLoader message="Cargando panel..." submessage="Sincronizando información" />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Hola, {user.name} 👋</h1>
          <p className="page-subtitle">
            {user.isAdmin ? 'Modo Administrador' : userCommunity?.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {(user.isAdmin || (user.isVerified && user.hasPassword)) && (
            <Button variant="secondary" onClick={() => setPwdModalOpen(true)}>Seguridad</Button>
          )}
          {user.isVerified ? (
            <Link to="/book">
              <Button>+ Nueva reserva</Button>
            </Link>
          ) : (
            <Button variant="secondary" disabled>Bloqueado</Button>
          )}
        </div>
      </div>

      {!user.isVerified && !user.isAdmin && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--clr-red)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--clr-red)', fontSize: '1.5rem' }}>⚠️</div>
          <div>
            <h3 style={{ color: 'var(--clr-red)', fontWeight: 600, fontSize: '1rem', margin: 0 }}>Cuenta pendiente de verificación</h3>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>No puedes reservar pistas hasta que el administrador autorice tu acceso.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Reservas</span>
          <span className="stat-value">{userReservations.length}</span>
          <span className="stat-sub">histórico completo</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Próximas</span>
          <span className="stat-value">{upcoming.length}</span>
          <span className="stat-sub">partidas confirmadas</span>
        </div>
      </div>

      {/* Partidos Abiertos */}
      <div className="page-header-row" style={{ marginTop: '16px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--clr-text)' }}>
          Partidos abiertos
        </h2>
        <Button variant="secondary" onClick={() => setJoinModalOpen(true)} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
          <Key size={14} style={{ marginRight: '6px' }} /> Tengo un código
        </Button>
      </div>
      
      {openReservations.length > 0 ? (
        <div className="reservations-grid" style={{ marginBottom: '32px' }}>
          {openReservations.map((res, i) => {
            const community = communities.find(c => c.id === res.communityId);
            const court = community?.courts.find(c => c.id === res.courtId);
            const isMyReservation = userReservations.some(my => my.id === res.id);
            const badgeColor = isMyReservation ? '#3b82f6' : '#22c55e';
            const badgeText = isMyReservation ? 'Tu Partido' : '¡Únete!';
            
            return (
              <Link 
                to={`/reservation/${res.inviteCode || res.id}`}
                key={`open-${i}`} 
                className="reservation-card" 
                style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s', cursor: 'pointer', borderColor: badgeColor }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div className="reservation-card-top">
                  <div>
                    <div className="reservation-court">{court?.name || 'Pista Eliminada'}</div>
                    <div className="reservation-date">{formatDate(res.date)} a las {res.timeSlot}</div>
                  </div>
                  <span className="badge" style={{ backgroundColor: badgeColor, color: 'white' }}>{badgeText}</span>
                </div>
                <div className="reservation-slot font-mono" style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>Creado por {res.userName}</span>
                    <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.75rem' }}>{community?.name}</span>
                  </div>
                  <span style={{ fontWeight: '600' }}>{res.playerCount}/4 Jugadores</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '32px 24px', backgroundColor: 'var(--clr-bg-alt)', borderRadius: '12px', border: '2px dashed var(--clr-border)', textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '2rem', opacity: 0.5, marginBottom: '8px' }}>🏸</div>
          <h4 style={{ margin: '0 0 4px 0', color: 'var(--clr-text)', fontSize: '1rem' }}>No hay partidos públicos ahora</h4>
          <p style={{ margin: 0, color: 'var(--clr-text-muted)', fontSize: '0.85rem' }}>Si algún vecino busca jugadores, aparecerá aquí.</p>
        </div>
      )}

      {/* Reservations */}
      <div className="page-header-row">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--clr-text)' }}>
          Tus reservas
        </h2>
      </div>

      {userReservations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎾</div>
          <div className="empty-state-title">No tienes reservas todavía</div>
          <div className="empty-state-text">
            Reserva una pista y empieza a jugar.
          </div>
          <Link to="/book">
            <Button>Reservar ahora</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="reservations-grid">
            {upcoming.map((res, i) => {
              const community = communities.find(c => c.id === res.communityId);
              const court = community?.courts.find(c => c.id === res.courtId);
              
              return (
                <Link 
                  to={`/reservation/${res.inviteCode || res.id}`}
                  key={`upc-${i}`} 
                  className="reservation-card" 
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s', cursor: 'pointer' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div className="reservation-card-top">
                    <div>
                      <div className="reservation-court">{court?.name || 'Pista Eliminada'}</div>
                      <div className="reservation-date">{formatDate(res.date)}</div>
                    </div>
                    <span className="badge badge-green">Próximo</span>
                  </div>
                  <div className="reservation-slot font-mono">{res.timeSlot}</div>
                </Link>
              );
            })}
          </div>
          
          {userReservations.length > upcoming.length && (
            <details style={{ marginTop: '32px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '1rem', fontWeight: 600, color: 'var(--clr-text-muted)', marginBottom: '16px' }}>
                Ver histórico de reservas pasadas
              </summary>
              <div className="reservations-grid" style={{ opacity: 0.7 }}>
                {userReservations.filter(r => r.date < today).map((res, i) => {
                  const community = communities.find(c => c.id === res.communityId);
                  const court = community?.courts.find(c => c.id === res.courtId);
                  
                  return (
                    <Link
                      to={`/reservation/${res.id}`}
                      key={`past-${i}`} 
                      className="reservation-card"
                      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                    >
                      <div className="reservation-card-top">
                        <div>
                          <div className="reservation-court">{court?.name || 'Pista Eliminada'}</div>
                          <div className="reservation-date">{formatDate(res.date)}</div>
                        </div>
                        <span className="badge badge-gray">Jugado</span>
                      </div>
                      <div className="reservation-slot font-mono">{res.timeSlot}</div>
                    </Link>
                  );
                })}
              </div>
            </details>
          )}
        </>
      )}

      {joinModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--clr-text)' }}>
              Unirse con Código
            </h2>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Introduce el código de 6 caracteres que te ha proporcionado el organizador.
            </p>
            <Input 
              label="Código de invitación" 
              value={inviteCode} 
              onChange={e => setInviteCode(e.target.value.toUpperCase())} 
              placeholder="Ej: A1B2C3"
              maxLength={6}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <Button variant="ghost" onClick={() => { setJoinModalOpen(false); setInviteCode(''); }}>Cancelar</Button>
              <Button onClick={async () => {
                if (inviteCode.length < 6) return showAlert('El código debe tener 6 caracteres', 'error');
                setJoining(true);
                const res = await joinReservationByCode(inviteCode, user.id, user.name);
                setJoining(false);
                if (res.success) {
                  showAlert('¡Te has unido al partido!', 'success');
                  setJoinModalOpen(false);
                  navigate(`/reservation/${res.reservationCode}`);
                } else {
                  showAlert(res.error || 'Código inválido o partido lleno', 'error');
                }
              }} disabled={joining}>
                {joining ? <Loader2 size={16} className="spin" /> : 'Unirme'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {pwdModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: 'var(--clr-text)' }}>
              {(!user.hasPassword && !user.isAdmin) ? '🔐 Establece tu contraseña' : 'Cambiar Contraseña'}
            </h2>
            {(!user.hasPassword && !user.isAdmin) && (
              <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Tu cuenta ha sido verificada. Debes establecer una contraseña ahora para proteger el acceso a tu portal.
              </p>
            )}
            <Input 
              type="password" 
              label="Nueva contraseña" 
              value={newPwd} 
              onChange={e => setNewPwd(e.target.value)} 
              placeholder="Min. 4 caracteres"
            />
            <Input 
              type="password" 
              label="Repetir nueva contraseña" 
              value={newPwdConfirm} 
              onChange={e => setNewPwdConfirm(e.target.value)} 
            />
            {pwdError && <p style={{ color: 'var(--clr-red)', fontSize: '0.85rem', marginBottom: '16px' }}>{pwdError}</p>}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              {(user.hasPassword || user.isAdmin) && (
                <Button variant="ghost" onClick={() => { setPwdModalOpen(false); setPwdError(''); setNewPwd(''); setNewPwdConfirm(''); }}>Cancelar</Button>
              )}
              <Button onClick={async () => {
                await handlePasswordChange();
                // If it succeeds, we should update the local storage user object
                if (newPwd === newPwdConfirm && newPwd.length >= 4) {
                  const u = JSON.parse(localStorage.getItem('padeltino_user'));
                  if (u) {
                    u.hasPassword = true;
                    localStorage.setItem('padeltino_user', JSON.stringify(u));
                    // the page will need a reload to reflect user state, or we just let it be since they have it now.
                    window.location.reload();
                  }
                }
              }}>Guardar Contraseña</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
