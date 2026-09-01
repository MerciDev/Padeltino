import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import { getCommunities, updateCourtConfig, removeCourt } from '../store/api';
import UrbanizationModel from '../components/UrbanizationModel';

const AdminCourt = () => {
  const { commId, courtId } = useParams();
  const navigate = useNavigate();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [localCourt, setLocalCourt] = useState(null);
  const [communityName, setCommunityName] = useState('');

  useEffect(() => {
    const fetchCourt = async () => {
      setLoading(true);
      const comms = await getCommunities();
      const community = comms.find(c => c.id === Number(commId));
      if (community) setCommunityName(community.name);
      
      const court = community?.courts.find(c => c.id === Number(courtId));
      if (court) {
        setLocalCourt(JSON.parse(JSON.stringify(court)));
      }
      setLoading(false);
    };
    fetchCourt();
  }, [commId, courtId]);

  if (loading) {
    return <div className="page-container"><p style={{ color: 'var(--clr-text-muted)' }}>Cargando pista...</p></div>;
  }

  if (!localCourt) {
    return (
      <div className="page-container">
        <p>Pista no encontrada.</p>
        <Link to={`/admin/community/${commId}`}>Volver a la urbanización</Link>
      </div>
    );
  }

  const handleUpdateField = (field, value) => {
    setLocalCourt(prev => {
      const next = { ...prev };
      if (field === 'name') {
        next.name = value;
      } else if (field === 'color') {
        next.color = value;
      } else {
        next.config = { ...next.config, [field]: value };
      }
      return next;
    });
  };

  const handleAddSchedule = () => {
    setLocalCourt(prev => {
      const next = { ...prev };
      if (!next.config.schedules) next.config.schedules = [];
      next.config.schedules = [...next.config.schedules, { start: '09:00', end: '14:00', intervalMinutes: 90 }];
      return next;
    });
  };

  const handleUpdateSchedule = (index, field, value) => {
    setLocalCourt(prev => {
      const next = { ...prev };
      const newSchedules = [...(next.config.schedules || [])];
      newSchedules[index] = { ...newSchedules[index], [field]: value };
      next.config.schedules = newSchedules;
      return next;
    });
  };

  const handleRemoveSchedule = (index) => {
    setLocalCourt(prev => {
      const next = { ...prev };
      next.config.schedules = (next.config.schedules || []).filter((_, i) => i !== index);
      return next;
    });
  };

  const handleSave = async () => {
    const success = await updateCourtConfig(localCourt.id, localCourt.name, localCourt.color || '#9ca3af', localCourt.config);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert("Error al guardar pista");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta pista? Esta acción no se puede deshacer.')) return;
    const success = await removeCourt(localCourt.id);
    if (success) {
      navigate(`/admin/community/${commId}`);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => navigate(`/admin/community/${commId}`)}
          style={{ background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '8px' }}
        >
          ←
        </button>
        <div>
          <h1 className="page-title">Configuración de {localCourt.name}</h1>
          <p className="page-subtitle">Ajustes horarios para {communityName}</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          
          {/* Vista 3D (Mitad Izquierda) */}
          <div style={{ flex: '1 1 400px', minHeight: '400px', backgroundColor: 'var(--clr-surface-2)', position: 'relative' }}>
             <UrbanizationModel color={localCourt.color || '#9ca3af'} />
          </div>

          {/* Formulario (Mitad Derecha) */}
          <div style={{ flex: '1 1 400px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '24px' }}>Detalles de la pista</h2>
              
              <div style={{ marginBottom: '20px' }}>
                <Input 
                  label="Nombre de la Pista"
                  value={localCourt.name}
                  onChange={(e) => handleUpdateField('name', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '12px' }}>Color del revestimiento</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[
                    '#9ca3af', // Gris
                    '#93c5fd', // Azul Pastel
                    '#86efac', // Verde Pastel
                    '#f9a8d4', // Rosa Pastel
                    '#fde047', // Amarillo Pastel
                    '#fdba74', // Naranja Pastel
                    '#d8b4fe', // Morado Pastel
                  ].map(c => (
                    <button
                      key={c}
                      onClick={() => handleUpdateField('color', c)}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c,
                        border: localCourt.color === c ? '3px solid var(--clr-green)' : '2px solid transparent',
                        cursor: 'pointer', outline: 'none', transition: 'transform 0.1s',
                        transform: localCourt.color === c ? 'scale(1.1)' : 'scale(1)'
                      }}
                      title={c}
                    />
                  ))}
                  {/* Custom color picker as fallback */}
                  <div style={{ position: 'relative', width: '32px', height: '32px' }}>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%', border: '2px dashed var(--clr-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
                    }}>+</div>
                    <input 
                      type="color" 
                      value={localCourt.color || '#9ca3af'} 
                      onChange={(e) => handleUpdateField('color', e.target.value)}
                      style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                      title="Color personalizado"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Horarios de Apertura</h2>
                <Button onClick={handleAddSchedule} variant="secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>+ Añadir Franja</Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {(!localCourt.config.schedules || localCourt.config.schedules.length === 0) && (
                  <p style={{ color: 'var(--clr-text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No hay horarios configurados. La pista estará cerrada.</p>
                )}
                {(localCourt.config.schedules || []).map((sched, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', background: 'var(--clr-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--clr-border)', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <Input 
                        label="Apertura"
                        type="time"
                        value={sched.start}
                        onChange={(e) => handleUpdateSchedule(idx, 'start', e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <Input 
                        label="Cierre"
                        type="time"
                        value={sched.end}
                        onChange={(e) => handleUpdateSchedule(idx, 'end', e.target.value)}
                      />
                    </div>
                    <div style={{ width: '120px' }}>
                      <Input 
                        label="Min. x Turno"
                        type="number"
                        min="15"
                        step="15"
                        value={sched.intervalMinutes || 90}
                        onChange={(e) => handleUpdateSchedule(idx, 'intervalMinutes', Number(e.target.value))}
                      />
                    </div>
                    <Button onClick={() => handleRemoveSchedule(idx)} variant="danger" style={{ padding: '10px 16px', height: '42px', display: 'flex', alignItems: 'center' }}>X</Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones */}
            <div style={{ marginTop: 'auto', paddingTop: '32px', borderTop: '1px solid var(--clr-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Button onClick={handleSave} style={{ backgroundColor: 'var(--clr-green)' }}>Guardar Cambios</Button>
                {saveSuccess && <span style={{ color: 'var(--clr-green)', fontSize: '0.9rem', fontWeight: 600 }}>¡Actualizado!</span>}
              </div>
              <Button onClick={handleDelete} variant="danger">Eliminar Pista</Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCourt;
