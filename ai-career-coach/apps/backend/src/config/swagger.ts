import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'AI Career Coach API',
      version: '1.0.0',
      description:
        'REST API for the AI Career Coach platform. Handles auth, CV management, job matching, ATS scoring, salary insights, skill-gap analysis, and admin operations.',
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Local dev' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token obtained from POST /api/v1/auth/login',
        },
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ErrorEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string', nullable: true },
            lastName: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
            isEmailVerified: { type: 'boolean' },
            isDisabled: { type: 'boolean' },
            lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            phoneNumber: { type: 'string', nullable: true },
            location: { type: 'string', nullable: true },
            linkedinUrl: { type: 'string', nullable: true },
            githubUrl: { type: 'string', nullable: true },
            portfolioUrl: { type: 'string', nullable: true },
            jobTitle: { type: 'string', nullable: true },
            targetRole: { type: 'string', nullable: true },
            experienceLevel: {
              type: 'string',
              enum: ['junior', 'mid', 'senior'],
              nullable: true,
            },
            bio: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
          },
        },
        CV: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            filename: { type: 'string' },
            fileUrl: { type: 'string' },
            isPrimary: { type: 'boolean' },
            mongoDocId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Job: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            externalId: { type: 'string' },
            title: { type: 'string' },
            company: { type: 'string' },
            location: { type: 'string' },
            description: { type: 'string' },
            salaryMin: { type: 'number', nullable: true },
            salaryMax: { type: 'number', nullable: true },
            salaryCurrency: { type: 'string', nullable: true },
            jobType: { type: 'string', nullable: true },
            experienceLevel: { type: 'string', nullable: true },
            skills: { type: 'array', items: { type: 'string' } },
            sourceUrl: { type: 'string' },
            sourcePlatform: { type: 'string' },
            postedAt: { type: 'string', format: 'date-time' },
            isActive: { type: 'boolean' },
          },
        },
        Application: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            jobId: { type: 'string', format: 'uuid', nullable: true },
            cvId: { type: 'string', format: 'uuid', nullable: true },
            company: { type: 'string' },
            jobTitle: { type: 'string' },
            status: {
              type: 'string',
              enum: ['applied', 'interview', 'offer', 'rejected'],
            },
            appliedDate: { type: 'string', format: 'date-time' },
            atsScore: { type: 'number', nullable: true },
            keywordsMatched: {
              type: 'array',
              items: { type: 'string' },
              nullable: true,
            },
            keywordsMissing: {
              type: 'array',
              items: { type: 'string' },
              nullable: true,
            },
          },
        },
        AtsResult: {
          type: 'object',
          properties: {
            atsScore: { type: 'number', example: 72 },
            breakdown: { type: 'object' },
            keywordsMatched: { type: 'array', items: { type: 'string' } },
            keywordsMissing: { type: 'array', items: { type: 'string' } },
          },
        },
        LearningPath: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            skillId: { type: 'string', format: 'uuid' },
            priority: { type: 'number' },
            status: {
              type: 'string',
              enum: ['not_started', 'in_progress', 'completed'],
            },
            progressPercentage: { type: 'number' },
            estimatedHours: { type: 'number', nullable: true },
          },
        },
        ActivityItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AdminUser: {
          allOf: [
            { $ref: '#/components/schemas/User' },
            {
              type: 'object',
              properties: {
                profile: { $ref: '#/components/schemas/UserProfile' },
                _count: {
                  type: 'object',
                  properties: {
                    cvs: { type: 'number' },
                    applications: { type: 'number' },
                  },
                },
              },
            },
          ],
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            adminId: { type: 'string', format: 'uuid' },
            action: { type: 'string' },
            targetType: { type: 'string', nullable: true },
            targetId: { type: 'string', nullable: true },
            details: { type: 'object', nullable: true },
            ipAddress: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Registration, login, token refresh, email verification' },
      { name: 'Profile', description: 'User profile and career preferences' },
      { name: 'CV', description: 'CV upload, parsing, analysis, and management' },
      { name: 'Jobs', description: 'Job search and statistics (proxied to Job API service)' },
      { name: 'Matching', description: 'Semantic job matching powered by ML service' },
      { name: 'Applications', description: 'Job applications and ATS scoring' },
      { name: 'Salary', description: 'Salary insights and preferences' },
      { name: 'Skill Gap', description: 'Skill gap analysis and learning paths' },
      { name: 'Dashboard', description: 'User activity feed' },
      { name: 'Admin', description: 'Admin-only operations (requires ADMIN role)' },
      { name: 'System', description: 'Health and debug endpoints' },
    ],
    paths: {
      '/api/v1/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                    password: {
                      type: 'string',
                      minLength: 8,
                      example: 'Secret123',
                      description: 'Min 8 chars, must include uppercase, lowercase, and digit',
                    },
                    firstName: { type: 'string', maxLength: 50, example: 'Jane' },
                    lastName: { type: 'string', maxLength: 50, example: 'Doe' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'User registered. Verification email sent.',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              user: { $ref: '#/components/schemas/User' },
                              accessToken: { type: 'string' },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Validation error' },
            '409': { description: 'Email already registered' },
          },
        },
      },
      '/api/v1/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login and receive access token',
          description: 'Returns a JWT access token in the response body and sets a refresh token as an httpOnly cookie.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                    password: { type: 'string', example: 'Secret123' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Authenticated. Access token returned.',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              user: { $ref: '#/components/schemas/User' },
                              accessToken: { type: 'string' },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Validation error' },
            '401': { description: 'Invalid credentials or account disabled' },
          },
        },
      },
      '/api/v1/auth/verify-email': {
        get: {
          tags: ['Auth'],
          summary: 'Verify email address',
          parameters: [
            {
              in: 'query',
              name: 'token',
              required: true,
              schema: { type: 'string' },
              description: 'Email verification token sent to the user',
            },
          ],
          responses: {
            '200': { description: 'Email verified successfully' },
            '400': { description: 'Invalid or expired token' },
          },
        },
      },
      '/api/v1/auth/forgot-password': {
        post: {
          tags: ['Auth'],
          summary: 'Request a password reset email',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Reset email sent (always returns 200 to prevent enumeration)' },
            '400': { description: 'Validation error' },
          },
        },
      },
      '/api/v1/auth/reset-password': {
        post: {
          tags: ['Auth'],
          summary: 'Reset password using token from email',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'password'],
                  properties: {
                    token: { type: 'string', example: 'abc123resettoken' },
                    password: {
                      type: 'string',
                      minLength: 8,
                      example: 'NewSecret123',
                      description: 'Min 8 chars, must include uppercase, lowercase, and digit',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Password reset successfully' },
            '400': { description: 'Invalid or expired token' },
          },
        },
      },
      '/api/v1/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          description: 'Uses the httpOnly refresh token cookie to issue a new access token.',
          responses: {
            '200': {
              description: 'New access token issued',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: { accessToken: { type: 'string' } },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '401': { description: 'No refresh token or token invalid/expired' },
          },
        },
      },
      '/api/v1/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout (clears refresh token cookie)',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Logged out successfully' },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/api/v1/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get currently authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Current user data',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: { data: { $ref: '#/components/schemas/User' } },
                      },
                    ],
                  },
                },
              },
            },
            '401': { description: 'Not authenticated' },
          },
        },
      },

      '/api/v1/profile/preferences': {
        get: {
          tags: ['Profile'],
          summary: 'Get career preferences',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Career preferences',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                },
              },
            },
            '401': { description: 'Not authenticated' },
          },
        },
        put: {
          tags: ['Profile'],
          summary: 'Update career preferences',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    targetRole: { type: 'string', example: 'Senior Software Engineer' },
                    experienceLevel: {
                      type: 'string',
                      enum: ['junior', 'mid', 'senior'],
                    },
                    location: { type: 'string', example: 'London, UK' },
                    workArrangements: {
                      type: 'array',
                      items: { type: 'string', enum: ['remote', 'hybrid', 'on-site'] },
                    },
                    preferredJobTypes: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    salaryRange: {
                      type: 'object',
                      properties: {
                        min: { type: 'number' },
                        max: { type: 'number' },
                        currency: { type: 'string', example: 'GBP' },
                      },
                    },
                    targetCompanies: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Preferences updated' },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/api/v1/profile/export': {
        get: {
          tags: ['Profile'],
          summary: 'Export all user data (GDPR)',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Full user data export as JSON' },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/api/v1/profile/account': {
        delete: {
          tags: ['Profile'],
          summary: 'Delete user account permanently',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Account deleted' },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/api/v1/profile': {
        put: {
          tags: ['Profile'],
          summary: 'Update profile fields',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    phoneNumber: { type: 'string' },
                    location: { type: 'string' },
                    linkedinUrl: { type: 'string' },
                    githubUrl: { type: 'string' },
                    portfolioUrl: { type: 'string' },
                    jobTitle: { type: 'string' },
                    bio: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Profile updated',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: { data: { $ref: '#/components/schemas/UserProfile' } },
                      },
                    ],
                  },
                },
              },
            },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/api/v1/profile/avatar': {
        post: {
          tags: ['Profile'],
          summary: 'Upload profile avatar',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['avatar'],
                  properties: {
                    avatar: {
                      type: 'string',
                      format: 'binary',
                      description: 'JPEG or PNG, max 5MB',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Avatar uploaded. Returns new avatarUrl.' },
            '400': { description: 'Invalid file type or size exceeded' },
            '401': { description: 'Not authenticated' },
          },
        },
        delete: {
          tags: ['Profile'],
          summary: 'Delete profile avatar',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Avatar deleted' },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/api/v1/profile/{userId}': {
        get: {
          tags: ['Profile'],
          summary: 'Get public profile by user ID',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: 'path',
              name: 'userId',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: 'User profile',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              user: { $ref: '#/components/schemas/User' },
                              profile: { $ref: '#/components/schemas/UserProfile' },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '404': { description: 'User not found' },
          },
        },
      },

      '/api/v1/ml/parse-cv': {
        post: {
          tags: ['CV'],
          summary: 'Upload and parse a CV file',
          description: 'Accepts PDF or DOCX. Forwards to ML service for text extraction and NLP parsing via Claude API. Stores result in MongoDB and creates a CV record in Postgres.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file'],
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                      description: 'PDF or DOCX file',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'CV parsed successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: { data: { $ref: '#/components/schemas/CV' } },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'No file uploaded or unsupported format' },
            '401': { description: 'Not authenticated' },
            '503': { description: 'ML service unavailable' },
          },
        },
      },
      '/api/v1/ml/cvs': {
        get: {
          tags: ['CV'],
          summary: 'List all CVs for the authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of CVs',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: { type: 'array', items: { $ref: '#/components/schemas/CV' } },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/api/v1/ml/cvs/{cvId}': {
        get: {
          tags: ['CV'],
          summary: 'Get a single CV with parsed data',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'cvId', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': {
              description: 'CV with parsed fields',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                },
              },
            },
            '401': { description: 'Not authenticated' },
            '404': { description: 'CV not found' },
          },
        },
        delete: {
          tags: ['CV'],
          summary: 'Delete a CV',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'cvId', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'CV deleted' },
            '401': { description: 'Not authenticated' },
            '404': { description: 'CV not found' },
          },
        },
      },
      '/api/v1/ml/cvs/{cvId}/primary': {
        patch: {
          tags: ['CV'],
          summary: 'Set a CV as the primary CV',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'cvId', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'Primary CV updated' },
            '401': { description: 'Not authenticated' },
            '404': { description: 'CV not found' },
          },
        },
      },
      '/api/v1/ml/cvs/{cvId}/download': {
        get: {
          tags: ['CV'],
          summary: 'Download original CV file',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'cvId', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'File download stream' },
            '401': { description: 'Not authenticated' },
            '404': { description: 'CV not found' },
          },
        },
      },
      '/api/v1/ml/cvs/{cvId}/analyze': {
        post: {
          tags: ['CV'],
          summary: 'Trigger full CV analysis (ATS + quality scoring)',
          description: 'Calls ML service to run ATS scoring, keyword extraction, and CV quality analysis. Results are stored back on the CV record.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'cvId', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': {
              description: 'Analysis complete',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                },
              },
            },
            '401': { description: 'Not authenticated' },
            '404': { description: 'CV not found' },
            '503': { description: 'ML service unavailable' },
          },
        },
      },
      '/api/v1/ml/health': {
        get: {
          tags: ['System'],
          summary: 'ML service health check (no auth required)',
          responses: {
            '200': { description: 'ML service status' },
          },
        },
      },

      '/api/v1/jobs/search': {
        get: {
          tags: ['Jobs'],
          summary: 'Search jobs by keywords and location',
          description: 'Queries stored jobs from the Job API service MongoDB collection.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: 'query',
              name: 'keywords',
              required: true,
              schema: { type: 'string', example: 'python developer' },
            },
            {
              in: 'query',
              name: 'location',
              required: true,
              schema: { type: 'string', example: 'London' },
            },
            {
              in: 'query',
              name: 'country',
              required: false,
              schema: { type: 'string', example: 'gb' },
            },
          ],
          responses: {
            '200': {
              description: 'Job search results',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                },
              },
            },
            '400': { description: 'Missing keywords or location' },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/api/v1/jobs/stats': {
        get: {
          tags: ['Jobs'],
          summary: 'Job database statistics',
          description: 'Returns counts by source, country, and job type from Job API service.',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Job stats' },
            '401': { description: 'Not authenticated' },
          },
        },
      },

      '/api/v1/matching/find-jobs': {
        post: {
          tags: ['Matching'],
          summary: 'Get personalised job recommendations',
          description: "Uses the user's primary CV (or specified CV) and sentence-transformer embeddings to rank jobs semantically. Returns top-k matches.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cv_id: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Use a specific CV. Defaults to primary CV.',
                    },
                    top_k: {
                      type: 'integer',
                      default: 20,
                      example: 10,
                      description: 'Number of results to return',
                    },
                    filters: {
                      type: 'object',
                      properties: {
                        location: { type: 'string' },
                        salaryMin: { type: 'number' },
                        remote: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Ranked job matches',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                },
              },
            },
            '400': {
              description: 'NO_CV - user has no CV uploaded, or NO_JOBS - empty job database',
            },
            '401': { description: 'Not authenticated' },
            '503': { description: 'ML service unavailable' },
          },
        },
      },
      '/api/v1/matching/diagnostics': {
        get: {
          tags: ['Matching'],
          summary: 'Diagnostics for troubleshooting matching issues',
          description: 'Checks MongoDB connection, CV existence, job count, and ML service availability.',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Diagnostic results' },
            '401': { description: 'Not authenticated' },
          },
        },
      },

      '/api/v1/applications/ats-check': {
        post: {
          tags: ['Applications'],
          summary: 'Check ATS score against a pasted job description',
          description: 'No job record needed. User pastes raw job description text. Uses primary CV by default.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['jobDescription'],
                  properties: {
                    jobDescription: {
                      type: 'string',
                      minLength: 20,
                      maxLength: 10000,
                      example: 'We are looking for a Python developer with 3+ years experience...',
                    },
                    cvId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Override which CV to use. Defaults to primary CV.',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'ATS result',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: { data: { $ref: '#/components/schemas/AtsResult' } },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Invalid job description or no primary CV' },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/api/v1/applications/jobs/{jobId}/ats-preview': {
        post: {
          tags: ['Applications'],
          summary: 'Preview ATS score for a job in the database',
          description: 'Calculates ATS score against a stored job record without creating an application.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'jobId', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cvId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Specific CV to score against. Defaults to primary CV.',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'ATS preview result',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: { data: { $ref: '#/components/schemas/AtsResult' } },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'No primary CV set' },
            '401': { description: 'Not authenticated' },
            '404': { description: 'Job not found' },
          },
        },
      },
      '/api/v1/applications/{applicationId}/ats-score': {
        post: {
          tags: ['Applications'],
          summary: 'Calculate and persist ATS score for an application',
          description: 'Scores the CV against the linked job description and stores the result on the application record.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: 'path',
              name: 'applicationId',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cvId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Override CV. Defaults to CV linked to the application or primary CV.',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'ATS score calculated and saved',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: { data: { $ref: '#/components/schemas/AtsResult' } },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Application not linked to a job, or no CV available' },
            '401': { description: 'Not authenticated' },
            '404': { description: 'Application not found' },
          },
        },
      },

      '/api/v1/salary/insights': {
        get: {
          tags: ['Salary'],
          summary: 'Get salary insights for the user',
          description: 'Uses the ML service XGBoost model with user role, location, and experience. Results are cached for 2h.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'role', schema: { type: 'string' }, example: 'Software Engineer' },
            { in: 'query', name: 'location', schema: { type: 'string' }, example: 'London' },
            { in: 'query', name: 'country', schema: { type: 'string' }, example: 'GB' },
          ],
          responses: {
            '200': { description: 'Salary insights data' },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/api/v1/salary/preferences': {
        patch: {
          tags: ['Salary'],
          summary: 'Save salary preferences for future insight queries',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    targetRole: { type: 'string' },
                    location: { type: 'string' },
                    country: { type: 'string', example: 'GB' },
                    experienceLevel: {
                      type: 'string',
                      enum: ['junior', 'mid', 'senior'],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Preferences saved' },
            '401': { description: 'Not authenticated' },
          },
        },
      },

      '/api/v1/skill-gap/analyze': {
        post: {
          tags: ['Skill Gap'],
          summary: 'Analyse skill gap for a target role',
          description: 'Compares skills in the primary CV against requirements for the target role. Generates learning paths and course recommendations.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['targetRole'],
                  properties: {
                    targetRole: { type: 'string', example: 'Senior Data Scientist' },
                    cvId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Specific CV to analyse. Defaults to primary CV.',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Skill gap analysis with learning path recommendations' },
            '400': { description: 'No primary CV or missing targetRole' },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/api/v1/skill-gap/learning-paths': {
        get: {
          tags: ['Skill Gap'],
          summary: "List the user's learning paths",
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Learning paths',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/LearningPath' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/api/v1/skill-gap/learning-paths/{learningPathId}': {
        get: {
          tags: ['Skill Gap'],
          summary: 'Get learning path details with course list',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: 'path',
              name: 'learningPathId',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': { description: 'Learning path with courses' },
            '401': { description: 'Not authenticated' },
            '404': { description: 'Learning path not found' },
          },
        },
      },
      '/api/v1/skill-gap/learning-paths/{learningPathId}/progress': {
        patch: {
          tags: ['Skill Gap'],
          summary: 'Update learning path progress',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: 'path',
              name: 'learningPathId',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    progressPercentage: { type: 'number', minimum: 0, maximum: 100 },
                    status: {
                      type: 'string',
                      enum: ['not_started', 'in_progress', 'completed'],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Progress updated' },
            '401': { description: 'Not authenticated' },
            '404': { description: 'Learning path not found' },
          },
        },
      },
      '/api/v1/skill-gap/courses/{courseId}/progress': {
        patch: {
          tags: ['Skill Gap'],
          summary: 'Update course enrollment progress',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: 'path',
              name: 'courseId',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    progress: { type: 'number', minimum: 0, maximum: 100 },
                    status: {
                      type: 'string',
                      enum: ['not_started', 'in_progress', 'completed'],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Course progress updated' },
            '401': { description: 'Not authenticated' },
            '404': { description: 'Course not found' },
          },
        },
      },
      '/api/v1/skill-gap/summary': {
        get: {
          tags: ['Skill Gap'],
          summary: 'Progress summary across all learning paths',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Progress summary' },
            '401': { description: 'Not authenticated' },
          },
        },
      },

      '/api/v1/dashboard/recent-activity': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get recent user activity feed',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: 'query',
              name: 'limit',
              schema: { type: 'integer', default: 10 },
              description: 'Number of activity items to return',
            },
          ],
          responses: {
            '200': {
              description: 'Recent activity items',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/ActivityItem' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '401': { description: 'Not authenticated' },
          },
        },
      },

      '/api/v1/admin/dashboard/stats': {
        get: {
          tags: ['Admin'],
          summary: 'Admin dashboard statistics',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Platform-wide statistics (user count, CV count, etc.)' },
            '401': { description: 'Not authenticated' },
            '403': { description: 'Not an admin' },
          },
        },
      },
      '/api/v1/admin/dashboard/user-growth': {
        get: {
          tags: ['Admin'],
          summary: 'User growth trend data',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'User signups grouped by time period' },
            '403': { description: 'Not an admin' },
          },
        },
      },
      '/api/v1/admin/users': {
        get: {
          tags: ['Admin'],
          summary: 'List all users (paginated)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
            { in: 'query', name: 'search', schema: { type: 'string' } },
            {
              in: 'query',
              name: 'role',
              schema: { type: 'string', enum: ['USER', 'ADMIN'] },
            },
          ],
          responses: {
            '200': {
              description: 'Paginated user list',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              users: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/AdminUser' },
                              },
                              total: { type: 'number' },
                              page: { type: 'number' },
                              totalPages: { type: 'number' },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '403': { description: 'Not an admin' },
          },
        },
      },
      '/api/v1/admin/users/{userId}': {
        get: {
          tags: ['Admin'],
          summary: 'Get full user detail',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'userId', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'Full user record with relations' },
            '403': { description: 'Not an admin' },
            '404': { description: 'User not found' },
          },
        },
        delete: {
          tags: ['Admin'],
          summary: 'Delete a user permanently',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'userId', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'User deleted' },
            '403': { description: 'Not an admin' },
            '404': { description: 'User not found' },
          },
        },
      },
      '/api/v1/admin/users/{userId}/status': {
        patch: {
          tags: ['Admin'],
          summary: 'Enable or disable a user account',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'userId', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['isDisabled'],
                  properties: {
                    isDisabled: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Status updated' },
            '403': { description: 'Not an admin' },
          },
        },
      },
      '/api/v1/admin/users/{userId}/promote': {
        post: {
          tags: ['Admin'],
          summary: 'Promote user to ADMIN role',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'userId', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'User promoted to admin' },
            '403': { description: 'Not an admin' },
            '404': { description: 'User not found' },
          },
        },
      },
      '/api/v1/admin/users/{userId}/demote': {
        post: {
          tags: ['Admin'],
          summary: 'Demote user from ADMIN to USER role',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'userId', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'User demoted to regular user' },
            '403': { description: 'Not an admin' },
          },
        },
      },
      '/api/v1/admin/users/{userId}/force-reset-password': {
        post: {
          tags: ['Admin'],
          summary: 'Force a password reset for a user',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'userId', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'Reset email sent to user' },
            '403': { description: 'Not an admin' },
            '404': { description: 'User not found' },
          },
        },
      },
      '/api/v1/admin/jobs': {
        get: {
          tags: ['Admin'],
          summary: 'List jobs (paginated)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
            { in: 'query', name: 'search', schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Paginated job list' },
            '403': { description: 'Not an admin' },
          },
        },
      },
      '/api/v1/admin/jobs/stats': {
        get: {
          tags: ['Admin'],
          summary: 'Job statistics by source, platform, country',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Job stats' },
            '403': { description: 'Not an admin' },
          },
        },
      },
      '/api/v1/admin/jobs/fetch': {
        post: {
          tags: ['Admin'],
          summary: 'Manually trigger a job fetch from external APIs',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Job fetch triggered' },
            '403': { description: 'Not an admin' },
          },
        },
      },
      '/api/v1/admin/jobs/cleanup': {
        post: {
          tags: ['Admin'],
          summary: 'Manually trigger cleanup of expired jobs',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Cleanup triggered' },
            '403': { description: 'Not an admin' },
          },
        },
      },
      '/api/v1/admin/jobs/{jobId}': {
        delete: {
          tags: ['Admin'],
          summary: 'Delete a job by ID',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'jobId', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'Job deleted' },
            '403': { description: 'Not an admin' },
            '404': { description: 'Job not found' },
          },
        },
      },
      '/api/v1/admin/system/health': {
        get: {
          tags: ['Admin'],
          summary: 'All-service health check (Postgres, MongoDB, Redis, ML service)',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Health status of each service' },
            '403': { description: 'Not an admin' },
          },
        },
      },
      '/api/v1/admin/system/cache': {
        get: {
          tags: ['Admin'],
          summary: 'Redis cache statistics',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Cache hit/miss counts and key patterns' },
            '403': { description: 'Not an admin' },
          },
        },
      },
      '/api/v1/admin/system/queues': {
        get: {
          tags: ['Admin'],
          summary: 'Bull queue status (waiting, active, completed, failed)',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Queue depths for all queues' },
            '403': { description: 'Not an admin' },
          },
        },
      },
      '/api/v1/admin/system/database': {
        get: {
          tags: ['Admin'],
          summary: 'Database statistics (row counts, sizes)',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Database stats' },
            '403': { description: 'Not an admin' },
          },
        },
      },
      '/api/v1/admin/audit-logs': {
        get: {
          tags: ['Admin'],
          summary: 'Admin audit log (paginated)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 } },
            { in: 'query', name: 'action', schema: { type: 'string' } },
            { in: 'query', name: 'adminId', schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': {
              description: 'Audit logs',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/AuditLog' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '403': { description: 'Not an admin' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
