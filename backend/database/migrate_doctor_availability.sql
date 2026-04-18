-- ============================================================
-- Doctor availability: service assignments + weekly schedules
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