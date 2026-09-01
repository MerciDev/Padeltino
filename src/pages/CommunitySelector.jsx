import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCommunities } from '../store/api';

const CommunitySelector = () => {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComms = async () => {
      const data = await getCommunities();
      setCommunities(data);
      setLoading(false);
    };
    fetchComms();
  }, []);

  return (
    <div className="community-selector-page">
      <div className="login-logo" style={{ marginBottom: '60px', textAlign: 'center' }}>
        <div className="login-logo-mark" style={{ margin: '0 auto 20px' }}>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8zm-1 5v2H9v2h2v6h2v-6h2v-2h-2V9h-2z"/>
          </svg>
        </div>
        <div className="login-brand">PADELTINO</div>
        <div className="login-tagline">Selecciona tu urbanización para continuar</div>
      </div>


      {loading ? (
        <div style={{ color: 'var(--clr-text-muted)', textAlign: 'center', marginTop: '40px' }}>Cargando urbanizaciones...</div>
      ) : (
        <div className="communities-3d-grid">
        {communities.map((comm) => (
          <div
            key={comm.id}
            className="community-card-3d"
            onClick={() => navigate(`/login/${comm.id}`)}
          >
            <div className="community-card-3d-inner" style={{ padding: '40px 30px' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '24px' }}>🏢</div>
              <h3 className="community-card-3d-title">{comm.name}</h3>
              <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>{comm.address}</p>
              <p className="community-card-3d-subtitle">
                {comm.courts.length} pista{comm.courts.length !== 1 ? 's' : ''} disponible{comm.courts.length !== 1 ? 's' : ''}
              </p>
              <div className="community-card-3d-action">Entrar →</div>
            </div>
          </div>
        ))}
      </div>
      )}

      <div style={{ marginTop: '80px', color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
        ¿Eres administrador general?{' '}
        <span
          style={{ color: 'var(--clr-green)', cursor: 'pointer', fontWeight: 'bold' }}
          onClick={() => navigate('/login/admin')}
        >
          Entrar aquí
        </span>
      </div>
    </div>
  );
};

export default CommunitySelector;
