-- 1. Tabla de Usuarios (Custom Profiles)
CREATE TABLE users (
  id text PRIMARY KEY,
  name text NOT NULL,
  community_id integer,
  is_admin boolean DEFAULT false,
  is_verified boolean DEFAULT false
);

-- 2. Tabla de Urbanizaciones
CREATE TABLE communities (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL,
  address text NOT NULL
);

-- Relacionar users con communities ahora que communities existe
ALTER TABLE users ADD CONSTRAINT fk_user_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE SET NULL;

-- 2.1 Configuración de acceso visual para comunidades
ALTER TABLE communities ADD COLUMN login_config jsonb DEFAULT '{"portals": 14, "floors": ["b", "1", "2"], "doors": ["a", "b"], "exceptions": []}'::jsonb;

-- 2.2 Tabla de Logs de Acceso
CREATE TABLE login_logs (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id text NOT NULL,
  user_name text NOT NULL,
  community_id integer REFERENCES communities(id) ON DELETE CASCADE,
  device_info text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Tabla de Pistas (Courts)
CREATE TABLE courts (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  community_id integer REFERENCES communities(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  config jsonb DEFAULT '{}'::jsonb
);

-- 4. Tabla de Reservas
CREATE TABLE reservations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  date text NOT NULL,
  community_id integer REFERENCES communities(id) ON DELETE CASCADE,
  court_id integer REFERENCES courts(id) ON DELETE CASCADE,
  time_slot text NOT NULL,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  CONSTRAINT unique_booking UNIQUE (date, court_id, time_slot)
);

-- Insertar Datos Iniciales por defecto (los mocks que teníamos)
INSERT INTO communities (name, address) VALUES ('Residencial Los Pinos', 'Calle del Padel 123');

INSERT INTO courts (community_id, name, color, config) VALUES 
(1, 'Pista Central', '#3b82f6', '{"schedules": [{"end": "14:30", "start": "09:00", "intervalMinutes": 90}, {"end": "22:00", "start": "17:00", "intervalMinutes": 90}]}'),
(1, 'Pista Secundaria', '#10b981', '{"schedules": [{"end": "14:00", "start": "10:00", "intervalMinutes": 60}, {"end": "22:00", "start": "16:00", "intervalMinutes": 60}]}');

INSERT INTO users (id, name, community_id, is_admin) VALUES 
('admin', 'Administrador Global', NULL, true),
('p1_ba', 'Bajo A', 1, false),
('p1_1a', '1º A', 1, false);

-- 5. Añadir columna de password cifrada
ALTER TABLE users ADD COLUMN password text;

-- 3. Quitar contraseña por defecto (para obligar a validación de is_verified)
ALTER TABLE users ALTER COLUMN password DROP DEFAULT;

-- 4. Actualizar tabla login_logs y users para bloqueo de dispositivos
ALTER TABLE login_logs ADD COLUMN ip_address text;
ALTER TABLE login_logs ADD COLUMN device_id text;
ALTER TABLE users ADD COLUMN allowed_device_id text;

-- Insertar la password para los usuarios por defecto (en especial admin)
UPDATE users SET password = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' WHERE id = 'admin';
-- Poner is_verified = true para los usuarios por defecto
UPDATE users SET is_verified = true;
