import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import { getCommunities, getUser, hashPassword, ensureUserExists } from '../store/api';

const Login = ({ onLogin }) => {
  const { communityId } = useParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState(null);
  const navigate = useNavigate();

  const isGlobalAdminLogin = communityId === 'admin';

  useEffect(() => {
    if (isGlobalAdminLogin) {
      setLoading(false);
      return;
    }
    const fetchComm = async () => {
      const comms = await getCommunities();
      const found = comms.find(c => c.id === Number(communityId));
      setCommunity(found);
      setLoading(false);
    };
    fetchComm();
  }, [communityId, isGlobalAdminLogin]);

  const parseDisplayName = (username) => {
    if (username.toLowerCase() === 'admin') return 'Administrador';
    
    const regex = /^p(\d+)_([0-9b]+)([a-z]+)$/i;
    const match = username.match(regex);
    
    if (match) {
      const portal = match[1];
      const floorRaw = match[2].toLowerCase();
      const door = match[3].toUpperCase();
      
      const floorStr = floorRaw === 'b' ? 'Bajo' : `${floorRaw}º`;
      return `Portal ${portal}, ${floorStr} ${door}`;
    }
    
  };

  const handleVisualLogin = async (portal, floor, door) => {
    const id = `p${portal}_${floor}${door}`.toLowerCase();
    const floorStr = floor.toLowerCase() === 'b' ? 'Bajo' : `${floor}º`;
    const displayName = `Portal ${portal}, ${floorStr} ${door.toUpperCase()}`;

    setLoading(true);
    const userData = { 
      name: displayName, 
      username: id, 
      isAdmin: false, 
      id: id,
      communityId: Number(communityId)
    };
    
    await ensureUserExists(userData.id, userData.name, userData.communityId, false);
    
    localStorage.setItem('padeltino_user', JSON.stringify(userData));
    onLogin(userData);
    navigate('/dashboard');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    if (username !== password && username.toLowerCase() !== 'admin') {
      alert('Para cuentas de vecinos, el usuario y la contraseña deben ser iguales (ej. p1_bA).');
      return;
    }

    const isAdmin = username.toLowerCase() === 'admin';
    const displayName = parseDisplayName(username);
    
    // Check admin password
    if (isAdmin) {
      setLoading(true);
      const dbUser = await getUser('admin');
      const hashedInput = await hashPassword(password);
      if (dbUser && dbUser.password !== hashedInput) {
        alert('Contraseña de administrador incorrecta.');
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    
    // Asignar fallback community ID (ej 1) si es global admin para no romper rutas
    const fallbackId = community ? community.id : 1;

    const userData = { 
      name: displayName, 
      username: username.toLowerCase(), 
      isAdmin, 
      id: username.toLowerCase(),
      communityId: isGlobalAdminLogin ? fallbackId : Number(communityId)
    };
    
    // Ensure the user exists in the DB so foreign keys for reservations work
    await ensureUserExists(userData.id, userData.name, isGlobalAdminLogin ? null : userData.communityId, isAdmin);
    
    localStorage.setItem('padeltino_user', JSON.stringify(userData));
    onLogin(userData);
    navigate('/dashboard');
  };

  if (loading) {
    return <div className="page-container"><p style={{ color: 'var(--clr-text-muted)' }}>Cargando urbanización...</p></div>;
  }

  if (!community && !isGlobalAdminLogin) {
    return <div className="page-container"><p>Urbanización no encontrada.</p><Link to="/">Volver</Link></div>;
  }

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="login-logo">
          <div className="login-logo-mark">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8zm-1 5v2H9v2h2v6h2v-6h2v-2h-2V9h-2z"/>
            </svg>
          </div>
          <div className="login-brand">PADELTINO</div>
          <div className="login-tagline">
            {isGlobalAdminLogin ? 'Acceso Administrador General' : `Acceso a ${community.name}`}
          </div>
        </div>

        {/* VISUAL LOGIN WIZARD */}
        {!isGlobalAdminLogin && community?.loginConfig?.portals > 0 && !showAdminLogin ? (
          <div className="login-visual-wizard">
            {selectedPortal === null ? (
              <div className="portal-selector">
                <h3 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '1.2rem', fontWeight: 600 }}>Selecciona tu portal</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
                  {Array.from({ length: community.loginConfig.portals }).map((_, i) => (
                    <Button key={i} variant="secondary" onClick={() => setSelectedPortal(i + 1)}>
                      Portal {i + 1}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="door-selector">
                <h3 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '1.2rem', fontWeight: 600 }}>Portal {selectedPortal} - Selecciona tu puerta</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                  {community.loginConfig.floors.map(floor => (
                    community.loginConfig.doors.map(door => {
                      const id = `p${selectedPortal}_${floor}${door}`.toLowerCase();
                      if (community.loginConfig.exceptions?.includes(id)) return null;
                      
                      const floorStr = floor.toLowerCase() === 'b' ? 'Bajo' : `${floor}º`;
                      return (
                        <Button key={id} variant="secondary" onClick={() => handleVisualLogin(selectedPortal, floor, door)}>
                          {floorStr} {door.toUpperCase()}
                        </Button>
                      );
                    })
                  ))}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Button variant="ghost" onClick={() => setSelectedPortal(null)}>← Volver a portales</Button>
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <button 
                onClick={() => setShowAdminLogin(true)}
                style={{ background: 'none', border: 'none', color: 'var(--clr-text-muted)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Acceso Administrador
              </button>
            </div>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleLogin}>
            
            <Input
              label="Usuario"
              id="username"
              placeholder={isGlobalAdminLogin ? 'admin' : 'Introduce tu usuario (ej. p1_bA)'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Contraseña"
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {!isGlobalAdminLogin && (
              <div className="login-hint" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span><strong>Vecinos:</strong> Usa tu piso como usuario y contraseña (ej. <strong>p1_bA</strong>).</span>
                </div>
              </div>
            )}

            <Button type="submit" full size="lg" style={{ marginTop: '10px' }}>
              Entrar
            </Button>
            
            <div style={{ textAlign: 'center', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!isGlobalAdminLogin && community?.loginConfig?.portals > 0 && (
                <button 
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--clr-text-muted)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  ← Volver a selección visual
                </button>
              )}
              <Link to="/" style={{ color: 'var(--clr-text-muted)', fontSize: '0.85rem' }}>Cambiar de urbanización</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
