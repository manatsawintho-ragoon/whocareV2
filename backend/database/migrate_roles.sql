-- ============================================================
-- Migration: Add role system to Whocare Hospital
-- Run this on existing databases to add role support
-- ============================================================

-- Step 1: Create role enum type
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

-- Step 2: Add role column to users_th (if not exists)
DO $$ BEGIN
  ALTER TABLE users_th ADD COLUMN role user_role DEFAULT 'patient';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Step 3: Add role column to users_foreign (if not exists)
DO $$ BEGIN
  ALTER TABLE users_foreign ADD COLUMN role user_role DEFAULT 'patient';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Step 4: Create indexes for role column
CREATE INDEX IF NOT EXISTS idx_users_th_role ON users_th (role);
CREATE INDEX IF NOT EXISTS idx_users_foreign_role ON users_foreign (role);

-- Step 5: Create audit_logs table
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

-- Step 6: Create role_permissions table
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

-- Step 7: Insert default permissions
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
('doctor', 'reports',      FALSE, FALSE, FALSE, FALSE),
('nurse', 'patients',      TRUE, FALSE, TRUE, FALSE),
('nurse', 'diagnosis',     TRUE, FALSE, FALSE, FALSE),
('nurse', 'prescriptions', TRUE, FALSE, FALSE, FALSE),
('nurse', 'appointments',  TRUE, FALSE, TRUE, FALSE),
('reception', 'patients',     TRUE, TRUE, TRUE, FALSE),
('reception', 'appointments', TRUE, TRUE, TRUE, TRUE),
('reception', 'diagnosis',    FALSE, FALSE, FALSE, FALSE),
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

-- Step 8: Optionally set the first user as super_admin
-- UPDATE users_th SET role = 'super_admin' WHERE id = 1;
-- UPDATE users_foreign SET role = 'super_admin' WHERE id = 1;

SELECT 'Migration completed successfully!' as status;
