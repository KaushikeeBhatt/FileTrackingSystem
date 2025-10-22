```markdown
# File Tracking System - Complete Technical Guide

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Technical Stack](#2-technical-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [API Documentation](#5-api-documentation)
6. [Authentication Flow](#6-authentication-flow)
7. [File Management](#7-file-management)
8. [Search Implementation](#8-search-implementation)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment Guide](#10-deployment-guide)
11. [Security Considerations](#11-security-considerations)
12. [Performance Optimization](#12-performance-optimization)

## 1. Project Overview

### 1.1 Purpose
A comprehensive file management system with role-based access control, audit logging, and real-time notifications.

### 1.2 Key Features
- **User Management**: Authentication, authorization, and role-based access
- **File Operations**: Upload, download, share, and manage files with metadata
- **Search & Filter**: Advanced search capabilities with filtering
- **Audit Logging**: Track all system activities
- **Real-time Notifications**: Instant updates for file activities
- **Admin Dashboard**: Manage users, files, and system settings

## 2. Technical Stack

### 2.1 Frontend
- **Framework**: Next.js 13+ (App Router)
- **UI Components**: Radix UI, Shadcn/UI
- **State Management**: React Context, React Query
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with CSS Modules
- **Real-time**: WebSockets via Socket.io

### 2.2 Backend
- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js with JWT
- **File Storage**: Local filesystem (extensible to S3/Cloud Storage)
- **Search**: MongoDB Text Search
- **Caching**: Redis (optional)

### 2.3 Development Tools
- **Testing**: Jest, React Testing Library, Playwright
- **Linting/Formatting**: ESLint, Prettier
- **Type Checking**: TypeScript
- **Containerization**: Docker
- **CI/CD**: GitHub Actions

## 3. System Architecture

### 3.1 High-Level Architecture
```mermaid
graph TD
    A[Client] -->|HTTPS| B[Next.js Server]
    B -->|MongoDB| C[(Database)]
    B -->|File System| D[(File Storage)]
    B -->|WebSocket| E[Real-time Updates]
    F[Admin Dashboard] --> B
```

### 3.2 Directory Structure
```
app/
├── api/
│   ├── admin/           # Admin endpoints
│   │   ├── files/       # Bulk file operations
│   │   ├── stats/       # System statistics
│   │   └── users/       # User management
│   ├── audit/           # Audit logging
│   │   ├── export/      # Export audit logs
│   │   ├── logs/        # Audit log retrieval
│   │   └── stats/       # Audit statistics
│   ├── auth/            # Authentication
│   │   ├── login/       # User login
│   │   ├── logout/      # User logout
│   │   ├── register/    # User registration
│   │   └── verify/      # Email verification
│   ├── files/           # File operations
│   │   └── [id]/        # File-specific operations
│   │       ├── approve/ # File approval
│   │       ├── delete/  # File deletion
│   │       ├── download/# File download
│   │       └── share/   # File sharing
│   ├── notifications/   # Notification management
│   │   └── [id]/        # Notification operations
│   └── search/          # Search functionality
│       ├── advanced/    # Advanced search
│       ├── save/        # Save search queries
│       ├── saved/       # Retrieve saved searches
│       └── suggestions/ # Search suggestions
├── dashboard/           # Main application
├── login/               # Login page
└── register/            # Registration page

lib/
├── auth/               # Authentication utilities
├── db/                 # Database models
├── middleware/         # API middleware
│   ├── auth.ts         # Authentication
│   └── rate-limit.ts   # Rate limiting
└── utils/              # Helper functions
```

## 4. Database Schema

### 4.1 User Model
```typescript
interface User {
  _id: ObjectId;
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'user';
  department: string;
  avatar?: string;
  lastLogin?: Date;
  emailVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
    };
    theme: 'light' | 'dark' | 'system';
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.2 File Model
```typescript
interface File {
  _id: ObjectId;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedBy: {
    _id: ObjectId;
    name: string;
    email: string;
  };
  department: string;
  category: string;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected';
  metadata: {
    description?: string;
    version: number;
    parentFile?: ObjectId;
    checksum: string;
    dimensions?: {
      width?: number;
      height?: number;
    };
    duration?: number; // For video/audio files
    pages?: number;    // For documents
  };
  permissions: {
    public: boolean;
    sharedWith: Array<{
      userId: ObjectId;
      access: 'view' | 'edit' | 'share';
      expiresAt?: Date;
    }>;
  };
  downloadCount: number;
  viewCount: number;
  lastAccessedAt?: Date;
  deletedAt?: Date;
  isDeleted: boolean;
  storageProvider: 'local' | 's3' | 'gcs';
  storagePath: string;
  thumbnails?: {
    small: string;
    medium: string;
    large: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

### 4.3 Audit Log Model
```typescript
interface AuditLog {
  _id: ObjectId;
  action: string;  // e.g., 'UPLOAD', 'DOWNLOAD', 'DELETE', 'SHARE', 'LOGIN'
  userId: ObjectId;
  userAgent: string;
  ipAddress: string;
  resourceType: string;  // 'FILE', 'USER', etc.
  resourceId: ObjectId;
  metadata: Record<string, any>;
  status: 'success' | 'failed';
  error?: string;
  timestamp: Date;
}
## 5. API Documentation

### 5.1 Authentication

#### `POST /api/auth/register`
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securePassword123",
  "department": "IT"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "department": "IT"
  }
}

5.2 File Operations (New)
POST /api/files/upload

POST /api/files/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <binary>
category: documents
department: IT
description: Quarterly report
tags: report, q1, 2023

Response:
{
  "success": true,
  "fileId": "507f1f77bcf86cd799439012",
  "message": "File uploaded successfully"
}

5.3 Search 
GET /api/search/advanced

GET /api/search/advanced?q=quarterly+report&department=IT&type=pdf&page=1&limit=10
Authorization: Bearer <token>

Response:
{
  "results": [
    {
      "id": "507f1f77bcf86cd799439011",
      "filename": "Q1-Report-2023.pdf",
      "originalName": "Q1-Report-2023.pdf",
      "mimeType": "application/pdf",
      "size": 2457600,
      "department": "IT",
      "tags": ["report", "q1", "2023"],
      "uploadedBy": {
        "id": "507f1f77bcf86cd799439012",
        "name": "John Doe"
      },
      "createdAt": "2023-04-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

**Common Pitfalls:**
- Not validating email format on client and server side
- Weak password requirements
- Not hashing passwords before storage
- Not handling duplicate email errors gracefully

**Best Practices:**
- Use strong password hashing (bcrypt with at least 10 rounds)
- Implement rate limiting to prevent brute force attacks
- Validate all input fields on both client and server
- Return generic error messages to avoid information leakage

## 6. Authentication Flow

### 6.1 Login Process
User submits credentials via /api/auth/login
Server validates credentials against database
JWT token generated with user role and permissions
Token stored in HTTP-only cookie
Session established with refresh token
Login attempt logged in audit trail

###6.2 Token Refresh Flow
Client detects token expiration
Request new token using refresh token
Server validates refresh token
Issues new access token
Updates last active timestamp
6.3 Security Features
Rate limiting on authentication endpoints
Account lockout after failed attempts
Secure password hashing (bcrypt)
Token invalidation on logout
Session management


#### Login Sequence Diagram
```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant D as Database

    C->>S: POST /api/auth/login
    S->>D: Verify credentials
    D-->>S: User data
    S->>S: Generate JWT
    S-->>C: Set HTTP-only cookie with JWT
    C->>S: Subsequent requests with cookie
    S->>S: Verify JWT
    S-->>C: Protected resource
```

**Best Practices:**
- Use HTTP-only cookies for JWT storage
- Implement refresh token rotation
- Set appropriate CORS policies
- Use secure and same-site cookie attributes

## 7. File Management

### 7.1 Upload Process
Client-side validation (file size, type)
Server-side validation
File checksum calculation
Duplicate detection
File stored in configured storage
Metadata saved to database
Audit log entry created
Notifications triggered (if applicable)

#### File Upload Flow
```mermaid
graph TD
    A[Start Upload] --> B[Client-side Validation]
    B -->|Valid| C[Generate File Hash]
    B -->|Invalid| D[Show Error]
    C --> E[Check if File Exists]
    E -->|Exists| F[Return Existing File]
    E -->|New| G[Upload to Storage]
    G --> H[Save Metadata to DB]
    H --> I[Trigger Notifications]
    I --> J[Return Success]
```

### 7.2 Download Process
Check user permissions
Verify file exists and is accessible
Stream file from storage
Track download in audit log
Update file access statistics

#### File Download Flow
```mermaid
graph TD
    A[Start Download] --> B[Check Permissions]
    B -->|Allowed| C[Verify File Exists]
    B -->|Forbidden| D[Return Error]
    C -->|Exists| E[Stream File]
    C -->|Does Not Exist| F[Return Error]
    E --> G[Track Download]
    G --> H[Update Access Stats]
    H --> I[Return File]

### 7.3 File Sharing
Owner selects file and sets permissions
System validates target user/group
Access control entry created
Notification sent to recipient
Audit log entry created

#### File Sharing Flow
```mermaid
graph TD
    A[Start Sharing] --> B[Select File]
    B --> C[Set Permissions]
    C --> D[Validate Target User/Group]
    D -->|Valid| E[Create Access Control Entry]
    D -->|Invalid| F[Return Error]
    E --> G[Send Notification]
    G --> H[Create Audit Log]
    H --> I[Return Success]
```

### 7.4 File Deletion
Owner selects file to delete
System validates ownership
File deleted from storage
Metadata removed from database
Audit log entry created

#### File Deletion Flow
```mermaid
graph TD
    A[Start Deletion] --> B[Select File]
    B --> C[Validate Ownership]
    C -->|Valid| D[Delete File]
    C -->|Invalid| E[Return Error]
    D --> F[Remove Metadata]
    F --> G[Create Audit Log]
    G --> H[Return Success]
```

### 7.5 File Metadata Update
Owner selects file to update
System validates ownership
Metadata updated in database
Audit log entry created

#### File Metadata Update Flow
```mermaid
graph TD
    A[Start Update] --> B[Select File]
    B --> C[Validate Ownership]
    C -->|Valid| D[Update Metadata]
    C -->|Invalid| E[Return Error]
    D --> F[Create Audit Log]
    F --> G[Return Success]
```

### 7.6 File Versioning
Owner selects file to update
System validates ownership
New version created
Metadata updated in database
Audit log entry created

#### File Versioning Flow
```mermaid
graph TD
    A[Start Update] --> B[Select File]
    B --> C[Validate Ownership]
    C -->|Valid| D[Create New Version]
    C -->|Invalid| E[Return Error]
    D --> F[Update Metadata]
    F --> G[Create Audit Log]
    G --> H[Return Success]
```

### 7.7 File Metadata Update
Owner selects file to update
System validates ownership
Metadata updated in database
Audit log entry created

#### File Metadata Update Flow
```mermaid
graph TD
    A[Start Update] --> B[Select File]
    B --> C[Validate Ownership]
    C -->|Valid| D[Update Metadata]
    C -->|Invalid| E[Return Error]
    D --> F[Create Audit Log]
    F --> G[Return Success]
```
```

**Code Example: File Download Handler**
```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id;
    
    // Verify file exists and user has permission
    const file = await getFileById(fileId, req.user.id);
    if (!file) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Create read stream
    const fileStream = createReadStream(file.path);
    
    // Track download in audit log
    await createAuditLog({
      action: 'DOWNLOAD',
      userId: req.user.id,
      resourceId: fileId,
      resourceType: 'FILE',
      metadata: {
        filename: file.originalName,
        size: file.size
      }
    });

    // Return file as attachment
    return new NextResponse(fileStream, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
        'Content-Length': file.size.toString()
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    return new NextResponse('Download failed', { status: 500 });
  }
}
```

## 8. Search Implementation

### 8.1 Authentication
JWT with RSA256 signing
Refresh token rotation
Secure cookie settings
CSRF protection
Rate limiting

### 8.2 Search Features
- Full-text search across filename, description, and tags
- Filter by metadata (department, file type, upload date)
- Sorting and pagination
- Faceted search results

8.3 Data Protection
Encryption at rest (AES-256)
Secure file storage
Input validation
Output encoding
Secure headers (CSP, HSTS)

### 8.4 Audit & Compliance
Comprehensive audit logging
Immutable audit trail
Regular security reviews
Compliance with data protection regulations

### 8.5 Search API

#### `GET /api/search`
```http
GET /api/search?q=quarterly+report&department=IT&type=pdf&page=1&limit=10
Authorization: Bearer <token>
```

**Response:**
```json
{
  "results": [
    {
      "id": "507f1f77bcf86cd799439011",
      "filename": "Q1-Report-2023.pdf",
      "originalName": "Q1-Report-2023.pdf",
      "mimeType": "application/pdf",
      "size": 2457600,
      "department": "IT",
      "tags": ["report", "q1", "2023"],
      "metadata": {
        "description": "Quarterly financial report Q1 2023"
      },
      "uploadedBy": {
        "id": "507f1f77bcf86cd799439012",
        "name": "John Doe"
      },
      "createdAt": "2023-04-01T10:00:00Z",
      "updatedAt": "2023-04-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  },
  "facets": {
    "departments": [
      { "name": "IT", "count": 10 },
      { "name": "Finance", "count": 5 }
    ],
    "fileTypes": [
      { "name": "PDF", "count": 8 },
      { "name": "DOCX", "count": 5 },
      { "name": "XLSX", "count": 2 }
    ]
  }
}
```

## 9. Testing Strategy

### 9.1 Caching
Redis for session storage
File metadata caching
Query result caching
CDN integration

### 9.2 Database
Index optimization
Query optimization
Connection pooling
Read replicas

### 9.3 File Operations
Chunked uploads
Parallel processing
Background jobs
Storage optimization  

### 9.4 Test Types
- **Unit Tests**: Test individual components and utilities in isolation
  - Components: 80%+ coverage
  - Utils: 90%+ coverage
- **Integration Tests**: Test API endpoints and database interactions
  - API endpoints: 85%+ coverage
  - Database operations: 90%+ coverage
- **E2E Tests**: Test complete user flows with Playwright
  - Critical paths: 100% coverage
  - Main user journeys: 90%+ coverage
- **Performance Tests**: Load testing with k6
  - Target: Handle 1000 concurrent users
  - Response time < 500ms for 95% of requests
- **Security Tests**: Regular scanning with OWASP ZAP
  - Monthly security scans
  - Zero critical vulnerabilities

### 9.5 Test Configuration (jest.config.js)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  }
};

### 9.6 CI/CD Pipeline  

name: CI/CD Pipeline
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: '18.x' }
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
```

## 10. Deployment Guide

### 10.1 Logging
Structured logging
Log rotation
Centralized log management
Alerting

### 10.2 Monitoring
System metrics
Application metrics
User activity
Error tracking

### 10.3 Backup & Recovery
Regular backups
Disaster recovery plan
Data retention policy
Backup verification

### 10.4 Docker Compose Example
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongo

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

## 11. Security Considerations

### 11.1 Security Headers (next.config.js)
```javascript
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Content-Security-Policy', 
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" 
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

### 11.2 Docker Compose Example
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - FILE_STORAGE_PATH=/app/uploads
    volumes:
      - uploads:/app/uploads
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_INITDB_ROOT_USERNAME}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_INITDB_ROOT_PASSWORD}

  redis:
    image: redis:7.0
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  mongo-express:
    image: mongo-express
    ports:
      - "8081:8081"
    environment:
      - ME_CONFIG_MONGODB_SERVER=mongo
      - ME_CONFIG_MONGODB_ADMINUSERNAME=${MONGO_INITDB_ROOT_USERNAME}
      - ME_CONFIG_MONGODB_ADMINPASSWORD=${MONGO_INITDB_ROOT_PASSWORD}
    depends_on:
      - mongo

volumes:
  mongo-data:
  redis-data:
  uploads:

11.2 Environment Variables
# Application
NODE_ENV=production
PORT=3000
BASE_URL=https://yourdomain.com

# Database
MONGODB_URI=mongodb://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@mongo:27017/filetracking?authSource=admin
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=securepassword

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# File Storage
FILE_STORAGE=local  # or 's3', 'gcs'
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800  # 50MB
ALLOWED_FILE_TYPES=.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif

# Redis
REDIS_URL=redis://redis:6379

# Email (for notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=yourpassword
SMTP_FROM=noreply@yourdomain.com

# Security
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGINS=https://yourdomain.com,http://localhost:3000

```

## 12. Performance Optimization

### 12.1 Frontend
- Code splitting with dynamic imports
- Image optimization with Next.js Image component
- Client-side caching with React Query
- Lazy loading of non-critical components

### 12.2 Backend
- Database indexing for frequently queried fields
- Query optimization and projection
- Caching with Redis for expensive operations
- Connection pooling for database connections

### 12.3 File Operations
- Stream large files instead of loading into memory
- Implement chunked uploads for large files
- Use background jobs for processing heavy operations

### 12. Testing Strategy (Enhanced)
12.1 Test Types
Unit Tests: Components, utilities, services
Integration Tests: API endpoints, database operations
E2E Tests: User flows, cross-browser testing
Performance Tests: Load testing, stress testing
Security Tests: Vulnerability scanning, penetration testing

### 12.2 Test Coverage
Authentication & Authorization
File operations (upload, download, delete, share)
Search functionality
Notifications
Error handling
Edge cases

### 12.3 Testing Tools
Jest (unit/integration)
React Testing Library (components)
Playwright (E2E)
k6 (load testing)
OWASP ZAP (security testing)

### 13. Future Enhancements

#### 13.1 Planned Features
Real-time collaboration
Version control for files
Advanced search with AI/ML
Mobile app
Two-factor authentication

#### 13.2 Technical Debt
Code refactoring
Test coverage improvement
Documentation
Performance optimization

#### 13.3 Scaling
Microservices architecture
Container orchestration (Kubernetes)
Multi-region deployment
Serverless functions
```