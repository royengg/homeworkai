# HomeworkAI

HomeworkAI is a production-grade SaaS application designed to help students and educators analyze homework documents using advanced AI. By combining robust PDF parsing with Google's Gemini AI, the platform provides step-by-step solutions and detailed explanations for complex academic problems.

---

## Features

### Strategic AI Analysis
- **Advanced PDF Parsing**: High-fidelity text extraction from academic documents.
- **AI Engine**: Google Gemini 2.5 Flash (Optimized for speed and long-form assignments)
- **Step-by-Step Solutions**: Don't just get the answer—understand the process with detailed workings.

### Production Hardening
- **Security First**: JWT-based authentication, password hashing, and secure S3 file storage.
- **Rate Limiting**: Protects expensive AI resources using Redis-backed rate limiters.
- **Reliable Backing**: Asynchronous job processing with BullMQ and Redis for robust analysis handling.
- **Monitoring**: Structured logging with Winston and health check endpoints.

### Modern SaaS UI
- **Clean Aesthetic**: A minimal, professional interface built with Tailwind CSS and Shadcn/UI.
- **Responsive Design**: Fully mobile-friendly sidebar navigation and document viewer.
- **Real-time Status**: Live updates for document parsing and analysis stages.

---

## Tech Stack

### Backend
- **Framework**: Node.js & Express (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Queue System**: BullMQ / Redis
- **AI Integration**: Google Generative AI (Gemini)
- **Storage**: Amazon S3 / MinIO
- **Validation**: Zod (Schema validation)

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS & Framer Motion
- **Components**: Shadcn/UI (Radix UI)
- **State/Routing**: React Router v6

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed:
- Node.js (v18+)
- PostgreSQL
- Redis
- MinIO or an AWS S3 Bucket

### 2. Environment Setup

#### Backend (`/backend/.env`)
```env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/homeworkai"
JWT_SECRET="your_secure_jwt_secret"
GOOGLE_API_KEY="your_gemini_api_key"
REDIS_URL="redis://localhost:6379"
STORAGE_ENDPOINT="http://localhost:9000"
STORAGE_ACCESS_KEY="minio_access_key"
STORAGE_SECRET_KEY="minio_secret_key"
STORAGE_BUCKET="homeworkai"
STORAGE_REGION="us-east-1"
```

#### Frontend (`/frontend/.env`)
```env
VITE_API_URL="http://localhost:3000"
```

### 3. Installation & Launch

#### Setup Database
```bash
cd backend
npm install
npx prisma migrate dev
```

#### Start Services
Open two terminals for the backend:
```bash
# Terminal 1: API Server
npm run dev:api

# Terminal 2: Analysis Worker
npm run dev:worker
```

Start the frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Project Structure

```text
homeworkai/
├── backend/                # Express API & Workers
│   ├── prisma/             # DB Schema & Migrations
│   └── src/
│       ├── controllers/    # Request handling logic
│       ├── middleware/     # Auth, Rate limiting, Logging
│       ├── processors/      # BullMQ background workers
│       └── services/       # AI, S3, and DB services
├── frontend/               # React Application
│   └── src/
│       ├── components/     # Shadcn/UI & custom components
│       ├── lib/            # API client & utilities
│       └── pages/          # Layout-wrapped page views
└── README.md
```

---
