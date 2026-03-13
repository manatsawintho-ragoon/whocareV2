-- ============================================================
-- Whocare Hospital — PostgreSQL / Supabase
-- ============================================================

-- ============================================================
-- Roles enum type
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin',
    'doctor',
    'nurse',
    'reception',
    'accountant',
    'manager',
    'patient'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Thai users table
-- ============================================================
CREATE TABLE IF NOT EXISTS users_th (
  id SERIAL PRIMARY KEY,
  title_th VARCHAR(20) NOT NULL,
  first_name_th VARCHAR(100) NOT NULL,
  last_name_th VARCHAR(100) NOT NULL,
  thai_id VARCHAR(13) NOT NULL UNIQUE,

  -- Role
  role user_role DEFAULT 'patient',

  -- Common fields
  birth_date DATE DEFAULT NULL,
  gender VARCHAR(20) DEFAULT NULL,
  blood_type VARCHAR(10) DEFAULT NULL,
  allergies VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_th_thai_id ON users_th (thai_id);
CREATE INDEX IF NOT EXISTS idx_users_th_email ON users_th (email);
CREATE INDEX IF NOT EXISTS idx_users_th_role ON users_th (role);

-- ============================================================
-- Foreign users table
-- ============================================================
CREATE TABLE IF NOT EXISTS users_foreign (
  id SERIAL PRIMARY KEY,
  title_en VARCHAR(10) NOT NULL,
  first_name_en VARCHAR(100) NOT NULL,
  last_name_en VARCHAR(100) NOT NULL,
  passport VARCHAR(20) NOT NULL UNIQUE,
  nationality VARCHAR(100) DEFAULT NULL,

  -- Role
  role user_role DEFAULT 'patient',

  -- Common fields
  birth_date DATE DEFAULT NULL,
  gender VARCHAR(20) DEFAULT NULL,
  blood_type VARCHAR(10) DEFAULT NULL,
  allergies VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_foreign_passport ON users_foreign (passport);
CREATE INDEX IF NOT EXISTS idx_users_foreign_email ON users_foreign (email);
CREATE INDEX IF NOT EXISTS idx_users_foreign_role ON users_foreign (role);

-- ============================================================
-- Refresh tokens table (user_type distinguishes which table)
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('thai', 'foreign')),
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_type ON refresh_tokens (user_type);

-- ============================================================
-- Audit log table (tracks role changes and important actions)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id INT NOT NULL,
  actor_type VARCHAR(10) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_table VARCHAR(50),
  target_id INT,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id, actor_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);

-- ============================================================
-- Permissions matrix table
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  module VARCHAR(50) NOT NULL,
  can_read BOOLEAN DEFAULT FALSE,
  can_create BOOLEAN DEFAULT FALSE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, module)
);

-- Insert default permissions
INSERT INTO role_permissions (role, module, can_read, can_create, can_update, can_delete) VALUES
-- Super Admin: full access to everything
('super_admin', 'users',        TRUE, TRUE, TRUE, TRUE),
('super_admin', 'patients',     TRUE, TRUE, TRUE, TRUE),
('super_admin', 'diagnosis',    TRUE, TRUE, TRUE, TRUE),
('super_admin', 'prescriptions',TRUE, TRUE, TRUE, TRUE),
('super_admin', 'appointments', TRUE, TRUE, TRUE, TRUE),
('super_admin', 'billing',      TRUE, TRUE, TRUE, TRUE),
('super_admin', 'reports',      TRUE, TRUE, TRUE, TRUE),
('super_admin', 'settings',     TRUE, TRUE, TRUE, TRUE),
('super_admin', 'audit_logs',   TRUE, FALSE, FALSE, FALSE),
('super_admin', 'permissions',  TRUE, TRUE, TRUE, TRUE),

-- Doctor
('doctor', 'patients',     TRUE, FALSE, TRUE, FALSE),
('doctor', 'diagnosis',    TRUE, TRUE, TRUE, FALSE),
('doctor', 'prescriptions',TRUE, TRUE, TRUE, FALSE),
('doctor', 'appointments', TRUE, FALSE, FALSE, FALSE),
('doctor', 'reports',      FALSE, FALSE, FALSE, FALSE),

-- Nurse
('nurse', 'patients',      TRUE, FALSE, TRUE, FALSE),
('nurse', 'diagnosis',     TRUE, FALSE, FALSE, FALSE),
('nurse', 'prescriptions', TRUE, FALSE, FALSE, FALSE),
('nurse', 'appointments',  TRUE, FALSE, TRUE, FALSE),

-- Reception
('reception', 'patients',     TRUE, TRUE, TRUE, FALSE),
('reception', 'appointments', TRUE, TRUE, TRUE, TRUE),
('reception', 'diagnosis',    FALSE, FALSE, FALSE, FALSE),

-- Accountant
('accountant', 'billing',  TRUE, TRUE, TRUE, FALSE),
('accountant', 'reports',  TRUE, FALSE, FALSE, FALSE),
('accountant', 'patients', TRUE, FALSE, FALSE, FALSE),

-- Manager
('manager', 'reports',      TRUE, FALSE, FALSE, FALSE),
('manager', 'patients',     TRUE, FALSE, FALSE, FALSE),
('manager', 'billing',      TRUE, FALSE, FALSE, FALSE),
('manager', 'appointments', TRUE, FALSE, FALSE, FALSE),

-- Patient
('patient', 'appointments', TRUE, TRUE, FALSE, FALSE),
('patient', 'billing',      TRUE, FALSE, FALSE, FALSE)
ON CONFLICT (role, module) DO NOTHING;

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_th_updated_at ON users_th;
CREATE TRIGGER trg_users_th_updated_at
  BEFORE UPDATE ON users_th
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_users_foreign_updated_at ON users_foreign;
CREATE TRIGGER trg_users_foreign_updated_at
  BEFORE UPDATE ON users_foreign
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
