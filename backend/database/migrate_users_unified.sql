-- ============================================================
-- Fresh Migration: Drop ALL old tables + recreate from scratch
-- WARNING: This will DELETE ALL existing data!
-- Run this when you want a completely fresh database.
-- ============================================================

-- Drop all tables (order matters due to foreign keys)
DROP TABLE IF EXISTS refund_requests CASCADE;
DROP TABLE IF EXISTS balance_transactions CASCADE;
DROP TABLE IF EXISTS user_balances CASCADE;
DROP TABLE IF EXISTS booking_locks CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop old/unused tables
DROP TABLE IF EXISTS users_th CASCADE;
DROP TABLE IF EXISTS users_foreign CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;
DROP TABLE IF EXISTS "servicesOnHospital" CASCADE;
DROP TABLE IF EXISTS servicesonhospital CASCADE;

-- Drop old enum type and recreate
DROP TYPE IF EXISTS user_role CASCADE;

-- ============================================================
-- Now recreate everything from init.sql
-- ============================================================

-- Role enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin', 'doctor', 'nurse', 'reception',
    'accountant', 'manager', 'patient'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('thai', 'foreign')),
  title_th VARCHAR(20),
  first_name_th VARCHAR(100),
  last_name_th VARCHAR(100),
  thai_id VARCHAR(13),
  title_en VARCHAR(10),
  first_name_en VARCHAR(100),
  last_name_en VARCHAR(100),
  passport VARCHAR(20),
  nationality VARCHAR(100),
  role user_role DEFAULT 'patient',
  birth_date DATE,
  gender VARCHAR(20),
  blood_type VARCHAR(10),
  allergies VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_thai_id ON users (thai_id) WHERE thai_id IS NOT NULL;
CREATE UNIQUE INDEX idx_users_passport ON users (passport) WHERE passport IS NOT NULL;
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens (token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);

-- Audit logs
CREATE TABLE audit_logs (
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

CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC);

-- Role permissions
CREATE TABLE role_permissions (
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
('super_admin', 'users', TRUE, TRUE, TRUE, TRUE),
('super_admin', 'patients', TRUE, TRUE, TRUE, TRUE),
('super_admin', 'diagnosis', TRUE, TRUE, TRUE, TRUE),
('super_admin', 'prescriptions', TRUE, TRUE, TRUE, TRUE),
('super_admin', 'appointments', TRUE, TRUE, TRUE, TRUE),
('super_admin', 'billing', TRUE, TRUE, TRUE, TRUE),
('super_admin', 'reports', TRUE, TRUE, TRUE, TRUE),
('super_admin', 'settings', TRUE, TRUE, TRUE, TRUE),
('super_admin', 'audit_logs', TRUE, FALSE, FALSE, FALSE),
('super_admin', 'permissions', TRUE, TRUE, TRUE, TRUE),
('doctor', 'patients', TRUE, FALSE, TRUE, FALSE),
('doctor', 'diagnosis', TRUE, TRUE, TRUE, FALSE),
('doctor', 'prescriptions', TRUE, TRUE, TRUE, FALSE),
('doctor', 'appointments', TRUE, FALSE, FALSE, FALSE),
('nurse', 'patients', TRUE, FALSE, TRUE, FALSE),
('nurse', 'diagnosis', TRUE, FALSE, FALSE, FALSE),
('nurse', 'prescriptions', TRUE, FALSE, FALSE, FALSE),
('nurse', 'appointments', TRUE, FALSE, TRUE, FALSE),
('reception', 'patients', TRUE, TRUE, TRUE, FALSE),
('reception', 'appointments', TRUE, TRUE, TRUE, TRUE),
('accountant', 'billing', TRUE, TRUE, TRUE, FALSE),
('accountant', 'reports', TRUE, FALSE, FALSE, FALSE),
('accountant', 'patients', TRUE, FALSE, FALSE, FALSE),
('manager', 'reports', TRUE, FALSE, FALSE, FALSE),
('manager', 'patients', TRUE, FALSE, FALSE, FALSE),
('manager', 'billing', TRUE, FALSE, FALSE, FALSE),
('manager', 'appointments', TRUE, FALSE, FALSE, FALSE),
('patient', 'appointments', TRUE, TRUE, FALSE, FALSE),
('patient', 'billing', TRUE, FALSE, FALSE, FALSE)
ON CONFLICT (role, module) DO NOTHING;

-- Services
CREATE TABLE services (
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

CREATE INDEX idx_services_category ON services (category);
CREATE INDEX idx_services_is_active ON services (is_active);

-- Bookings
CREATE TABLE bookings (
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

CREATE UNIQUE INDEX idx_bookings_unique_slot
  ON bookings (service_id, booking_date, booking_time)
  WHERE status NOT IN ('cancelled');
CREATE INDEX idx_bookings_user ON bookings (user_id);
CREATE INDEX idx_bookings_date ON bookings (booking_date);
CREATE INDEX idx_bookings_status ON bookings (status);

-- Booking locks
CREATE TABLE booking_locks (
  id SERIAL PRIMARY KEY,
  service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  booking_time VARCHAR(10) NOT NULL,
  user_id INT NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (service_id, booking_date, booking_time)
);

CREATE INDEX idx_booking_locks_expires ON booking_locks (expires_at);

-- User balances
CREATE TABLE user_balances (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Balance transactions
CREATE TABLE balance_transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('deposit','payment','refund','withdraw','adjustment')),
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) DEFAULT 0,
  description TEXT,
  booking_id INT REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_balance_tx_user ON balance_transactions (user_id);
CREATE INDEX idx_balance_tx_booking ON balance_transactions (booking_id);

-- Refund requests
CREATE TABLE refund_requests (
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

CREATE INDEX idx_refund_requests_booking ON refund_requests (booking_id);
CREATE INDEX idx_refund_requests_user ON refund_requests (user_id);
CREATE INDEX idx_refund_requests_status ON refund_requests (status);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Fresh migration completed — all tables created!' as status;
