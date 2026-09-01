import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import { getCommunities, createCommunity } from '../store/api';

const Admin = () => {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCommName, setNewCommName] = useState('');

  const fetchCommunities = async () => {
    setLoading(true);
    const data = await getCommunities();
    setCommunities(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const handleAddCommunity = async (e) => {
    e.preventDefault();
    if (!newCommName.trim()) return;
    await createCommunity({ name: newCommName.trim() });
    setNewCommName('');
    fetchCommunities();
  };

  if (loading) return <div className="page-container"><p style={{ color: 'var(--clr-text-muted)' }}>Cargando panel...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Panel de Administración</h1>
        <p className="page-subtitle">Selecciona una urbanización para gestionarla</p>
      </div>

      <div className="card" style={{ marginBottom: '32px' }}>
        <div className="card-header">
          <div className="card-title">Añadir nueva Urbanización</div>
        </div>
        <form onSubmit={handleAddCommunity} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <Input 
            label="Nombre"
            placeholder="Ej: Residencial Los Pinos"
            value={newCommName}
            onChange={(e) => setNewCommName(e.target.value)}
            style={{ flex: 1, maxWidth: '400px' }}
          />
          <Button type="submit">Crear Urbanización</Button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {communities.map(comm => (
          <div 
            key={comm.id} 
            className="card" 
            style={{ cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--clr-border)' }}
            onClick={() => navigate(`/admin/community/${comm.id}`)}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🏢</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>{comm.name}</h3>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              {comm.address}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-green">
                {comm.courts.length} pista{comm.courts.length !== 1 ? 's' : ''}
              </span>
              <span style={{ color: 'var(--clr-green)', fontSize: '0.85rem', fontWeight: 600 }}>
                Gestionar →
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;
