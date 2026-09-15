import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import { getCommunities, createCommunity, getAdmins, createAdmin, deleteAdmin, updateAdminPermissions } from '../store/api';
import { useAlert } from '../components/AlertContext';

const PERMISSION_CATEGORIES = [
  { id: 'canManageCommunities', label: 'Crear Urbanizaciones' },
  { id: 'canManageSettings', label: 'Ajustes Generales' },
  { id: 'canManageAccessStructure', label: 'Estructura de Acceso' },
  { id: 'canManageLogs', label: 'Registro de Accesos (Logs)' },
  { id: 'canManageReservations', label: 'Reservas Reales' },
  { id: 'canManageUnlocks', label: 'Desbloqueos Manuales' },
  { id: 'canManageCourts', label: 'Pistas Disponibles' },
  { id: 'canManageAdmins', label: 'Gestión de Administradores' }
];

const Admin = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  
  const currentUser = JSON.parse(localStorage.getItem('padeltino_user') || '{}');
  const isRoot = currentUser.id === 'admin';
  const hasAdminPerm = isRoot || (currentUser.permissions && currentUser.permissions.canManageAdmins);
  const canCreateCommunities = isRoot || (currentUser.permissions && currentUser.permissions.canManageCommunities);
  
  const [activeTab, setActiveTab] = useState('communities');
  
  const [communities, setCommunities] = useState([]);
  const [newCommName, setNewCommName] = useState('');
  
  const [admins, setAdmins] = useState([]);
  const [newAdminId, setNewAdminId] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminPermissions, setNewAdminPermissions] = useState({});
  
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [editingPermissions, setEditingPermissions] = useState({});
  
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const commData = await getCommunities();
    setCommunities(commData);
    
    const adminData = await getAdmins();
    setAdmins(adminData);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddCommunity = async (e) => {
    e.preventDefault();
    if (!newCommName.trim()) return;
    await createCommunity({ name: newCommName.trim() });
    setNewCommName('');
    fetchData();
    showAlert('Urbanización creada correctamente', 'Éxito');
  };

  const handlePermissionChange = (permId, isChecked, isEditing = false) => {
    if (isEditing) {
      setEditingPermissions(prev => ({ ...prev, [permId]: isChecked }));
    } else {
      setNewAdminPermissions(prev => ({ ...prev, [permId]: isChecked }));
    }
  };

  const handleAllowedCommunityChange = (communityId, isChecked, isEditing = false) => {
    const setState = isEditing ? setEditingPermissions : setNewAdminPermissions;
    
    setState(prev => {
      const currentList = prev.allowedCommunities || [];
      let newList;
      if (isChecked) {
        newList = [...currentList, communityId];
      } else {
        newList = currentList.filter(id => id !== communityId);
      }
      return { ...prev, allowedCommunities: newList };
    });
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminId.trim() || !newAdminName.trim() || !newAdminPassword.trim()) {
      showAlert('Todos los campos son obligatorios', 'Error');
      return;
    }
    
    const success = await createAdmin(newAdminId.trim(), newAdminName.trim(), newAdminPassword, newAdminPermissions);
    if (success) {
      setNewAdminId('');
      setNewAdminName('');
      setNewAdminPassword('');
      setNewAdminPermissions({});
      fetchData();
      showAlert('Administrador creado correctamente', 'Éxito');
    } else {
      showAlert('Error al crear el administrador (puede que el ID ya exista)', 'Error');
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (id === 'admin') {
      showAlert('No se puede eliminar al administrador principal', 'Error');
      return;
    }
    if (window.confirm(`¿Estás seguro de que deseas revocar el acceso a ${id}?`)) {
      const success = await deleteAdmin(id);
      if (success) {
        fetchData();
        showAlert('Administrador eliminado correctamente', 'Éxito');
      } else {
        showAlert('Error al eliminar el administrador', 'Error');
      }
    }
  };

  const handleSavePermissions = async (id) => {
    const success = await updateAdminPermissions(id, editingPermissions);
    if (success) {
      setEditingAdminId(null);
      fetchData();
      showAlert('Permisos actualizados correctamente', 'Éxito');
    } else {
      showAlert('Error al actualizar permisos', 'Error');
    }
  };

  const visibleCommunities = communities.filter(comm => {
    if (isRoot) return true;
    const allowed = currentUser.permissions?.allowedCommunities || [];
    return allowed.includes(comm.id);
  });

  if (loading) return <div className="page-container"><p style={{ color: 'var(--clr-text-muted)' }}>Cargando panel...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Panel de Administración Global</h1>
        <p className="page-subtitle">Gestiona urbanizaciones y administradores del sistema</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '1px solid var(--clr-border)', paddingBottom: '16px' }}>
        <Button 
          variant={activeTab === 'communities' ? 'primary' : 'outline'} 
          onClick={() => setActiveTab('communities')}
        >
          Urbanizaciones
        </Button>
        {hasAdminPerm && (
          <Button 
            variant={activeTab === 'admins' ? 'primary' : 'outline'} 
            onClick={() => setActiveTab('admins')}
          >
            Administradores
          </Button>
        )}
      </div>

      {activeTab === 'communities' && (
        <>
          {canCreateCommunities && (
          <div className="card" style={{ marginBottom: '32px' }}>
            <div className="card-header">
              <div className="card-title">Añadir nueva Urbanización</div>
            </div>
            <form onSubmit={handleAddCommunity} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Input 
                label="Nombre"
                placeholder="Ej: Residencial Los Pinos"
                value={newCommName}
                onChange={(e) => setNewCommName(e.target.value)}
                style={{ flex: '1 1 300px' }}
              />
              <Button type="submit">Crear Urbanización</Button>
            </form>
          </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {visibleCommunities.map(comm => (
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
        </>
      )}

      {activeTab === 'admins' && hasAdminPerm && (
        <>
          <div className="card" style={{ marginBottom: '32px' }}>
            <div className="card-header">
              <div className="card-title">Añadir Administrador Secundario</div>
            </div>
            <form onSubmit={handleAddAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <Input 
                  label="Usuario (ID)"
                  placeholder="Ej: admin_madrid"
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value)}
                  style={{ flex: '1 1 200px' }}
                />
                <Input 
                  label="Nombre Visible"
                  placeholder="Ej: Carlos"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  style={{ flex: '1 1 200px' }}
                />
                <Input 
                  label="Contraseña"
                  type="password"
                  placeholder="Contraseña"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  style={{ flex: '1 1 200px' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '12px' }}>Urbanizaciones Permitidas (Solo afecta si no es Crear Urbanizaciones global)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', background: 'var(--clr-surface-2)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px' }}>
                  {communities.map(comm => {
                    const isChecked = (newAdminPermissions.allowedCommunities || []).includes(comm.id);
                    return (
                      <label key={comm.id} className="checkbox-label">
                        <input 
                          type="checkbox"
                          className="form-checkbox"
                          checked={isChecked} 
                          onChange={(e) => handleAllowedCommunityChange(comm.id, e.target.checked)} 
                        />
                        {comm.name}
                      </label>
                    )
                  })}
                </div>

                <label className="form-label" style={{ display: 'block', marginBottom: '12px' }}>Permisos Específicos</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', background: 'var(--clr-surface-2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                  {PERMISSION_CATEGORIES.map(perm => (
                    <label key={perm.id} className="checkbox-label">
                      <input 
                        type="checkbox"
                        className="form-checkbox"
                        checked={!!newAdminPermissions[perm.id]} 
                        onChange={(e) => handlePermissionChange(perm.id, e.target.checked)} 
                      />
                      {perm.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit">Crear Admin</Button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Administradores Activos</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--clr-border)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--clr-text-muted)', fontWeight: 500 }}>ID / Nombre</th>
                    <th style={{ padding: '12px 16px', color: 'var(--clr-text-muted)', fontWeight: 500 }}>Privilegios Asignados</th>
                    <th style={{ padding: '12px 16px', color: 'var(--clr-text-muted)', fontWeight: 500, textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(admin => {
                    const displayPerms = admin.permissions || {};
                    
                    return (
                      <tr key={admin.id} style={{ borderBottom: '1px solid var(--clr-border)', verticalAlign: 'top' }}>
                        <td style={{ padding: '16px', minWidth: '150px' }}>
                          <div style={{ fontWeight: 600 }}>{admin.id}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>{admin.name}</div>
                        </td>
                        
                        <td style={{ padding: '16px' }}>
                          {admin.id === 'admin' ? (
                            <span className="badge badge-green">Acceso Total Inmutable</span>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {PERMISSION_CATEGORIES.map(perm => {
                                if (displayPerms[perm.id]) {
                                  return <span key={perm.id} className="badge badge-green" style={{ fontSize: '0.7rem' }}>{perm.label}</span>;
                                }
                                return null;
                              })}
                              {Object.values(displayPerms).every(v => !v) && (
                                <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>Sin permisos</span>
                              )}
                            </div>
                          )}
                        </td>
                        
                        <td style={{ padding: '16px', textAlign: 'right', minWidth: '150px' }}>
                          {admin.id !== 'admin' && (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <Button variant="secondary" size="sm" onClick={() => {
                                setEditingAdminId(admin.id);
                                setEditingPermissions(admin.permissions || {});
                              }}>Editar</Button>
                              <Button variant="danger" size="sm" onClick={() => handleDeleteAdmin(admin.id)}>Revocar</Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {editingAdminId && (
            <div className="modal-overlay" onClick={() => setEditingAdminId(null)} style={{ zIndex: 9999 }}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--clr-text)' }}>
                  Editar Permisos
                </h2>
                <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                  Modifica los permisos de acceso para <strong>{editingAdminId}</strong>.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Urbanizaciones Permitidas</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', background: 'var(--clr-surface-2)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                      {communities.map(comm => {
                        const isChecked = (editingPermissions.allowedCommunities || []).includes(comm.id);
                        return (
                          <label key={comm.id} className="checkbox-label">
                            <input 
                              type="checkbox" 
                              className="form-checkbox"
                              checked={isChecked} 
                              onChange={(e) => handleAllowedCommunityChange(comm.id, e.target.checked, true)} 
                            />
                            {comm.name}
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px', marginTop: '8px' }}>Permisos de Administración</h3>
                  </div>
                  {PERMISSION_CATEGORIES.map(perm => (
                    <label key={perm.id} className="checkbox-label">
                      <input 
                        type="checkbox" 
                        className="form-checkbox"
                        checked={!!editingPermissions[perm.id]} 
                        onChange={(e) => handlePermissionChange(perm.id, e.target.checked, true)} 
                      />
                      {perm.label}
                    </label>
                  ))}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--clr-border)', paddingTop: '20px' }}>
                  <Button variant="ghost" onClick={() => setEditingAdminId(null)}>Cancelar</Button>
                  <Button variant="primary" onClick={() => handleSavePermissions(editingAdminId)}>Guardar Cambios</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Admin;
