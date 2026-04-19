-- ============================================================
-- Whocare Hospital — PostgreSQL / Supabase
-- Complete fresh schema (unified users, no user_type in aux tables)
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
-- Users table (unified Thai + Foreign)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('thai', 'foreign')),

  -- Thai fields (filled when user_type = 'thai')
  title_th VARCHAR(20),
  first_name_th VARCHAR(100),
  last_name_th VARCHAR(100),
  thai_id VARCHAR(13),

  -- Foreign fields (filled when user_type = 'foreign')
  title_en VARCHAR(10),
  first_name_en VARCHAR(100),
  last_name_en VARCHAR(100),
  passport VARCHAR(20),
  nationality VARCHAR(100),

  -- Role
  role user_role DEFAULT 'patient',

  -- Common fields
  birth_date DATE,
  gender VARCHAR(20),
  blood_type VARCHAR(10),
  allergies VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_thai_id ON users (thai_id) WHERE thai_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_passport ON users (passport) WHERE passport IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- ============================================================
-- Refresh tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);

-- ============================================================
-- Audit logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_table VARCHAR(50),
  target_id INT,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);

-- ============================================================
-- Role permissions matrix
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

INSERT INTO role_permissions (role, module, can_read, can_create, can_update, can_delete) VALUES
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
('doctor', 'patients',     TRUE, FALSE, TRUE, FALSE),
('doctor', 'diagnosis',    TRUE, TRUE, TRUE, FALSE),
('doctor', 'prescriptions',TRUE, TRUE, TRUE, FALSE),
('doctor', 'appointments', TRUE, FALSE, FALSE, FALSE),
('nurse', 'patients',      TRUE, FALSE, TRUE, FALSE),
('nurse', 'diagnosis',     TRUE, FALSE, FALSE, FALSE),
('nurse', 'prescriptions', TRUE, FALSE, FALSE, FALSE),
('nurse', 'appointments',  TRUE, FALSE, TRUE, FALSE),
('reception', 'patients',     TRUE, TRUE, TRUE, FALSE),
('reception', 'appointments', TRUE, TRUE, TRUE, TRUE),
('accountant', 'billing',  TRUE, TRUE, TRUE, FALSE),
('accountant', 'reports',  TRUE, FALSE, FALSE, FALSE),
('accountant', 'patients', TRUE, FALSE, FALSE, FALSE),
('manager', 'reports',      TRUE, FALSE, FALSE, FALSE),
('manager', 'patients',     TRUE, FALSE, FALSE, FALSE),
('manager', 'billing',      TRUE, FALSE, FALSE, FALSE),
('manager', 'appointments', TRUE, FALSE, FALSE, FALSE),
('patient', 'appointments', TRUE, TRUE, FALSE, FALSE),
('patient', 'billing',      TRUE, FALSE, FALSE, FALSE)
ON CONFLICT (role, module) DO NOTHING;

-- ============================================================
-- Services
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  original_price DECIMAL(10,2) DEFAULT 0,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  category VARCHAR(100) DEFAULT 'general',
  branch VARCHAR(200) DEFAULT '',
  is_recommended BOOLEAN DEFAULT FALSE,
  is_promotion BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_by INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_category ON services (category);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services (is_active);

-- ============================================================
-- Doctor assignments & schedules
-- ============================================================
CREATE TABLE IF NOT EXISTS doctor_service_assignments (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (doctor_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_service_assignments_doctor ON doctor_service_assignments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_service_assignments_service ON doctor_service_assignments (service_id);

CREATE TABLE IF NOT EXISTS doctor_weekly_schedules (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (doctor_id, weekday),
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_doctor_weekly_schedules_doctor ON doctor_weekly_schedules (doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_weekly_schedules_weekday ON doctor_weekly_schedules (weekday);

-- ============================================================
-- Bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  booking_time VARCHAR(10) NOT NULL,
  branch VARCHAR(255),
  contact_name VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  note TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  doctor_id INT,
  reschedule_count INT DEFAULT 0,
  payment_method VARCHAR(30) DEFAULT 'balance',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_unique_slot
  ON bookings (service_id, booking_date, booking_time)
  WHERE status NOT IN ('cancelled');
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings (booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);

-- ============================================================
-- Booking locks (temporary hold while user is booking)
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_locks (
  id SERIAL PRIMARY KEY,
  service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  booking_time VARCHAR(10) NOT NULL,
  user_id INT NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (service_id, booking_date, booking_time)
);

CREATE INDEX IF NOT EXISTS idx_booking_locks_expires ON booking_locks (expires_at);

-- ============================================================
-- User balances (wallet)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_balances (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Balance transactions ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS balance_transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('deposit','payment','refund','withdraw','adjustment')),
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) DEFAULT 0,
  description TEXT,
  booking_id INT REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balance_tx_user ON balance_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_balance_tx_booking ON balance_transactions (booking_id);

-- ============================================================
-- Refund requests (multi-role approval)
-- ============================================================
CREATE TABLE IF NOT EXISTS refund_requests (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by_accountant INT,
  approved_at_accountant TIMESTAMPTZ,
  approved_by_reception INT,
  approved_at_reception TIMESTAMPTZ,
  approved_by_manager INT,
  approved_at_manager TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_booking ON refund_requests (booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_user ON refund_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests (status);

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
