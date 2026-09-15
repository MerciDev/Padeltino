import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReservationById, getCommunities, removeReservationById, toggleReservationOpen, getReservationPlayers, addReservationPlayer, removeReservationPlayer, getHouseholdMembers, joinOpenReservation } from '../store/api';
import { getLocalDateString } from '../utils/date';
import PageLoader from '../components/PageLoader';
import Button from '../components/Button';
import { useAlert } from '../components/AlertContext';
import { ArrowLeft, Calendar, Clock, MapPin, Trash2, Loader2, Users, UserPlus, X, Copy, Check } from 'lucide-react';

const ReservationDetail = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  
  const [reservation, setReservation] = useState(null);
  const [community, setCommunity] = useState(null);
  const [court, setCourt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Players state
  const [players, setPlayers] = useState([]);
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [resData, commsData, playersData, houseData] = await Promise.all([
        getReservationById(id),
        getCommunities(),
        getReservationPlayers(id),
        getHouseholdMembers(user.id)
      ]);

      if (resData) {
        setReservation(resData);
        setPlayers(playersData || []);
        setHouseholdMembers(houseData || []);
        
        const comm = commsData.find(c => c.id === resData.communityId);
        if (comm) {
          setCommunity(comm);
          const crt = comm.courts?.find(c => c.id === resData.courtId);
          if (crt) setCourt(crt);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [id, user.id]);

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleCancel = async () => {
    setCancelling(true);
    const success = await removeReservationById(id);
    if (success) {
      showAlert('Reserva cancelada correctamente.', 'success');
      navigate('/dashboard');
    } else {
      showAlert('Hubo un error al cancelar la reserva.', 'error');
      setCancelling(false);
      setShowConfirm(false);
    }
  };

  const handleCopyCode = () => {
    if (!reservation.inviteCode) return;
    navigator.clipboard.writeText(reservation.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddHouseholdMember = async (member) => {
    const success = await addReservationPlayer(id, member.name, null, member.id, false);
    if (success) {
      setPlayers([...players, { id: Date.now(), reservationId: id, playerName: member.name, householdMemberId: member.id, isOwner: false }]);
      setShowAddPlayer(false);
    } else {
      showAlert('Error al añadir jugador', 'error');
    }
  };

  const handleRemovePlayer = async (playerId) => {
    const success = await removeReservationPlayer(playerId);
    if (success) {
      setPlayers(players.filter(p => p.id !== playerId));
    } else {
      showAlert('Error al eliminar jugador', 'error');
    }
  };

  const handleJoinOpenMatch = async () => {
    setJoining(true);
    const result = await joinOpenReservation(id, user.id, user.name);
    if (result.success) {
      setPlayers([...players, { id: Date.now(), reservationId: id, playerName: user.name, userId: user.id, isOwner: false }]);
      showAlert('¡Te has unida al partido!', 'success');
    } else {
      showAlert(result.error || 'Error al unirse', 'error');
    }
    setJoining(false);
  };

  const handleToggleOpen = async () => {
    setTogglingOpen(true);
    const newState = !reservation.isOpen;
    const success = await toggleReservationOpen(id, newState);
    if (success) {
      setReservation({ ...reservation, isOpen: newState });
      showAlert(newState ? 'El partido ahora es público' : 'El partido vuelve a ser privado', 'success');
    } else {
      showAlert('Error al actualizar el estado del partido', 'error');
    }
    setTogglingOpen(false);
  };

  if (loading) {
    return <PageLoader message="Cargando reserva..." submessage="Obteniendo detalles de la pista" />;
  }

  if (!reservation) {
    return (
      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--clr-primary)', fontWeight: '500' }}>
            <ArrowLeft size={20} style={{ marginRight: '4px' }} /> Volver
          </button>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <div className="empty-state-title">Reserva no encontrada</div>
          <div className="empty-state-text">Esta reserva no existe o ya ha sido eliminada.</div>
        </div>
      </div>
    );
  }

  const today = getLocalDateString();
  const isUpcoming = reservation.date >= today;
  const canCancel = isUpcoming && (user.id === reservation.userId || user.isAdmin);

  return (
    <div className="page-container">
      {/* Confirm Modal */}
      {showConfirm && (
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
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem' }}>Cancelar Reserva</h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--clr-text-muted)' }}>
              Estás a punto de cancelar tu reserva para el {formatDate(reservation.date)} a las {reservation.timeSlot}. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Button type="button" variant="ghost" onClick={() => setShowConfirm(false)} disabled={cancelling}>Volver</Button>
              <Button onClick={handleCancel} disabled={cancelling} style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}>
                {cancelling ? <Loader2 size={18} className="spin" /> : 'Sí, cancelar reserva'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--clr-primary)', fontWeight: '500' }}>
          <ArrowLeft size={20} style={{ marginRight: '4px' }} /> Volver al panel
        </button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--clr-border)', boxShadow: '0 12px 24px rgba(0,0,0,0.05)' }}>
        
        {/* Ticket Header */}
        <div style={{ background: 'linear-gradient(135deg, var(--clr-primary) 0%, #6366f1 100%)', padding: '32px 24px', color: 'white', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <span style={{ backgroundColor: isUpcoming ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: '600' }}>
                  {isUpcoming ? 'Próximo Partido' : 'Partido Finalizado'}
                </span>
                {reservation.isOpen && (
                  <span style={{ backgroundColor: '#22c55e', color: 'white', padding: '4px 10px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: '600' }}>
                    Abierto
                  </span>
                )}
              </div>
              <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: '700' }}>{court ? court.name : 'Pista Desconocida'}</h1>
              <p style={{ margin: 0, opacity: 0.9, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} /> {community ? community.name : 'Urbanización'}
              </p>
            </div>
          </div>
        </div>

        {/* Ticket Body */}
        <div style={{ padding: '32px 24px', backgroundColor: 'var(--clr-bg)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--clr-bg-alt)', borderRadius: '12px', color: 'var(--clr-primary)' }}>
                <Calendar size={24} />
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Fecha</p>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>{formatDate(reservation.date)}</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--clr-bg-alt)', borderRadius: '12px', color: 'var(--clr-primary)' }}>
                <Clock size={24} />
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Horario</p>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>{reservation.timeSlot}</p>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed var(--clr-border)', margin: '0 0 24px 0' }} />

          {/* Jugadores */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--clr-primary)" /> Jugadores ({players.length}/4)
              </p>
              {canCancel && reservation.inviteCode && (
                <Button variant="ghost" onClick={handleCopyCode} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  {copiedCode ? <Check size={16} /> : <Copy size={16} />} {copiedCode ? 'Copiado' : `Código: ${reservation.inviteCode}`}
                </Button>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...Array(4)].map((_, i) => {
                const player = players[i];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--clr-bg-alt)', borderRadius: '8px', border: '1px solid var(--clr-border)' }}>
                    {player ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--clr-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {player.playerName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: '500' }}>{player.playerName} {player.isOwner && '(Creador)'}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.5 }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--clr-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <UserPlus size={16} />
                        </div>
                        <span style={{ fontStyle: 'italic' }}>Hueco libre</span>
                      </div>
                    )}
                    
                    {/* Acciones para el slot */}
                    {player ? (
                      canCancel && !player.isOwner && (
                        <button onClick={() => handleRemovePlayer(player.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                          <X size={16} />
                        </button>
                      )
                    ) : (
                      canCancel ? (
                        <Button variant="secondary" onClick={() => setShowAddPlayer(true)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                          Añadir
                        </Button>
                      ) : (
                        reservation.isOpen && !players.some(p => p.userId === user.id) ? (
                          <Button onClick={handleJoinOpenMatch} disabled={joining} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                            {joining ? <Loader2 size={16} className="spin" /> : 'Unirme'}
                          </Button>
                        ) : null
                      )
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selector de familiares para añadir */}
            {showAddPlayer && (
              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--clr-bg)', border: '1px solid var(--clr-border)', borderRadius: '12px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>Añadir de tu vivienda</h4>
                {householdMembers.length > 0 ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {householdMembers.filter(hm => !players.some(p => p.householdMemberId === hm.id)).map(hm => (
                      <Button key={hm.id} variant="secondary" onClick={() => handleAddHouseholdMember(hm)} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                        + {hm.name}
                      </Button>
                    ))}
                    {householdMembers.filter(hm => !players.some(p => p.householdMemberId === hm.id)).length === 0 && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Todos los miembros ya están en el partido.</span>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>No tienes a nadie añadido a tu vivienda. (Añádelos en Mi Perfil)</span>
                )}
                <div style={{ marginTop: '12px', textAlign: 'right' }}>
                  <Button variant="ghost" onClick={() => setShowAddPlayer(false)} style={{ fontSize: '0.85rem', padding: '4px 8px' }}>Cerrar</Button>
                </div>
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed var(--clr-border)', margin: '0 0 32px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Reservado por</p>
              <p style={{ margin: 0, fontWeight: '600' }}>{reservation.userName}</p>
            </div>
            
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              {canCancel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.9rem', color: reservation.isOpen ? '#22c55e' : 'var(--clr-text-muted)', fontWeight: '500' }}>
                    {reservation.isOpen ? 'Partido Abierto' : 'Partido Privado'}
                  </span>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={reservation.isOpen || false} 
                      onChange={handleToggleOpen}
                      disabled={togglingOpen}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  {togglingOpen && <Loader2 size={16} className="spin" style={{ color: 'var(--clr-primary)' }} />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {canCancel && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
          <Button onClick={() => setShowConfirm(true)} variant="ghost" style={{ color: '#ef4444', borderColor: '#ef4444', padding: '12px 24px' }}>
            <Trash2 size={18} style={{ marginRight: '8px' }} /> Cancelar Reserva
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReservationDetail;
