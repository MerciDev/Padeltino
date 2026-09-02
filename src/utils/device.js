export const getClientIp = async () => {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch (err) {
    console.error('Error obteniendo IP:', err);
    return 'Desconocida';
  }
};

export const getLocalDeviceId = () => {
  let deviceId = localStorage.getItem('padeltino_device_id');
  if (!deviceId) {
    // Generate a random ID to fingerprint this browser installation
    deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('padeltino_device_id', deviceId);
  }
  return deviceId;
};
