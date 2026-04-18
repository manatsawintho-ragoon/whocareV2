import pool from '../database/db.js';

const formatDoctorNameSql = `CASE
  WHEN u.user_type = 'thai' THEN TRIM(CONCAT(COALESCE(u.title_th, ''), ' ', COALESCE(u.first_name_th, ''), ' ', COALESCE(u.last_name_th, '')))
  ELSE TRIM(CONCAT(COALESCE(u.title_en, ''), ' ', COALESCE(u.first_name_en, ''), ' ', COALESCE(u.last_name_en, '')))
END`;

export const normalizeTime = (time) => {
  if (!time) return '';
  return String(time).slice(0, 5);
};

const timeToMinutes = (time) => {
  const normalized = normalizeTime(time);
  if (!normalized) return -1;
  const [hours, minutes] = normalized.split(':').map(Number);
  return (hours * 60) + minutes;
};

const getFallbackRanges = (dateStr) => {
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  const start = day === 0 || day === 6 ? '11:00' : '10:00';
  return [{ start_time: start, end_time: '20:00' }];
};

export const isTimeWithinRanges = (time, ranges = []) => {
  const slotMinutes = timeToMinutes(time);
  if (slotMinutes < 0) return false;
  return ranges.some((range) => {
    const start = timeToMinutes(range.start_time);
    const end = timeToMinutes(range.end_time);
    return slotMinutes >= start && slotMinutes < end;
  });
};

export const getDoctorAvailabilitySnapshot = async ({ serviceId = null, branch = '', date = null, excludeBookingId = null } = {}) => {
  const [doctorRows] = await pool.query(
    `SELECT u.id, ${formatDoctorNameSql} as name
     FROM users u
     WHERE u.role = 'doctor' AND u.is_active = TRUE
     ORDER BY name`
  );

  let assignmentRows = [];
  if (serviceId) {
    [assignmentRows] = await pool.query(
      `SELECT doctor_id FROM doctor_service_assignments WHERE service_id = $1 AND is_active = TRUE`,
      [serviceId]
    );
  } else if (branch) {
    [assignmentRows] = await pool.query(
      `SELECT DISTINCT dsa.doctor_id
       FROM doctor_service_assignments dsa
       INNER JOIN services s ON s.id = dsa.service_id
       WHERE dsa.is_active = TRUE AND s.branch = $1`,
      [branch]
    );
  }

  const hasServiceConfig = assignmentRows.length > 0;
  const assignedDoctorIds = new Set(assignmentRows.map((row) => row.doctor_id));

  let scheduleRows = [];
  let scheduleCountRows = [];
  let busyRows = [];

  if (date) {
    const weekday = new Date(`${date}T00:00:00`).getDay();
    [scheduleRows] = await pool.query(
      `SELECT doctor_id, weekday, start_time::text as start_time, end_time::text as end_time
       FROM doctor_weekly_schedules
       WHERE weekday = $1 AND is_active = TRUE
       ORDER BY start_time`,
      [weekday]
    );
    [scheduleCountRows] = await pool.query(
      `SELECT doctor_id, COUNT(*) as total
       FROM doctor_weekly_schedules
       WHERE is_active = TRUE
       GROUP BY doctor_id`
    );

    const busyParams = [date];
    let busyQuery = `SELECT id, doctor_id, booking_time
                     FROM bookings
                     WHERE booking_date = $1
                       AND doctor_id IS NOT NULL
                       AND status NOT IN ('cancelled', 'completed')`;
    if (excludeBookingId) {
      busyQuery += ' AND id != $2';
      busyParams.push(excludeBookingId);
    }
    [busyRows] = await pool.query(busyQuery, busyParams);
  }

  const scheduleCountByDoctor = new Map(
    scheduleCountRows.map((row) => [row.doctor_id, parseInt(row.total, 10) || 0])
  );

  const schedulesByDoctor = new Map();
  scheduleRows.forEach((row) => {
    const schedules = schedulesByDoctor.get(row.doctor_id) || [];
    schedules.push({
      weekday: row.weekday,
      start_time: normalizeTime(row.start_time),
      end_time: normalizeTime(row.end_time),
    });
    schedulesByDoctor.set(row.doctor_id, schedules);
  });

  const busyTimesByDoctor = new Map();
  busyRows.forEach((row) => {
    const busyTimes = busyTimesByDoctor.get(row.doctor_id) || new Set();
    busyTimes.add(normalizeTime(row.booking_time));
    busyTimesByDoctor.set(row.doctor_id, busyTimes);
  });

  return {
    hasServiceConfig,
    doctors: doctorRows.map((doctor) => {
      const hasCustomSchedule = (scheduleCountByDoctor.get(doctor.id) || 0) > 0;
      const availabilityRanges = date
        ? (hasCustomSchedule ? (schedulesByDoctor.get(doctor.id) || []) : getFallbackRanges(date))
        : (schedulesByDoctor.get(doctor.id) || []);

      return {
        id: doctor.id,
        name: doctor.name,
        hasServiceAccess: !hasServiceConfig || assignedDoctorIds.has(doctor.id),
        hasCustomSchedule,
        availabilityRanges,
        busyTimes: busyTimesByDoctor.get(doctor.id) || new Set(),
      };
    }),
  };
};

export const listAvailableDoctors = async ({ serviceId = null, branch = '', date = null, time = null, excludeBookingId = null } = {}) => {
  const snapshot = await getDoctorAvailabilitySnapshot({ serviceId, branch, date, excludeBookingId });

  const doctors = snapshot.doctors
    .filter((doctor) => {
      if (!doctor.hasServiceAccess) return false;
      if (!date) return true;
      if (!doctor.availabilityRanges.length) return false;
      if (time && !isTimeWithinRanges(time, doctor.availabilityRanges)) return false;
      if (time && doctor.busyTimes.has(normalizeTime(time))) return false;
      return true;
    })
    .map(({ busyTimes, ...doctor }) => doctor);

  return {
    doctors,
    hasServiceConfig: snapshot.hasServiceConfig,
  };
};