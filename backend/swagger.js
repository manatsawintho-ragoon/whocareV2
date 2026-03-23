import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhocarE Hospital API Documentation',
      version: '2.0.0',
      description: 'REST API for WhocarE Hospital Management System',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
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
      { name: 'Auth', description: 'Authentication & registration' },
      { name: 'Admin', description: 'Admin user management (requires admin role)' },
      { name: 'Services', description: 'Hospital services' },
      { name: 'Bookings', description: 'Appointment bookings' },
      { name: 'Finance', description: 'Finance & wallet management' },
      { name: 'News', description: 'News & articles' },
      { name: 'User', description: 'User profile' },
    ],
    paths: {
      // ─── AUTH ───────────────────────────────────────────────
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new patient account',
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
                    thaiId: { type: 'string', example: '1234567890123', description: 'Required if userType=thai' },
                    firstNameTh: { type: 'string', example: 'สมชาย' },
                    lastNameTh: { type: 'string', example: 'ใจดี' },
                    titleTh: { type: 'string', example: 'นาย' },
                    passport: { type: 'string', example: 'A12345678', description: 'Required if userType=foreign' },
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
              description: 'Registration successful',
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
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            409: { description: 'Email / ID already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with Thai ID or Passport',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userType', 'password'],
                  properties: {
                    userType: { type: 'string', enum: ['thai', 'foreign'], example: 'thai' },
                    thaiId: { type: 'string', example: '1234567890123', description: 'Required if userType=thai' },
                    passport: { type: 'string', example: 'A12345678', description: 'Required if userType=foreign' },
                    password: { type: 'string', example: 'password123' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login successful',
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
            401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token using refresh token',
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
            200: { description: 'New access token issued', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            401: { description: 'Invalid or expired refresh token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout and invalidate refresh token',
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
            200: { description: 'Logout successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current authenticated user info',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Current user data',
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } } } },
            },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },

      // ─── USER ────────────────────────────────────────────────
      '/api/user/profile': {
        get: {
          tags: ['User'],
          summary: 'Get current user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'User profile', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },

      // ─── ADMIN ───────────────────────────────────────────────
      '/api/admin/users': {
        get: {
          tags: ['Admin'],
          summary: 'List all users (super_admin, manager)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'role', in: 'query', schema: { type: 'string', enum: ['super_admin', 'doctor', 'nurse', 'reception', 'accountant', 'manager', 'patient'] } },
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name, email, ID' },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'Paginated user list', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/admin/users/{id}': {
        get: {
          tags: ['Admin'],
          summary: 'Get single user detail (super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'User detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            404: { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/admin/users/{id}/role': {
        put: {
          tags: ['Admin'],
          summary: 'Update user role (super_admin)',
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
            200: { description: 'Role updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/admin/users/{id}/status': {
        put: {
          tags: ['Admin'],
          summary: 'Toggle user active status (super_admin)',
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
            200: { description: 'Status toggled', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/admin/users/{id}/password': {
        put: {
          tags: ['Admin'],
          summary: 'Reset user password (super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['newPassword'],
                  properties: { newPassword: { type: 'string', minLength: 8 } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Password reset', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/admin/audit-logs': {
        get: {
          tags: ['Admin'],
          summary: 'Get audit logs (super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'Audit log list', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },

      // ─── SERVICES ────────────────────────────────────────────
      '/api/services': {
        get: {
          tags: ['Services'],
          summary: 'List active services (public)',
          parameters: [
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'recommended', in: 'query', schema: { type: 'boolean' } },
            { name: 'promotion', in: 'query', schema: { type: 'boolean' } },
          ],
          responses: {
            200: { description: 'Service list', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Service' } } } } } } },
          },
        },
        post: {
          tags: ['Services'],
          summary: 'Create a new service (super_admin, manager)',
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
            201: { description: 'Service created', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/services/admin': {
        get: {
          tags: ['Services'],
          summary: 'List all services including inactive (super_admin, manager)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'All services (paginated)', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/services/{id}': {
        get: {
          tags: ['Services'],
          summary: 'Get service by ID (public)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Service detail', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Service' } } } } } },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
        put: {
          tags: ['Services'],
          summary: 'Update service (super_admin, manager)',
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
            200: { description: 'Service updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        delete: {
          tags: ['Services'],
          summary: 'Delete (deactivate) service (super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Service deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },

      // ─── BOOKINGS ────────────────────────────────────────────
      '/api/bookings/slots': {
        get: {
          tags: ['Bookings'],
          summary: 'Get available time slots for a service on a date',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'service_id', in: 'query', required: true, schema: { type: 'integer' } },
            { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date', example: '2026-04-01' } },
          ],
          responses: {
            200: {
              description: 'Time slots with availability status',
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
          summary: 'Lock a time slot for 5 minutes',
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
            200: { description: 'Slot locked', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            409: { description: 'Slot already booked or locked', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/bookings': {
        post: {
          tags: ['Bookings'],
          summary: 'Create a new booking',
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
                    doctor_id: { type: 'integer' },
                    note: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Booking created', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            409: { description: 'Slot not available', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
        get: {
          tags: ['Bookings'],
          summary: 'Get my bookings',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: {
            200: { description: 'My bookings (paginated)', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/bookings/{id}': {
        get: {
          tags: ['Bookings'],
          summary: 'Get booking detail by ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Booking detail', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Booking' } } } } } },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
        put: {
          tags: ['Bookings'],
          summary: 'Update booking status (admin roles)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled'] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Booking updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        delete: {
          tags: ['Bookings'],
          summary: 'Cancel booking',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Booking cancelled', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/bookings/admin': {
        get: {
          tags: ['Bookings'],
          summary: 'List all bookings (admin roles)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'All bookings (paginated)', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },

      // ─── FINANCE ────────────────────────────────────────────
      '/api/finance/doctors': {
        get: {
          tags: ['Finance'],
          summary: 'List all active doctors',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Doctor list', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/finance/balance': {
        get: {
          tags: ['Finance'],
          summary: 'Get current user wallet balance',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Wallet balance',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'object', properties: { balance: { type: 'number', example: 2500.00 } } },
                    },
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
          summary: 'Top up wallet balance (1 – 1,000,000 THB)',
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
            200: { description: 'Balance topped up', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            400: { description: 'Invalid amount', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/finance/transactions': {
        get: {
          tags: ['Finance'],
          summary: 'Get user transaction history',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'Transaction list (paginated)', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/finance/admin/transactions': {
        get: {
          tags: ['Finance'],
          summary: 'List all transactions (accountant, manager, super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'All transactions (paginated)', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },

      // ─── NEWS ────────────────────────────────────────────────
      '/api/news': {
        get: {
          tags: ['News'],
          summary: 'List published articles/news (public)',
          parameters: [
            { name: 'content_type', in: 'query', schema: { type: 'string', enum: ['article', 'news'] } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'tag', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['latest', 'popular', 'oldest'], default: 'latest' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
          ],
          responses: {
            200: { description: 'Published news/articles', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        post: {
          tags: ['News'],
          summary: 'Create article/news (doctor, nurse, manager, super_admin)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'content', 'content_type'],
                  properties: {
                    title: { type: 'string', example: 'Health Tips for 2026' },
                    content: { type: 'string' },
                    content_type: { type: 'string', enum: ['article', 'news'] },
                    category: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    status: { type: 'string', enum: ['draft', 'published'], default: 'draft' },
                    cover_image_url: { type: 'string', format: 'uri' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Article created', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/news/{slug}': {
        get: {
          tags: ['News'],
          summary: 'Get article by slug (public)',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Article detail', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/NewsArticle' } } } } } },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/news/{id}': {
        put: {
          tags: ['News'],
          summary: 'Update article (author or super_admin)',
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
                    content: { type: 'string' },
                    category: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    status: { type: 'string', enum: ['draft', 'published', 'archived'] },
                    cover_image_url: { type: 'string', format: 'uri' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Article updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        delete: {
          tags: ['News'],
          summary: 'Delete article (author or super_admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Article deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/news/admin': {
        get: {
          tags: ['News'],
          summary: 'List all articles for management (admin roles)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'content_type', in: 'query', schema: { type: 'string', enum: ['article', 'news'] } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'published', 'archived'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'All articles (paginated)', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
