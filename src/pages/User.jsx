import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAlert } from '../components/AlertContext';
import PageLoader from '../components/PageLoader';
import { getHouseholdMembers, addHouseholdMember, updateHouseholdMember, removeHouseholdMember, uploadAvatar, deleteAvatar, getCommunities } from '../store/api';
import { User as UserIcon, Users, Trash2, Plus, Shield, MapPin, Loader2, Home, Edit3, X, Mail, Phone, Calendar, Upload, LogOut, Crown } from 'lucide-react';
import { compressImage } from '../utils/image';

const User = ({ user, onLogout }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', age: '', photo_url: '', is_representative: false });
  const [submitting, setSubmitting] = useState(false);
  const [communityName, setCommunityName] = useState(`Comunidad #${user.communityId}`);
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);
  
  const { showAlert } = useAlert();

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersData, commsData] = await Promise.all([
        getHouseholdMembers(user.id),
        getCommunities()
      ]);
      setMembers(membersData);
      
      const userComm = commsData.find(c => c.id === user.communityId);
      if (userComm) {
        setCommunityName(userComm.name);
      }
    } catch (error) {
      showAlert('Error al cargar datos del perfil.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingMember(null);
    setFormData({ name: '', email: '', phone: '', age: '', photo_url: '', is_representative: false });
    setSelectedFile(null);
    setPreviewUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      age: member.age ? member.age.toString() : '',
      photo_url: member.photo_url || '',
      is_representative: member.is_representative || false
    });
    setSelectedFile(null);
    setPreviewUrl(member.photo_url || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMember(null);
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      let finalPhotoUrl = formData.photo_url;

      // Handle image upload if a new file is selected
      if (selectedFile) {
        try {
          const compressed = await compressImage(selectedFile);
          const newUrl = await uploadAvatar(compressed);
          if (newUrl) {
            // Delete old avatar if replacing it
            if (editingMember && editingMember.photo_url) {
              await deleteAvatar(editingMember.photo_url);
            }
            finalPhotoUrl = newUrl;
          } else {
            showAlert('Hubo un problema al subir la foto, pero se guardarán los demás datos.', 'warning');
          }
        } catch (err) {
          console.error("Error compressing/uploading:", err);
          showAlert('Error al procesar la foto.', 'error');
        }
      }

      const finalData = { ...formData, photo_url: finalPhotoUrl };

      if (editingMember) {
        const updated = await updateHouseholdMember(user.id, editingMember.id, finalData);
        if (updated) {
          showAlert('Persona actualizada correctamente.', 'success');
          await loadData(); // Reload to sync is_representative changes across members
          closeModal();
        } else {
          showAlert('Error al actualizar.', 'error');
        }
      } else {
        const newMember = await addHouseholdMember(user.id, finalData);
        if (newMember) {
          showAlert('Persona añadida correctamente.', 'success');
          await loadData(); // Reload to sync is_representative changes across members
          closeModal();
        } else {
          showAlert('Error al añadir la persona.', 'error');
        }
      }
    } catch (error) {
      showAlert('Error inesperado.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToDelete) return;
    
    setSubmitting(true);
    try {
      // removeHouseholdMember now handles deleting the photo if passed
      const success = await removeHouseholdMember(memberToDelete.id, memberToDelete.photo_url);
      if (success) {
        setMembers(members.filter(m => m.id !== memberToDelete.id));
        showAlert('Persona eliminada.', 'success');
      } else {
        showAlert('Error al eliminar.', 'error');
      }
    } catch (error) {
      showAlert('Error inesperado al eliminar.', 'error');
    } finally {
      setSubmitting(false);
      setMemberToDelete(null);
    }
  };

  if (!user) return null;

  const representative = members.find(m => m.is_representative);

  return (
    <div className="container" style={{ paddingBottom: '64px' }}>
      
      {/* Modal for Deletion Confirmation */}
      {memberToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '24px'
        }}>
          <div style={{
            backgroundColor: 'var(--clr-bg)', borderRadius: '16px',
            width: '100%', maxWidth: '400px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            overflow: 'hidden', border: '1px solid var(--clr-border)', padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{ margin: '0 auto 16px', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem' }}>Eliminar persona</h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--clr-text-muted)' }}>
              ¿Estás seguro de que quieres eliminar a <strong>{memberToDelete.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Button type="button" variant="ghost" onClick={() => setMemberToDelete(null)} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleRemoveMember} disabled={submitting} style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}>
                {submitting ? <Loader2 size={18} className="spin" /> : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Add / Edit */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '24px'
        }}>
          <div style={{
            backgroundColor: 'var(--clr-bg)',
            borderRadius: '16px',
            width: '100%', maxWidth: '500px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            border: '1px solid var(--clr-border)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--clr-border)' }}>
              <h3 style={{ margin: 0 }}>{editingMember ? 'Editar Persona' : 'Añadir Persona'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text-muted)' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ overflowY: 'auto' }}>
              <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', position: 'relative' }}>
                  <div style={{ 
                    width: '80px', height: '80px', borderRadius: '50%', 
                    backgroundColor: 'var(--clr-bg-alt)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', border: '2px solid var(--clr-border)',
                    position: 'relative'
                  }}>
                    {previewUrl ? (
                      <img src={previewUrl} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <UserIcon size={32} color="var(--clr-text-muted)" />
                    )}
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: 'absolute', bottom: '-4px', right: 'calc(50% - 44px)',
                      width: '32px', height: '32px', borderRadius: '50%',
                      backgroundColor: 'var(--clr-primary)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--clr-bg)', cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}
                    title="Subir foto"
                  >
                    <Upload size={14} />
                  </button>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleFileSelect}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500' }}>Nombre *</label>
                  <Input required placeholder="Nombre completo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500' }}>Teléfono</label>
                    <Input placeholder="+34..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500' }}>Edad</label>
                    <Input type="number" placeholder="Ej: 30" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500' }}>Correo electrónico</label>
                  <Input type="email" placeholder="correo@ejemplo.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>

                <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: formData.is_representative ? 'rgba(245, 158, 11, 0.1)' : 'var(--clr-bg-alt)', borderRadius: '12px', border: formData.is_representative ? '1px solid #f59e0b' : '1px solid var(--clr-border)', transition: 'all 0.2s' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: formData.is_representative ? '#f59e0b' : 'var(--clr-text)' }}>
                      <Crown size={18} />
                      <strong style={{ fontSize: '0.95rem' }}>Representante</strong>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>Esta persona será la imagen principal del piso.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, is_representative: !formData.is_representative})}
                    style={{ 
                      width: '44px', height: '24px', borderRadius: '12px', backgroundColor: formData.is_representative ? '#f59e0b' : 'var(--clr-border)', 
                      border: 'none', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s'
                    }}
                  >
                    <div style={{ 
                      position: 'absolute', top: '2px', left: formData.is_representative ? '22px' : '2px', 
                      width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', 
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' 
                    }} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: editingMember ? 'space-between' : 'flex-end' }}>
                  {editingMember && (
                    <Button type="button" variant="ghost" onClick={() => { closeModal(); setMemberToDelete(editingMember); }} style={{ color: '#ef4444' }}>
                      <Trash2 size={18} style={{ marginRight: '6px' }} /> Borrar
                    </Button>
                  )}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <Loader2 size={18} className="spin" /> : 'Guardar'}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Profile Layout */}
      {loading ? (
        <PageLoader message="Cargando perfil..." submessage="Obteniendo datos de la vivienda" />
      ) : (
        <div className="card" style={{ width: 'calc(100% - 32px)', maxWidth: '800px', margin: '40px auto', padding: '0', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', borderRadius: '16px', border: '1px solid var(--clr-border)' }}>
          {/* Cover & Avatar Header */}
        <div style={{ height: '140px', background: 'linear-gradient(135deg, var(--clr-primary) 0%, #6366f1 100%)', position: 'relative' }}>
          <div style={{
            position: 'absolute', bottom: '-40px', left: '32px', width: '80px', height: '80px',
            borderRadius: '50%', backgroundColor: 'var(--clr-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '4px solid var(--clr-bg)', overflow: 'hidden'
          }}>
            {representative && representative.photo_url ? (
              <img src={representative.photo_url} alt={representative.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: 'var(--clr-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold' }}>
                {representative ? representative.name.charAt(0).toUpperCase() : (user.name ? user.name.charAt(0).toUpperCase() : 'U')}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '48px 32px 32px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>
                  {representative ? representative.name : user.name}
                </h2>
                {representative && <Crown size={20} color="#f59e0b" />}
              </div>
              
              <div className="profile-meta-info">
                {user.isAdmin ? (
                  <Link to="/admin" style={{ textDecoration: 'none' }}>
                    <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.85rem' }}>
                      <Shield size={14} /> Panel de Administración
                    </span>
                  </Link>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                    <Shield size={16} /> Residente
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}><MapPin size={16} /> {communityName}</span>
                {representative && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', color: '#f59e0b', fontWeight: '500' }}>
                    Representante de {user.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--clr-border)', margin: '0 -32px 32px -32px' }} />

          {/* Household section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--clr-bg-alt)', borderRadius: '8px', color: 'var(--clr-primary)' }}><Users size={20} /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>Personas en la vivienda</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Portal {user.id}</p>
                </div>
              </div>
              <Button onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={18} /> Añadir</Button>
            </div>
            
            <div style={{ minHeight: '200px' }}>
              {members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--clr-bg-alt)', borderRadius: '12px', border: '2px dashed var(--clr-border)', color: 'var(--clr-text-muted)' }}>
                  <Home size={40} style={{ margin: '0 auto 16px auto', opacity: 0.3 }} />
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--clr-text)' }}>Tu vivienda está vacía</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Añade a las personas que conviven contigo.</p>
                </div>
              ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '24px', padding: '16px 0' }}>
                  {members.map(member => (
                    <div key={member.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', position: 'relative' }}>
                      <div 
                        onClick={() => openEditModal(member)}
                        style={{ 
                          width: '88px', height: '88px', borderRadius: '50%', backgroundColor: 'var(--clr-primary)', 
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: '32px', fontWeight: 'bold', overflow: 'hidden', cursor: 'pointer', 
                          border: member.is_representative ? '4px solid #f59e0b' : '3px solid var(--clr-bg)', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                        title="Editar perfil"
                      >
                        {member.photo_url ? (
                          <img src={member.photo_url} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          member.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      
                      {member.is_representative && (
                        <div style={{ position: 'absolute', top: '-8px', right: '0px', backgroundColor: '#f59e0b', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                          <Crown size={14} />
                        </div>
                      )}

                      <span style={{ fontSize: '0.95rem', fontWeight: '600', textAlign: 'center', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--clr-border)', margin: '32px -32px' }} />
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <Button variant="ghost" onClick={onLogout} style={{ color: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
              <LogOut size={18} /> Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default User;
