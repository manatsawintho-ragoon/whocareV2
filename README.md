# WHOCARE CLINIC

เว็บไซต์คลินิกศัลยกรรมความงาม Whocare Clinic

## วิธีใช้งาน

### 1. ติดตั้ง

```bash
git clone <repo-url>
cd whocareV2

# ติดตั้ง Frontend
npm install

# ติดตั้ง Backend
cd backend
npm install
```

### 2. ตั้งค่า Environment

สร้างไฟล์ `backend/.env` แล้วใส่ค่าต่อไปนี้:

```env
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=รับจาก Admin
DB_NAME=postgres
DB_SSL=true
JWT_SECRET=random-string
JWT_REFRESH_SECRET=random-string
PORT=5000
CORS_ORIGIN=http://localhost:5173
```

### 3. รันโปรเจค

เปิด 2 terminal:

```bash
# Terminal 1 — Frontend
npm run dev

# Terminal 2 — Backend
cd backend
npm run dev
```

Frontend จะรันที่ `http://localhost:5173` และ Backend ที่ `http://localhost:5000`
