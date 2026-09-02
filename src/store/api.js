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
    isVerified: data.is_verified
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

export const verifyUser = async (userId) => {
  const { error } = await supabase
    .from('users')
    .update({ is_verified: true })
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

export const logLogin = async (userId, userName, communityId, deviceInfo) => {
  const { error } = await supabase.from('login_logs').insert([
    {
      user_id: userId,
      user_name: userName,
      community_id: communityId,
      device_info: deviceInfo
    }
  ]);
  if (error) {
    console.error('Error logging login:', error);
    return false;
  }
  return true;
};

export const getLoginLogs = async (communityId, limit = 50) => {
  const { data, error } = await supabase
    .from('login_logs')
    .select('*')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) {
    console.error('Error fetching login logs:', error);
    return [];
  }
  return data.map(log => ({
    id: log.id,
    userId: log.user_id,
    userName: log.user_name,
    communityId: log.community_id,
    deviceInfo: log.device_info,
    createdAt: log.created_at
  }));
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
    userName: r.user_name
  }));
};

export const getReservationsByMonthRange = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error('Error fetching monthly reservations:', error);
    return [];
  }
  return data.map(r => ({
    id: r.id,
    date: r.date,
    communityId: r.community_id,
    courtId: r.court_id,
    timeSlot: r.time_slot,
    userId: r.user_id,
    userName: r.user_name
  }));
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
    userName: r.user_name
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
    userName: r.user_name
  }));
};

export const addReservation = async (date, communityId, courtId, timeSlot, userId, userName) => {
  const { data, error } = await supabase.from('reservations').insert([
    {
      date,
      community_id: communityId,
      court_id: courtId,
      time_slot: timeSlot,
      user_id: userId,
      user_name: userName
    }
  ]);
  
  if (error) {
    console.error('Add reservation error:', error);
    return false;
  }
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
