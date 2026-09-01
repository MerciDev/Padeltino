import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { getUserReservations, getAllReservations, getCommunities } from '../store/api';
const formatDate = (isoStr) => {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
};

const Dashboard = ({ user }) => {
  const [userReservations, setUserReservations] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

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
  
  const today = new Date().toISOString().split('T')[0];
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
        <Link to="/book">
          <Button>+ Nueva reserva</Button>
        </Link>
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
    </div>
  );
};

export default Dashboard;
