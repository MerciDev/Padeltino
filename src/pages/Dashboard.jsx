import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import { getUserReservations, getAllReservations, getCommunities, updateUserPassword } from '../store/api';
import { getLocalDateString } from '../utils/date';
const formatDate = (isoStr) => {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
};

const Dashboard = ({ user }) => {
  const [userReservations, setUserReservations] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [newPwdConfirm, setNewPwdConfirm] = useState('');
  const [pwdError, setPwdError] = useState('');

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
      alert('Contraseña actualizada correctamente.');
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
      setLoading(false);
    };
    
    fetchData();
  }, [user.id, user.isAdmin]);
  
  const today = getLocalDateString();
  const upcoming = userReservations.filter(r => r.date >= today);
  
  const userCommunity = communities.find(c => c.id === user.communityId) || communities[0];
  const totalCourts = userCommunity ? userCommunity.courts?.length || 0 : 0;

  if (loading) {
    return <div className="page-container"><p style={{ color: 'var(--clr-text-muted)' }}>Cargando panel...</p></div>;
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
          {user.isAdmin && (
            <Button variant="secondary" onClick={() => setPwdModalOpen(true)}>Seguridad</Button>
          )}
          <Link to="/book">
            <Button>+ Nueva reserva</Button>
          </Link>
        </div>
      </div>

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
        <div className="stat-card">
          <span className="stat-label">Pistas</span>
          <span className="stat-value">{totalCourts}</span>
          <span className="stat-sub">disponibles en tu zona</span>
        </div>
      </div>

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
        <div className="reservations-grid">
          {userReservations.map((res, i) => {
            const community = communities.find(c => c.id === res.communityId);
            const court = community?.courts.find(c => c.id === res.courtId);
            const isPast = res.date < today;
            
            return (
              <Link 
                to="/book" 
                state={{ date: res.date, courtId: res.courtId }} 
                key={i} 
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
                  <span className={`badge ${isPast ? 'badge-gray' : 'badge-green'}`}>
                    {isPast ? 'Jugado' : 'Próximo'}
                  </span>
                </div>
                <div className="reservation-slot font-mono">{res.timeSlot}</div>
              </Link>
            );
          })}
        </div>
      )}

      {pwdModalOpen && (
        <div className="modal-overlay" onClick={() => setPwdModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Cambiar Contraseña</h3>
            <div className="modal-body">
              <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Establece una nueva contraseña para tu cuenta de administrador.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input 
                  type="password"
                  label="Nueva Contraseña"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
                <Input 
                  type="password"
                  label="Confirmar Contraseña"
                  value={newPwdConfirm}
                  onChange={(e) => setNewPwdConfirm(e.target.value)}
                />
                {pwdError && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{pwdError}</p>}
              </div>
            </div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setPwdModalOpen(false)}>Cancelar</Button>
              <Button style={{ backgroundColor: 'var(--clr-green)' }} onClick={handlePasswordChange}>Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
