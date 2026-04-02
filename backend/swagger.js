import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';
dotenv.config();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhocarE Hospital API',
      version: '2.0.0',
      description: `
## 🏥 ระบบบริหารจัดการโรงพยาบาล WhocarE — REST API

เชื่อมต่อกับ **Supabase PostgreSQL** · ยืนยันตัวตนด้วย JWT · ควบคุมสิทธิ์ตามบทบาท (RBAC)

---

### 🚀 เริ่มต้นใช้งาน — ขั้นตอนการใช้ API

| ขั้นตอน | การดำเนินการ | Endpoint |
|---------|-------------|----------|
| 1 | ตรวจสอบสถานะเซิร์ฟเวอร์และฐานข้อมูล | \`GET /api/health\` |
| 2 | สมัครสมาชิก (ผู้ป่วย) | \`POST /api/auth/register\` |
| 3 | เข้าสู่ระบบเพื่อรับ Token | \`POST /api/auth/login\` |
| 4 | กดปุ่ม **Authorize 🔒** ด้านบน → วาง \`accessToken\` | — |
| 5 | ใช้งาน Endpoint ที่ต้องการสิทธิ์ | Endpoint ทุกตัวที่มีไอคอน \`🔒\` |

### 🔑 ขั้นตอนการยืนยันตัวตน

\`\`\`
POST /api/auth/login  →  { accessToken, refreshToken }
                          ↓
       นำ accessToken ใส่ใน: Authorization: Bearer <token>
                          ↓
       เมื่อ Token หมดอายุ → POST /api/auth/refresh { refreshToken }
\`\`\`

### 👥 บทบาทและสิทธิ์การเข้าถึง

| บทบาท | สิทธิ์การเข้าถึง |
|-------|----------------|
| \`patient\` | การนัดหมายของตนเอง กระเป๋าเงิน โปรไฟล์ |
| \`doctor\` | + สร้าง/แก้ไขบทความ ดูการนัดหมายทั้งหมด |
| \`nurse\` | + จัดการการนัดหมาย ดูข้อมูลผู้ป่วย |
| \`reception\` | + จัดการการนัดหมาย การเงินเบื้องต้น |
| \`accountant\` | + แดชบอร์ดการเงิน การคืนเงิน |
| \`manager\` | + จัดการทั้งหมด บริการ อนุมัติบทความ |
| \`super_admin\` | เข้าถึงระบบทั้งหมด |

### 💡 เคล็ดลับการใช้งาน
- **Try it out** เปิดใช้งานอัตโนมัติ — กด Execute เพื่อทดสอบได้เลย
- แสดงเวลาตอบสนองของแต่ละ Request
- ใช้ช่อง **Filter** ด้านบนเพื่อค้นหา Endpoint
- Token จะถูกบันทึกไว้ในเบราว์เซอร์ (ไม่หายเมื่อรีเฟรชหน้า)
`,
      contact: {
        name: 'WhocarE Dev Team',
      },
    },
    servers: [
      {
        url: process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`,
        description: `เซิร์ฟเวอร์หลัก (Supabase: ${process.env.DB_HOST || 'localhost'})`,

      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'ใส่ JWT Access Token ที่ได้จากการ Login',

        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            message_en: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_type: { type: 'string', enum: ['thai', 'foreign'] },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['super_admin', 'doctor', 'nurse', 'reception', 'accountant', 'manager', 'patient'] },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Service: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
            is_active: { type: 'boolean' },
            is_recommended: { type: 'boolean' },
            is_promotion: { type: 'boolean' },
            sort_order: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            service_id: { type: 'integer' },
            booking_date: { type: 'string', format: 'date' },
            booking_time: { type: 'string', example: '10:00' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        NewsArticle: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            slug: { type: 'string' },
            content: { type: 'string' },
            content_type: { type: 'string', enum: ['article', 'news'] },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
            category: { type: 'string' },
            author_id: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'ตรวจสอบสถานะเซิร์ฟเวอร์และการเชื่อมต่อฐานข้อมูล' },
      { name: 'Auth', description: 'สมัครสมาชิก เข้าสู่ระบบ ออกจากระบบ รีเฟรช Token จัดการโปรไฟล์' },
      { name: 'Admin', description: 'จัดการผู้ใช้ บทบาท สิทธิ์ แดชบอร์ด — ต้องใช้สิทธิ์ `super_admin` หรือ `manager`' },
      { name: 'Services', description: 'CRUD บริการของโรงพยาบาล — อ่านสาธารณะ เขียนต้องใช้สิทธิ์ (`super_admin`, `manager`)' },
      { name: 'Bookings', description: 'นัดหมายพร้อมระบบล็อคสล็อตเวลา — ผู้ป่วยจอง เจ้าหน้าที่จัดการ' },
      { name: 'Finance', description: 'กระเป๋าเงิน (ฝาก/ถอน) ประวัติธุรกรรม ขอคืนเงิน — อนุมัติหลายบทบาท' },
      { name: 'News', description: 'บทความและข่าวสาร มีขั้นตอนบรรณาธิการ — ฉบับร่าง → รอตรวจ → อนุมัติ → เผยแพร่' },
    ],
    paths: {
      // ─── HEALTH ─────────────────────────────────────────────
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'ตรวจสอบสถานะเซิร์ฟเวอร์และการเชื่อมต่อฐานข้อมูล',
          description: 'คืนค่าสถานะเซิร์ฟเวอร์ สถานะการเชื่อมต่อ DB โฮสต์ฐานข้อมูล เวลาทำงาน และ Timestamp ใช้เพื่อตรวจสอบว่า API ทำงานและเชื่อมต่อ Supabase อยู่หรือไม่',
          responses: {
            200: {
              description: 'สถานะระบบ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      database: { type: 'string', enum: ['connected', 'disconnected', 'error'], example: 'connected' },
                      db_host: { type: 'string', example: 'db.rdlpkgbytdsdlwabxnpm.supabase.co' },
                      uptime: { type: 'integer', description: 'เวลาทำงานของเซิร์ฟเวอร์ (วินาที)', example: 3600 },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ─── AUTH ───────────────────────────────────────────────
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'สมัครสมาชิกบัญชีผู้ป่วย',
          description: 'สร้างบัญชีผู้ป่วยใหม่ ผู้ใช้ไทยต้องกรอก `thaiId` ผู้ใช้ต่างชาติต้องกรอก `passport` และ `nationality` คืนค่า Token ทันทีหลักสมัคร (เข้าสู่ระบบอัตโนมัติ)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userType', 'email', 'password'],
                  properties: {
                    userType: { type: 'string', enum: ['thai', 'foreign'], example: 'thai' },
                    email: { type: 'string', format: 'email', example: 'patient@example.com' },
                    password: { type: 'string', minLength: 8, example: 'password123' },
                    thaiId: { type: 'string', example: '1234567890123', description: 'จำเป็นถ้า userType=thai' },
                    firstNameTh: { type: 'string', example: 'สมชาย' },
                    lastNameTh: { type: 'string', example: 'ใจดี' },
                    titleTh: { type: 'string', example: 'นาย' },
                    passport: { type: 'string', example: 'A12345678', description: 'จำเป็นถ้า userType=foreign' },
                    firstNameEn: { type: 'string', example: 'John' },
                    lastNameEn: { type: 'string', example: 'Doe' },
                    titleEn: { type: 'string', example: 'Mr.' },
                    nationality: { type: 'string', example: 'American' },
                    birthDate: { type: 'string', format: 'date', example: '1990-01-15' },
                    gender: { type: 'string', enum: ['ชาย', 'หญิง', 'Male', 'Female'] },
                    phone: { type: 'string', example: '0812345678' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'สมัครสมาชิกสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                          accessToken: { type: 'string' },
                          refreshToken: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'ข้อมูลไม่ถูกต้อง', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            409: { description: 'อีเมล / บัตรประชาชน / Passport ถูกใช้งานแล้ว', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'เข้าสู่ระบบด้วยบัตรประชาชนหรือ Passport',
          description: 'ยืนยันตัวตนด้วยบัตรประชาชน (ผู้ใช้ไทย) หรือ Passport (ชาวต่างชาติ) คืนค่า JWT Access Token (หมดอายุ 15 นาที) และ Refresh Token (7 วัน) นำ accessToken ไปใส่ในปุ่ม **Authorize** ด้านบน',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userType', 'password'],
                  properties: {
                    userType: { type: 'string', enum: ['thai', 'foreign'], example: 'thai' },
                    thaiId: { type: 'string', example: '1234567890123', description: 'จำเป็นถ้า userType=thai' },
                    passport: { type: 'string', example: 'A12345678', description: 'จำเป็นถ้า userType=foreign' },
                    password: { type: 'string', example: 'password123' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'เข้าสู่ระบบสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                          accessToken: { type: 'string', description: '⬅️ คัดลอกค่านี้ → กดปุ่ม Authorize ด้านบน → วางค่า' },
                          refreshToken: { type: 'string', description: 'ใช้ขอ accessToken ใหม่เมื่อหมดอายุ' },
                        },
                      },
                    },
                  },
                  example: {
                    success: true,
                    data: {
                      user: { id: 1, user_type: 'thai', email: 'patient@example.com', role: 'patient', is_active: true },
                      accessToken: 'eyJhbGciOiJIUzI1NiIs...',
                      refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
                    },
                  },
                },
              },
            },
            401: { description: 'ข้อมูลล็อกอินไม่ถูกต้อง', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'ขอ Access Token ใหม่โดยใช้ Refresh Token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: { refreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'ออก Access Token ใหม่สำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            401: { description: 'Refresh Token ไม่ถูกต้องหรือหมดอายุ', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'ออกจากระบบและยกเลิก Refresh Token',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { refreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'ออกจากระบบสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/auth/profile': {
        get: {
          tags: ['Auth'],
          summary: 'ดูโปรไฟล์ผู้ใช้ปัจจุบัน',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'ข้อมูลผู้ใช้ปัจจุบัน',
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } } } },
            },
            401: { description: 'ไม่มีสิทธิ์เข้าถึง', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
        put: {
          tags: ['Auth'],
          summary: 'แก้ไขโปรไฟล์ผู้ใช้ปัจจุบัน',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title_th: { type: 'string' },
                    first_name_th: { type: 'string' },
                    last_name_th: { type: 'string' },
                    title_en: { type: 'string' },
                    first_name_en: { type: 'string' },
                    last_name_en: { type: 'string' },
                    phone: { type: 'string' },
                    birth_date: { type: 'string', format: 'date' },
                    blood_type: { type: 'string' },
                    allergies: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'อัปเดตโปรไฟล์สำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            401: { description: 'ไม่มีสิทธิ์เข้าถึง', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },

      // ─── USER ────────────────────────────────────────────────
      '/api/user/profile': {
        get: {
          tags: ['Auth'],
          summary: 'ดูโปรไฟล์ผู้ใช้ (Endpoint สำรอง)',
          description: 'เหมือน GET /api/auth/profile — คืนข้อมูลผู้ใช้ทั้งหมดยกเว้น password_hash',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'ข้อมูลโปรไฟล์ผู้ใช้',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { description: 'ไม่มีสิทธิ์ — Token ไม่ถูกต้องหรือหายไป', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'ไม่พบผู้ใช้หรือบัญชีถูกระงับ', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },

      // ─── ADMIN ───────────────────────────────────────────────
      '/api/admin/users': {
        get: {
          tags: ['Admin'],
          summary: 'ดูรายชื่อผู้ใช้ทั้งหมด (super_admin, manager)',
          description: 'รายชื่อผู้ใช้แบบแบ่งหน้า กรองตามบทบาทหรือค้นหาชื่อ/อีเมล/เลขบัตร',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'role', in: 'query', schema: { type: 'string', enum: ['super_admin', 'doctor', 'nurse', 'reception', 'accountant', 'manager', 'patient'] } },
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'ค้นหาตามชื่อ อีเมล หรือเลขบัตร' },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'รายชื่อผู้ใช้ (แบ่งหน้า)', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'ไม่มีสิทธิ์เข้าถึง', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/admin/users/{id}/role': {
        put: {
          tags: ['Admin'],
          summary: 'เปลี่ยนบทบาทผู้ใช้ (super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['role'],
                  properties: {
                    role: { type: 'string', enum: ['super_admin', 'doctor', 'nurse', 'reception', 'accountant', 'manager', 'patient'] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'เปลี่ยนบทบาทสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'ไม่มีสิทธิ์เข้าถึง', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/admin/users/{id}/status': {
        put: {
          tags: ['Admin'],
          summary: 'เปิด/ปิดสถานะบัญชีผู้ใช้ (super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['is_active'],
                  properties: { is_active: { type: 'boolean' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'เปลี่ยนสถานะสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/admin/users/{id}': {
        get: {
          tags: ['Admin'],
          summary: 'ดูข้อมูลผู้ใช้รายบุคคล (super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'ข้อมูลผู้ใช้', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            404: { description: 'ไม่พบผู้ใช้', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
        put: {
          tags: ['Admin'],
          summary: 'แก้ไขข้อมูลโปรไฟล์ผู้ใช้ (super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title_th: { type: 'string' },
                    first_name_th: { type: 'string' },
                    last_name_th: { type: 'string' },
                    title_en: { type: 'string' },
                    first_name_en: { type: 'string' },
                    last_name_en: { type: 'string' },
                    phone: { type: 'string' },
                    birth_date: { type: 'string', format: 'date' },
                    blood_type: { type: 'string' },
                    allergies: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'อัปเดตข้อมูลผู้ใช้สำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/admin/permissions': {
        get: {
          tags: ['Admin'],
          summary: 'ดูตารางสิทธิ์การเข้าถึงตามบทบาท (super_admin)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'ตารางสิทธิ์การเข้าถึง', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        put: {
          tags: ['Admin'],
          summary: 'แก้ไขสิทธิ์การเข้าถึง (super_admin)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['role', 'module'],
                  properties: {
                    role: { type: 'string' },
                    module: { type: 'string' },
                    can_read: { type: 'boolean' },
                    can_create: { type: 'boolean' },
                    can_update: { type: 'boolean' },
                    can_delete: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'อัปเดตสิทธิ์สำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/admin/dashboard': {
        get: {
          tags: ['Admin'],
          summary: 'ดูสถิติแดชบอร์ดผู้ดูแลระบบ (super_admin, manager)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'สถิติแดชบอร์ด', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/admin/audit-logs': {
        get: {
          tags: ['Admin'],
          summary: 'ดู Audit Log บันทึกการใช้งาน (super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'รายการ Audit Log', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },

      // ─── SERVICES ────────────────────────────────────────────
      '/api/services': {
        get: {
          tags: ['Services'],
          summary: 'ดูรายการบริการที่เปิดใช้งาน (สาธารณะ)',
          parameters: [
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'recommended', in: 'query', schema: { type: 'boolean' } },
            { name: 'promotion', in: 'query', schema: { type: 'boolean' } },
          ],
          responses: {
            200: { description: 'รายการบริการ', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Service' } } } } } } },
          },
        },
        post: {
          tags: ['Services'],
          summary: 'เพิ่มบริการใหม่ (super_admin, manager)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'price'],
                  properties: {
                    name: { type: 'string', example: 'General Consultation' },
                    description: { type: 'string' },
                    category: { type: 'string', example: 'consultation' },
                    price: { type: 'number', example: 500 },
                    is_recommended: { type: 'boolean', default: false },
                    is_promotion: { type: 'boolean', default: false },
                    sort_order: { type: 'integer', default: 0 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'สร้างบริการสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'ไม่มีสิทธิ์เข้าถึง', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/services/admin': {
        get: {
          tags: ['Services'],
          summary: 'ดูบริการทั้งหมดรวมถึงปิดใช้งาน (super_admin, manager)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'รายการบริการทั้งหมด (แบ่งหน้า)', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/services/{id}': {
        get: {
          tags: ['Services'],
          summary: 'ดูบริการตาม ID (สาธารณะ)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'ข้อมูลบริการ', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Service' } } } } } },
            404: { description: 'ไม่พบบริการ', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
        put: {
          tags: ['Services'],
          summary: 'แก้ไขข้อมูลบริการ (super_admin, manager)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    price: { type: 'number' },
                    is_active: { type: 'boolean' },
                    is_recommended: { type: 'boolean' },
                    is_promotion: { type: 'boolean' },
                    sort_order: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'อัปเดตบริการสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        delete: {
          tags: ['Services'],
          summary: 'ลบ (ปิดการใช้งาน) บริการ (super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'ลบบริการสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },

      // ─── BOOKINGS ────────────────────────────────────────────
      '/api/bookings/slots': {
        get: {
          tags: ['Bookings'],
          summary: 'ดูช่วงเวลาว่างสำหรับนัดหมาย',
          description: 'คืนค่าช่วงเวลาทั้งหมด (09:00-16:00) พร้อมสถานะ: `available` ว่าง | `booked` จองแล้ว | `locking` คนอื่นกำลังจอง | `my_lock` คุณล็อคไว้ | `past` เวลาผ่านแล้ว ใช้ก่อนทำการล็อคสล็อต',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'service_id', in: 'query', required: true, schema: { type: 'integer' } },
            { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date', example: '2026-04-01' } },
          ],
          responses: {
            200: {
              description: 'รายการช่วงเวลาพร้อมสถานะ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          date: { type: 'string', format: 'date' },
                          slots: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                time: { type: 'string', example: '10:00' },
                                status: { type: 'string', enum: ['available', 'booked', 'locking', 'my_lock', 'past'] },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/bookings/lock': {
        post: {
          tags: ['Bookings'],
          summary: 'ล็อคช่วงเวลานัดหมายชั่วคราว 5 นาที',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['service_id', 'booking_date', 'booking_time'],
                  properties: {
                    service_id: { type: 'integer' },
                    booking_date: { type: 'string', format: 'date' },
                    booking_time: { type: 'string', example: '10:00' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'ล็อคสล็อตสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            409: { description: 'ช่วงเวลานี้ถูกจองหรือล็อคแล้ว', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/bookings/unlock': {
        post: {
          tags: ['Bookings'],
          summary: 'ปลดล็อคช่วงเวลาที่เคยล็อคไว้',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['service_id', 'booking_date', 'booking_time'],
                  properties: {
                    service_id: { type: 'integer' },
                    booking_date: { type: 'string', format: 'date' },
                    booking_time: { type: 'string', example: '10:00' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'ปลดล็อคสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/bookings': {
        post: {
          tags: ['Bookings'],
          summary: 'สร้างการนัดหมายใหม่ (หักเงินมัดจำ 50% จากกระเป๋าเงิน)',
          description: 'สร้างการนัดหมายสำหรับบริการ ต้องมียอดเงินในกระเป๋าเพียงพอ (50% ของราคาบริการ) และต้องล็อคสล็อตก่อนผ่าน POST /api/bookings/lock',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['service_id', 'booking_date', 'booking_time', 'contact_name', 'contact_phone'],
                  properties: {
                    service_id: { type: 'integer' },
                    booking_date: { type: 'string', format: 'date' },
                    booking_time: { type: 'string', example: '10:00' },
                    contact_name: { type: 'string', example: 'สมชาย ใจดี' },
                    contact_phone: { type: 'string', example: '0812345678' },
                    contact_email: { type: 'string', format: 'email' },
                    doctor_id: { type: 'integer' },
                    branch: { type: 'string' },
                    note: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'สร้างการนัดหมายสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            400: { description: 'ข้อมูลไม่ถูกต้องหรือยอดเงินไม่พอ', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            409: { description: 'ช่วงเวลาไม่ว่าง', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/bookings/my': {
        get: {
          tags: ['Bookings'],
          summary: 'ดูการนัดหมายของตนเอง',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'รายการนัดหมายของฉัน', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/bookings/all': {
        get: {
          tags: ['Bookings'],
          summary: 'ดูการนัดหมายทั้งหมด (reception, nurse, manager, doctor, super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled'] } },
            { name: 'date_from', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'date_to', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'รายการนัดหมายทั้งหมด (แบ่งหน้า)', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/bookings/stats': {
        get: {
          tags: ['Bookings'],
          summary: 'ดูสถิติการนัดหมาย (reception, nurse, manager, super_admin)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'สถิติการนัดหมาย', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/bookings/{id}/status': {
        put: {
          tags: ['Bookings'],
          summary: 'อัปเดตสถานะการนัดหมาย (reception, nurse, manager, super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled'] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'อัปเดตสถานะสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/bookings/{id}/reschedule': {
        put: {
          tags: ['Bookings'],
          summary: 'เจ้าหน้าที่เลื่อนนัดหมาย (ล่วงหน้าได้สูงสุด 1 ปี)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['booking_date', 'booking_time'],
                  properties: {
                    booking_date: { type: 'string', format: 'date' },
                    booking_time: { type: 'string', example: '14:00' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'เลื่อนนัดหมายสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            409: { description: 'ช่วงเวลาใหม่ถูกจองแล้ว', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/bookings/{id}/user-reschedule': {
        put: {
          tags: ['Bookings'],
          summary: 'ผู้ป่วยเลื่อนนัดหมายด้วยตัวเอง (ได้ 1 ครั้ง ล่วงหน้าภายใน 7 วัน)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['booking_date', 'booking_time'],
                  properties: {
                    booking_date: { type: 'string', format: 'date' },
                    booking_time: { type: 'string', example: '14:00' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'เลื่อนนัดหมายสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            400: { description: 'เลื่อนนัดไปแล้ว 1 ครั้ง หรือวันที่ไม่ถูกต้อง', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },

      // ─── FINANCE ────────────────────────────────────────────
      '/api/finance/doctors': {
        get: {
          tags: ['Finance'],
          summary: 'ดูรายชื่อแพทย์ที่ใช้งานอยู่ทั้งหมด',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'รายชื่อแพทย์', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/finance/balance': {
        get: {
          tags: ['Finance'],
          summary: 'ดูยอดเงินในกระเป๋า',
          description: 'คืนค่ายอดเงินปัจจุบันของผู้ใช้ที่ล็อกอินอยู่ ผู้ใช้ใหม่จะเริ่มที่ 0 บาท',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'ยอดเงินในกระเป๋า',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'object', properties: { balance: { type: 'number', example: 2500.00 } } },
                    },
                  },
                  example: {
                    success: true,
                    data: { balance: 2500.00 },
                  },
                },
              },
            },
          },
        },
      },
      '/api/finance/deposit': {
        post: {
          tags: ['Finance'],
          summary: 'เติมเงินเข้ากระเป๋า (1 – 1,000,000 บาท)',
          description: 'เติมเงินเข้ากระเป๋าของผู้ใช้ จำเป็นต้องมีเงินก่อนทำการนัดหมาย (ระบบจะหักมัดจำ 50% ของราคาบริการ)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount'],
                  properties: { amount: { type: 'number', example: 500 } },
                },
              },
            },
          },
          responses: {
            200: { description: 'เติมเงินสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            400: { description: 'จำนวนเงินไม่ถูกต้อง', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/finance/transactions': {
        get: {
          tags: ['Finance'],
          summary: 'ดูประวัติธุรกรรมของผู้ใช้',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'รายการธุรกรรม (แบ่งหน้า)', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/finance/withdraw': {
        post: {
          tags: ['Finance'],
          summary: 'ขอถอนเงินเข้าบัญชีธนาคาร',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount', 'bank_name', 'account_name', 'account_number'],
                  properties: {
                    amount: { type: 'number', example: 500 },
                    bank_name: { type: 'string', example: 'กสิกรไทย' },
                    account_name: { type: 'string', example: 'สมชาย ใจดี' },
                    account_number: { type: 'string', example: '123-4-56789-0' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'ถอนเงินสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            400: { description: 'ยอดเงินไม่เพียงพอหรือข้อมูลไม่ถูกต้อง', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/finance/refund-request': {
        post: {
          tags: ['Finance'],
          summary: 'ขอคืนเงินสำหรับการนัดหมาย',
          description: 'ส่งคำขอคืนเงินสำหรับการนัดหมายที่ยกเลิก ต้องได้รับการอนุมัติจาก accountant, reception และ manager (ระบบอนุมัติ 3 ฝ่าย)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['booking_id'],
                  properties: {
                    booking_id: { type: 'integer' },
                    reason: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'ส่งคำขอคืนเงินสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            404: { description: 'ไม่พบการนัดหมาย', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/finance/refund-requests': {
        get: {
          tags: ['Finance'],
          summary: 'ดูคำขอคืนเงินทั้งหมด (accountant, reception, manager, super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'รายการขอคืนเงิน (แบ่งหน้า)', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/finance/refund-requests/{id}/approve': {
        put: {
          tags: ['Finance'],
          summary: 'อนุมัติการคืนเงิน (accountant/reception/manager ต้องอนุมัติทุกฝ่าย)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'บันทึกการอนุมัติสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            404: { description: 'ไม่พบคำขอ', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/finance/refund-requests/{id}/reject': {
        put: {
          tags: ['Finance'],
          summary: 'ปฏิเสธคำขอคืนเงิน (accountant, reception, manager, super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'ปฏิเสธคำขอสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/finance/dashboard': {
        get: {
          tags: ['Finance'],
          summary: 'แดชบอร์ดภาพรวมทางการเงิน (accountant, manager, super_admin)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'ข้อมูลแดชบอร์ดการเงิน', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },

      // ─── NEWS ────────────────────────────────────────────────
      '/api/news': {
        get: {
          tags: ['News'],
          summary: 'ดูบทความ/ข่าวสารที่เผยแพร่แล้ว (สาธารณะ)',
          parameters: [
            { name: 'content_type', in: 'query', schema: { type: 'string', enum: ['article', 'news'] } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'tag', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['latest', 'popular'], default: 'latest' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
          ],
          responses: {
            200: { description: 'รายการบทความ/ข่าวสารที่เผยแพร่', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/news/categories': {
        get: {
          tags: ['News'],
          summary: 'ดูหมวดหมู่ข่าวสารที่ใช้งาน (สาธารณะ)',
          responses: {
            200: { description: 'รายการหมวดหมู่', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/news/tags': {
        get: {
          tags: ['News'],
          summary: 'ดูแท็กข่าวสารทั้งหมด (สาธารณะ)',
          responses: {
            200: { description: 'รายการแท็ก', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/news/featured': {
        get: {
          tags: ['News'],
          summary: 'ดูบทความแนะนำที่เผยแพร่แล้ว (สาธารณะ)',
          parameters: [
            { name: 'content_type', in: 'query', schema: { type: 'string', enum: ['article', 'news'] } },
          ],
          responses: {
            200: { description: 'บทความแนะนำ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/news/detail/{slug}': {
        get: {
          tags: ['News'],
          summary: 'ดูบทความตาม Slug (สาธารณะ)',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'รายละเอียดบทความพร้อมแท็กและบทความที่เกี่ยวข้อง', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            404: { description: 'ไม่พบบทความ', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/news/admin/stats': {
        get: {
          tags: ['News'],
          summary: 'สถิติบทความ/ข่าวสารสำหรับผู้ดูแล (doctor, manager, super_admin)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'จำนวนบทความตามสถานะและยอดวิวรวม', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/news/admin/list': {
        get: {
          tags: ['News'],
          summary: 'ดูบทความทั้งหมดสำหรับจัดการ (doctor, manager, super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'content_type', in: 'query', schema: { type: 'string', enum: ['article', 'news'] } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'pending', 'approved', 'published', 'archived'] } },
            { name: 'category', in: 'query', schema: { type: 'integer' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'รายการบทความทั้งหมด (แบ่งหน้า)', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/news/admin/categories': {
        get: {
          tags: ['News'],
          summary: 'ดูหมวดหมู่ทั้งหมดรวมถึงปิดใช้งาน (doctor, manager, super_admin)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'รายการหมวดหมู่ทั้งหมด', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        post: {
          tags: ['News'],
          summary: 'สร้างหมวดหมู่ข่าวสาร (manager, super_admin)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name_th'],
                  properties: {
                    name_th: { type: 'string', example: 'สุขภาพ' },
                    name_en: { type: 'string', example: 'Health' },
                    icon: { type: 'string', example: 'mdi:heart' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'สร้างหมวดหมู่สำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            409: { description: 'หมวดหมู่นี้มีอยู่แล้ว', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/news/admin/categories/{id}': {
        delete: {
          tags: ['News'],
          summary: 'ลบหมวดหมู่ข่าวสาร (super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'ลบหมวดหมู่สำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/news/admin/tags': {
        get: {
          tags: ['News'],
          summary: 'ดูแท็กทั้งหมดสำหรับผู้ดูแล (doctor, manager, super_admin)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'รายการแท็กทั้งหมด', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/news/admin/tags/{id}': {
        delete: {
          tags: ['News'],
          summary: 'ลบแท็ก (manager, super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'ลบแท็กสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/news/admin': {
        post: {
          tags: ['News'],
          summary: 'สร้างบทความ/ข่าวสารฉบับร่าง (doctor, manager, super_admin)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string', example: 'Health Tips for 2026' },
                    excerpt: { type: 'string' },
                    content: { type: 'string' },
                    content_type: { type: 'string', enum: ['article', 'news'], default: 'article' },
                    category_id: { type: 'integer' },
                    tags: { type: 'array', items: { type: 'string' } },
                    cover_image: { type: 'string' },
                    is_featured: { type: 'boolean' },
                    is_pinned: { type: 'boolean' },
                    status: { type: 'string', enum: ['draft', 'pending'], default: 'draft' },
                    scheduled_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'สร้างบทความสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'ไม่มีสิทธิ์เข้าถึง', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/news/admin/{id}': {
        get: {
          tags: ['News'],
          summary: 'ดูบทความเดี่ยวสำหรับแก้ไข (doctor, manager, super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'บทความพร้อมแท็ก', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            404: { description: 'ไม่พบบทความ', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
        put: {
          tags: ['News'],
          summary: 'แก้ไขบทความ (เจ้าของบทความ doctor / manager / super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    excerpt: { type: 'string' },
                    content: { type: 'string' },
                    content_type: { type: 'string', enum: ['article', 'news'] },
                    category_id: { type: 'integer' },
                    tags: { type: 'array', items: { type: 'string' } },
                    cover_image: { type: 'string' },
                    is_featured: { type: 'boolean' },
                    is_pinned: { type: 'boolean' },
                    scheduled_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'อัปเดตบทความสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        delete: {
          tags: ['News'],
          summary: 'ลบบทความถาวร (super_admin เท่านั้น)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'ลบบทความสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/news/admin/{id}/status': {
        put: {
          tags: ['News'],
          summary: 'เปลี่ยนสถานะบทความ — อนุมัติ/เผยแพร่/เก็บเข้าคลัง (manager, super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: { type: 'string', enum: ['pending', 'approved', 'published', 'archived', 'draft'] },
                    note: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'เปลี่ยนสถานะสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            400: { description: 'การเปลี่ยนสถานะไม่ถูกต้อง', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/news/admin/{id}/submit': {
        put: {
          tags: ['News'],
          summary: 'ผู้เขียนส่งฉบับร่างเพื่อตรวจสอบ (doctor, manager, super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'ส่งเพื่อรอตรวจสอบสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            400: { description: 'สามารถส่งได้เฉพาะฉบับร่างเท่านั้น', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
