const url = "https://hcqiuytvrsvcbaltfvrd.supabase.co/rest/v1/users";
const key = "sb_publishable_uScMeq5M7i5SvGOIRJPr1Q_3ZNpa4cO";

fetch(url, {
  method: 'POST',
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=ignore-duplicates'
  },
  body: JSON.stringify({
    id: 'SYSTEM_UNLOCKED',
    name: 'Desbloqueo Manual',
    community_id: null,
    is_admin: false
  })
}).then(res => res.text()).then(console.log).catch(console.error);
