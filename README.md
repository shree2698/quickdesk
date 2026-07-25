# QuickDesk — AI-Assisted Internal Helpdesk

QuickDesk is an enterprise-ready, internal corporate helpdesk application enhanced with generative AI and Retrieval-Augmented Generation (RAG). Employees submit support tickets, and AI automatically classifies categories/priorities and assists agents by drafting responses grounded in corporate knowledge base documentation.

---

## 📋 Table of Contents
- [Prerequisites](#-prerequisites)
- [Step-by-Step Local Setup](#-step-by-step-local-setup)
- [Available npm Scripts](#-available-npm-scripts)
- [Database & Vector Store Management](#-database--vector-store-management)
- [Default Login Credentials](#-default-login-credentials)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [API Reference & OpenAPI Docs](#-api-reference--openapi-docs)
- [Troubleshooting Common Issues](#-troubleshooting-common-issues)

---

## 🛠️ Prerequisites

Ensure you have the following software installed before starting:
- **Node.js**: `v20.x` or higher (`node -v`)
- **npm**: `v10.x` or higher (`npm -v`)
- **Docker Desktop**: Running and healthy (`docker info`)
- **Google Gemini API Key**: Optional (Get a free key at [Google AI Studio](https://aistudio.google.com/)). Fallbacks are provided if omitted.

---

## 🚀 Step-by-Step Local Setup

Follow these exact steps to run QuickDesk on a fresh clone:

### Step 1: Clone & Configure Environment Variables
Copy the root `.env.example` file to `.env`:

```bash
cp .env.example .env
```

*(Optionally open `.env` and add your `GEMINI_API_KEY="your-api-key-here"` for live AI predictions and RAG embeddings).*

---

### Step 2: Install Dependencies
Install all workspace dependencies from the root repository directory:

```bash
npm install
```

---

### Step 3: Start PostgreSQL Container with pgvector
Spin up PostgreSQL 16 with pre-configured `pgvector` extension support:

```bash
npm run db:up
```

*(To verify the container is healthy, run `docker ps` and check for container `quickdesk-postgres`)*.

---

### Step 4: Run Prisma Database Migrations
Generate the Prisma Client and push schema tables (`users`, `tickets`, `messages`, `audit_logs`, `knowledge_articles`, `knowledge_article_chunks`) to PostgreSQL:

```bash
# Generate Prisma Client types
npm run prisma:generate

# Push schema to database
npm run prisma:push
```

---

### Step 5: Seed Database & Index Knowledge Base
Populate default users (`ADMIN`, `AGENT`, `EMPLOYEE`), seed sample tickets, and parse/chunk/index all markdown documentation from `knowledge-base/` into vector embeddings:

```bash
npm run db:seed
```

---

### Step 6: Start Application Servers
Run both Backend NestJS API (`http://localhost:5000`) and Frontend Next.js (`http://localhost:3000`) concurrently:

```bash
npm run dev
```

> 🌐 **Application Interfaces:**
> - **Frontend Web App**: [http://localhost:3000](http://localhost:3000)
> - **Backend NestJS API**: [http://localhost:5000](http://localhost:5000)
> - **Swagger OpenAPI Specs**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)

---

## ⚙️ Available npm Scripts

All scripts can be executed directly from the root workspace directory:

| Command | Purpose |
|---------|---------|
| `npm run bootstrap` | Clean install all root and workspace dependencies |
| `npm run dev` | Run Backend and Frontend servers concurrently |
| `npm run dev:backend` | Start only NestJS backend in hot-reload mode (`http://localhost:5000`) |
| `npm run dev:frontend` | Start only Next.js frontend in development mode (`http://localhost:3000`) |
| `npm run build` | Build production bundles for both backend and frontend |
| `npm run start` | Run production build servers concurrently |
| `npm run db:up` | Start PostgreSQL container (`pgvector/pgvector:pg16`) |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run prisma:generate` | Generate Prisma Client types from `schema.prisma` |
| `npm run prisma:push` | Sync Prisma schema with PostgreSQL database |
| `npm run prisma:migrate` | Create and apply database migration files |
| `npm run prisma:reset` | Force reset database (drops all data & re-runs migrations) |
| `npm run db:seed` | Run database seed script (populates users, tickets, KB vector chunks) |
| `npm run db:reset` | Reset database and automatically re-seed initial data (`prisma:reset` + `db:seed`) |

---

## 🗄️ Database & Vector Store Management

QuickDesk uses **PostgreSQL + pgvector** to power semantic search over company Knowledge Base articles.

### Standard Reset Flow
If you want to clear all data and start completely clean:

```bash
npm run db:reset
```

### Knowledge Base Document Addition
To add new articles to the RAG knowledge base:
1. Create a markdown file inside `knowledge-base/my-article.md`.
2. Run `npm run db:seed` to automatically split into 500-char chunks and embed them into PostgreSQL.

---

## 🔑 Default Login Credentials

Seed data creates pre-configured accounts with bcrypt-hashed passwords for instant testing:

| Role | Email | Password | Allowed Access / Dashboard |
|------|-------|----------|----------------------------|
| **Admin** | `admin@quickdesk.com` | `admin123` | Full access, override audit logs, metrics dashboard |
| **Support Agent** | `agent@quickdesk.com` | `agent123` | Ticket queue `/agent/dashboard`, AI Copilot, ticket detail `/agent/tickets/[id]`, `/agent/metrics` |
| **Support Agent #2** | `sarah.agent@quickdesk.com` | `agent123` | Alternate agent account for testing real-time queue synchronization |
| **Employee** | `employee@quickdesk.com` | `employee123` | Employee portal `/employee/my-tickets`, submit ticket `/employee/submit-ticket`, AI assistant `/employee/ai-assistant` |
| **Employee #2** | `alice@quickdesk.com` | `employee123` | Alternate employee account |

---

## 🏛️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              QUICKDESK SYSTEM                               │
│                                                                             │
│  ┌───────────────────┐     HTTP/WS     ┌──────────────────┐    SQL   ┌────┐ │
│  │     Frontend      │◄───────────────►│     Backend      │◄────────►│ DB │ │
│  │ (Next.js 16/React)│                 │   (NestJS API)   │          │(PG)│ │
│  │                   │                 │                  │          └────┘ │
│  │ - Employee Views  │                 │ - Auth Module    │                 │
│  │ - Agent Queue     │   Socket.io     │ - Tickets Module │   Embed  ┌───┐ │
│  │ - RAG Assistant   │◄───────────────►│ - AI/RAG Module  │◄────────►│VDB│ │
│  │ - Metrics Board   │                 │ - WS Gateway     │          │   │ │
│  └───────────────────┘                 │ - Metrics Module │          └───┘ │
│                                        └────────┬─────────┘                 │
│                                                 │                           │
│                                            ┌────┴────┐                      │
│                                            │ Gemini  │                      │
│                                            │  (LLM)  │                      │
│                                            └─────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Technologies:
- **Frontend**: Next.js 16 (App Router), React 19, Vanilla CSS Design Tokens, Lucide Icons, Axios, Socket.io Client.
- **Backend**: NestJS 11, TypeScript, Passport.js JWT Auth, Socket.io WebSockets, Swagger OpenAPI.
- **Database & ORM**: PostgreSQL 16 + `pgvector` extension, Prisma ORM v7 with `@prisma/adapter-pg`.
- **AI & RAG Pipeline**: `@google/genai` (`gemini-1.5-flash` for classification/copilot, `text-embedding-004` for 768-dim embeddings), `@langchain/textsplitters`.

---

## 📡 API Reference & OpenAPI Docs

QuickDesk features interactive Swagger documentation at **`http://localhost:5000/api/docs`**.

### Summary of Primary Endpoints:

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register new employee/agent account | ❌ Public |
| `POST` | `/api/auth/login` | Authenticate user & return JWT bearer token | ❌ Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | ✅ Bearer JWT |
| `POST` | `/api/tickets` | Submit ticket (triggers AI category/priority prediction) | ✅ Bearer JWT |
| `GET` | `/api/tickets` | Get tickets (Employee: own tickets; Agent: all + filters) | ✅ Bearer JWT |
| `GET` | `/api/tickets/:id` | Get ticket detail, AI draft reply, and message thread | ✅ Bearer JWT |
| `PATCH` | `/api/tickets/:id/category` | Override AI category (logs audit entry) | ✅ Agent / Admin |
| `PATCH` | `/api/tickets/:id/priority` | Override AI priority (logs audit entry) | ✅ Agent / Admin |
| `POST` | `/api/tickets/:id/copilot-suggest` | Generate AI RAG grounded resolution draft + citations | ✅ Agent / Admin |
| `POST` | `/api/tickets/:id/reply` | Send final response & mark ticket `RESOLVED` | ✅ Agent / Admin |
| `GET` | `/api/tickets/:id/audit-log` | Fetch agent override history trail | ✅ Agent / Admin |
| `POST` | `/api/ai/chat` | AI RAG Virtual Assistant Q&A over Knowledge Base | ✅ Bearer JWT |
| `GET` | `/api/metrics/overview` | Ticket counts, median resolution time, AI override % | ✅ Agent / Admin |

---

## ❓ Troubleshooting Common Issues

### 1. `ERROR: extension "vector" is not available`
- **Cause**: Plain PostgreSQL image running without `pgvector`.
- **Fix**: Run `npm run db:down`, update `docker-compose.yml` to use `pgvector/pgvector:pg16`, and execute `npm run db:up`.

### 2. `Table public.users does not exist`
- **Fix**: Run `npm run prisma:generate` followed by `npm run prisma:push` and `npm run db:seed`.

### 3. `No driver (HTTP) has been selected (@nestjs/platform-express)`
- **Fix**: Run `npm install` at the root workspace directory to resolve hoisted workspace dependencies.