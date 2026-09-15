import { supabase } from '../lib/supabase';

export const hashPassword = async (password) => {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const getCommunities = async () => {
  const { data: communities, error: commError } = await supabase.from('communities').select('*');
  if (commError) {
    console.error('Error fetching communities:', commError);
    return [];
  }
  
  const { data: courts, error: courtsError } = await supabase.from('courts').select('*');
  if (courtsError) {
    console.error('Error fetching courts:', courtsError);
    return communities.map(c => ({ ...c, courts: [] }));
  }

  return communities.map(c => ({
    ...c,
    loginConfig: c.login_config,
    courts: courts.filter(court => court.community_id === c.id).map(court => ({
      id: court.id,
      name: court.name,
      color: court.color,
      config: court.config
    }))
  }));
};

export const getUser = async (id) => {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  if (error || !data) {
    if (error) console.error('Error fetching user:', error);
    return null;
  }
  return {
    id: data.id,
    name: data.name,
    communityId: data.community_id,
    isAdmin: data.is_admin,
    password: data.password, // Return password for verification
    isVerified: data.is_verified,
    permissions: data.permissions || {}
  };
};

export const ensureUserExists = async (id, name, communityId, isAdmin) => {
  // First check if user exists
  const { data } = await supabase.from('users').select('id').eq('id', id).maybeSingle();
  if (data) return; // Already exists, do nothing

  // If not, create them unverified
  const { error } = await supabase.from('users').insert([{ 
    id, 
    name, 
    community_id: communityId, 
    is_admin: isAdmin,
    is_verified: false 
  }]);
  
  if (error) {
    console.error('Error ensuring user exists:', error);
  }
};

export const verifyUser = async (userId, allowedDeviceId = null) => {
  const updateData = { is_verified: true };
  if (allowedDeviceId) {
    updateData.allowed_device_id = allowedDeviceId;
  }
  
  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId);
  return !error;
};

export const getCommunityUsers = async (communityId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('community_id', communityId);
    
  if (error) {
    console.error('Error fetching community users:', error);
    return [];
  }
  return data.map(user => ({
    id: user.id,
    name: user.name,
    isVerified: user.is_verified,
    hasPassword: !!user.password
  }));
};

export const getAdmins = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_admin', true);
  if (error) {
    console.error('Error fetching admins:', error);
    return [];
  }
  return data.map(admin => ({
    id: admin.id,
    name: admin.name,
    permissions: admin.permissions || {}
  }));
};

export const createAdmin = async (id, name, password, permissions = {}) => {
  const hashedPassword = await hashPassword(password);
  
  const { error } = await supabase.from('users').insert([{
    id,
    name,
    is_admin: true,
    is_verified: true,
    password: hashedPassword,
    permissions
  }]);
  
  if (error) {
    console.error('Error creating admin:', error);
    return false;
  }
  return true;
};

export const deleteAdmin = async (id) => {
  if (id === 'admin') return false; // Prevent deleting the root admin
  
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id)
    .eq('is_admin', true);
    
  if (error) {
    console.error('Error deleting admin:', error);
    return false;
  }
  return true;
};

export const updateAdminPermissions = async (id, permissions) => {
  if (id === 'admin') return false; // El admin root no debe tener restricciones
  
  const { error } = await supabase
    .from('users')
    .update({ permissions })
    .eq('id', id)
    .eq('is_admin', true);
    
  if (error) {
    console.error('Error updating admin permissions:', error);
    return false;
  }
  return true;
};

export const logLogin = async (userId, userName, communityId, deviceInfo, ipAddress, deviceId) => {
  const { error } = await supabase.from('login_logs').insert([
    {
      user_id: userId,
      user_name: userName,
      community_id: communityId,
      device_info: deviceInfo,
      ip_address: ipAddress,
      device_id: deviceId
    }
  ]);
  if (error) {
    console.error('Error logging login:', error);
    return false;
  }
  return true;
};

export const getLoginLogs = async (communityId, date, page = 1, pageSize = 10) => {
  const fromOffset = (page - 1) * pageSize;
  const toOffset = fromOffset + pageSize - 1;

  let query = supabase
    .from('login_logs')
    .select('*', { count: 'exact' })
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .range(fromOffset, toOffset);

  if (date) {
    const nextDay = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    query = query.gte('created_at', date).lt('created_at', nextDay);
  }

  const { data, count, error } = await query;
    
  if (error) {
    console.error('Error fetching login logs:', error);
    return { data: [], count: 0 };
  }
  return {
    count: count || 0,
    data: data.map(log => ({
      id: log.id,
      userId: log.user_id,
      userName: log.user_name,
      communityId: log.community_id,
      deviceInfo: log.device_info,
      ipAddress: log.ip_address,
      deviceId: log.device_id,
      createdAt: log.created_at
    }))
  };
};

export const getLoginLogsByMonthRange = async (communityId, start, end) => {
  const { data, error } = await supabase
    .from('login_logs')
    .select('created_at, user_id')
    .eq('community_id', communityId)
    .gte('created_at', start)
    .lt('created_at', end);
    
  if (error) {
    console.error('Error fetching month logs:', error);
    return [];
  }
  return data;
};

export const updateUserPassword = async (userId, newPassword) => {
  const hashedPassword = await hashPassword(newPassword);
  
  const { error } = await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('id', userId);
  
  if (error) {
    console.error('Error updating password:', error);
    return false;
  }
  return true;
};

export const getReservationsByDate = async (date) => {
  const { data, error } = await supabase.from('reservations').select('*').eq('date', date);
  if (error) {
    console.error('Error fetching reservations:', error);
    return [];
  }
  return data.map(r => ({
    id: r.id,
    date: r.date,
    communityId: r.community_id,
    courtId: r.court_id,
    timeSlot: r.time_slot,
    userId: r.user_id,
    userName: r.user_name,
    isOpen: r.is_open,
    inviteCode: r.invite_code
  }));
};

export const getReservationsByMonthRange = async (startDate, endDate) => {
  const { data, error } = await supabase.from('reservations').select('*').gte('date', startDate).lte('date', endDate);
  if (error) {
    console.error('Error fetching month reservations:', error);
    return [];
  }
  return data.map(r => ({
    id: r.id,
    date: r.date,
    communityId: r.community_id,
    courtId: r.court_id,
    timeSlot: r.time_slot,
    userId: r.user_id,
    userName: r.user_name,
    isOpen: r.is_open,
    inviteCode: r.invite_code
  }));
};

export const getReservationById = async (id) => {
  const { data, error } = await supabase.from('reservations').select('*').eq('id', id).single();
  if (error) return null;
  return {
    id: data.id,
    date: data.date,
    communityId: data.community_id,
    courtId: data.court_id,
    timeSlot: data.time_slot,
    userId: data.user_id,
    userName: data.user_name,
    isOpen: data.is_open,
    inviteCode: data.invite_code
  };
};

export const removeReservationById = async (id) => {
  const { error } = await supabase.from('reservations').delete().match({ id });
  if (error) {
    console.error('Remove reservation error:', error);
    return false;
  }
  return true;
};

export const getUserReservations = async (userId) => {
  const { data, error } = await supabase.from('reservations').select('*').eq('user_id', userId);
  if (error) return [];
  return data.map(r => ({
    id: r.id,
    date: r.date,
    communityId: r.community_id,
    courtId: r.court_id,
    timeSlot: r.time_slot,
    userId: r.user_id,
    userName: r.user_name,
    isOpen: r.is_open,
    inviteCode: r.invite_code
  }));
};

export const getAllReservations = async () => {
  const { data, error } = await supabase.from('reservations').select('*');
  if (error) return [];
  return data.map(r => ({
    id: r.id,
    date: r.date,
    communityId: r.community_id,
    courtId: r.court_id,
    timeSlot: r.time_slot,
    userId: r.user_id,
    userName: r.user_name,
    isOpen: r.is_open,
    inviteCode: r.invite_code
  }));
};

export const addReservation = async (date, communityId, courtId, timeSlot, userId, userName) => {
  // Generate random 6 character code
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const { data, error } = await supabase.from('reservations').insert([
    {
      date,
      community_id: communityId,
      court_id: courtId,
      time_slot: timeSlot,
      user_id: userId,
      user_name: userName,
      is_open: false,
      invite_code: inviteCode
    }
  ]).select();
  
  if (error || !data || data.length === 0) {
    console.error('Add reservation error:', error);
    return false;
  }
  
  // Add creator as owner in reservation_players
  const newRes = data[0];
  await supabase.from('reservation_players').insert([
    {
      reservation_id: newRes.id,
      player_name: userName,
      user_id: userId,
      is_owner: true
    }
  ]);
  
  return true;
};

export const removeReservation = async (date, communityId, courtId, timeSlot) => {
  const { error } = await supabase
    .from('reservations')
    .delete()
    .match({ date, community_id: communityId, court_id: courtId, time_slot: timeSlot });
    
  if (error) {
    console.error('Remove reservation error:', error);
    return false;
  }
  return true;
};

export const updateReservation = async (date, communityId, courtId, timeSlot, newUserName) => {
  const { error } = await supabase
    .from('reservations')
    .update({ user_name: newUserName })
    .match({ date, community_id: communityId, court_id: courtId, time_slot: timeSlot });
    
  if (error) {
    console.error('Update reservation error:', error);
    return false;
  }
  return true;
};

export const toggleReservationOpen = async (id, isOpen) => {
  const { error } = await supabase
    .from('reservations')
    .update({ is_open: isOpen })
    .match({ id });
    
  if (error) {
    console.error('Toggle reservation open error:', error);
    return false;
  }
  return true;
};

export const updateCommunityInfo = async (id, name, address, loginConfig) => {
  const updateData = { name, address };
  if (loginConfig !== undefined) updateData.login_config = loginConfig;
  
  const { error } = await supabase
    .from('communities')
    .update(updateData)
    .eq('id', id);
  return !error;
};

export const updateCourtConfig = async (id, name, color, config) => {
  const { error } = await supabase
    .from('courts')
    .update({ name, color, config })
    .eq('id', id);
  return !error;
};

export const addCourt = async (communityId, name, color, config) => {
  const { error } = await supabase
    .from('courts')
    .insert([{ community_id: communityId, name, color, config }]);
  return !error;
};

export const removeCourt = async (courtId) => {
  const { error } = await supabase
    .from('courts')
    .delete()
    .eq('id', courtId);
  return !error;
};

export const createCommunity = async (comm) => {
  const { error } = await supabase
    .from('communities')
    .insert([{ name: comm.name, address: comm.address || 'Sin dirección' }]);
  return !error;
};

// --- Household Members ---
export const getHouseholdMembers = async (userId) => {
  const { data, error } = await supabase
    .from('household_members')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Error fetching household members:', error);
    return [];
  }
  return data;
};

export const addHouseholdMember = async (userId, memberData) => {
  if (memberData.is_representative) {
    await supabase.from('household_members').update({ is_representative: false }).eq('user_id', userId);
  }

  const { data, error } = await supabase
    .from('household_members')
    .insert([{ 
      user_id: userId, 
      name: memberData.name,
      email: memberData.email || null,
      phone: memberData.phone || null,
      age: memberData.age ? parseInt(memberData.age, 10) : null,
      photo_url: memberData.photo_url || null,
      is_representative: memberData.is_representative || false
    }])
    .select()
    .single();
    
  if (error) {
    console.error('Error adding household member:', error);
    return null;
  }
  return data;
};

export const updateHouseholdMember = async (userId, id, memberData) => {
  if (memberData.is_representative) {
    await supabase.from('household_members').update({ is_representative: false }).eq('user_id', userId);
  }

  const { data, error } = await supabase
    .from('household_members')
    .update({ 
      name: memberData.name,
      email: memberData.email || null,
      phone: memberData.phone || null,
      age: memberData.age ? parseInt(memberData.age, 10) : null,
      photo_url: memberData.photo_url || null,
      is_representative: memberData.is_representative || false
    })
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating household member:', error);
    return null;
  }
  return data;
};

export const removeHouseholdMember = async (id, photoUrl = null) => {
  // If there's a photo, delete it from storage first
  if (photoUrl) {
    await deleteAvatar(photoUrl);
  }

  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error removing household member:', error);
    return false;
  }
  return true;
};

// --- Storage ---
export const uploadAvatar = async (file) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError);
    return null;
  }

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const deleteAvatar = async (url) => {
  if (!url) return;
  try {
    // Extract file path from public URL
    const urlParts = url.split('/avatars/');
    if (urlParts.length > 1) {
      const filePath = urlParts[1].split('?')[0]; // Remove query params if any
      const { error } = await supabase.storage.from('avatars').remove([filePath]);
      if (error) console.error('Error deleting avatar from storage:', error);
    }
  } catch (error) {
    console.error('Error in deleteAvatar:', error);
  }
};

// --- Utils ---
export const parseTime = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export const formatTime = (mins) => {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const generateTimeSlots = (config) => {
  if (!config) return [];
  const slots = [];
  
  const addSlots = (start, end, interval) => {
    let current = parseTime(start);
    const limit = parseTime(end);
    const intv = interval || 90;
    
    while (current + intv <= limit) {
      const next = current + intv;
      slots.push(`${formatTime(current)} - ${formatTime(next)}`);
      current = next;
    }
  };

  if (config.schedules && Array.isArray(config.schedules)) {
    config.schedules.forEach(sched => {
      if (sched.start && sched.end) addSlots(sched.start, sched.end, sched.intervalMinutes);
    });
  }
  return slots;
};

// --- Player Management ---
export const getReservationPlayers = async (reservationId) => {
  const { data, error } = await supabase.from('reservation_players').select('*').eq('reservation_id', reservationId).order('joined_at', { ascending: true });
  if (error) return [];
  return data.map(p => ({
    id: p.id,
    reservationId: p.reservation_id,
    playerName: p.player_name,
    userId: p.user_id,
    householdMemberId: p.household_member_id,
    isOwner: p.is_owner,
    joinedAt: p.joined_at
  }));
};

export const addReservationPlayer = async (reservationId, playerName, userId = null, householdMemberId = null, isOwner = false) => {
  const { error } = await supabase.from('reservation_players').insert([
    {
      reservation_id: reservationId,
      player_name: playerName,
      user_id: userId,
      household_member_id: householdMemberId,
      is_owner: isOwner
    }
  ]);
  
  if (error) {
    console.error('Error adding player:', error);
    return false;
  }
  return true;
};

export const removeReservationPlayer = async (playerId) => {
  const { error } = await supabase.from('reservation_players').delete().eq('id', playerId);
  if (error) {
    console.error('Error removing player:', error);
    return false;
  }
  return true;
};

export const joinReservationByCode = async (inviteCode, userId, playerName) => {
  // First find the reservation
  const { data: res, error: resError } = await supabase.from('reservations').select('id, is_open').eq('invite_code', inviteCode).single();
  if (resError || !res) return { success: false, error: 'Código inválido o reserva no encontrada' };
  
  // Then get current players count
  const { count, error: countError } = await supabase.from('reservation_players').select('*', { count: 'exact', head: true }).eq('reservation_id', res.id);
  
  if (countError) return { success: false, error: 'Error al verificar la reserva' };
  if (count >= 4) return { success: false, error: 'El partido ya está completo (4/4)' };
  
  // Join
  const success = await addReservationPlayer(res.id, playerName, userId, null, false);
  if (success) {
    return { success: true, reservationId: res.id };
  }
  return { success: false, error: 'Ya estás en este partido o hubo un error al unirte' };
};

export const joinOpenReservation = async (reservationId, userId, playerName) => {
  const { count, error: countError } = await supabase.from('reservation_players').select('*', { count: 'exact', head: true }).eq('reservation_id', reservationId);
  if (countError || count >= 4) return { success: false, error: 'El partido está completo' };
  
  const success = await addReservationPlayer(reservationId, playerName, userId, null, false);
  return { success, error: success ? null : 'No se pudo unirte al partido' };
};


export const getOpenReservations = async (communityId) => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase.from('reservations').select('*').eq('community_id', communityId).eq('is_open', true).gte('date', today);
  if (error) return [];
  return data.map(r => ({
    id: r.id,
    date: r.date,
    communityId: r.community_id,
    courtId: r.court_id,
    timeSlot: r.time_slot,
    userId: r.user_id,
    userName: r.user_name,
    isOpen: r.is_open,
    inviteCode: r.invite_code
  }));
};

