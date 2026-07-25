# QuickDesk — AI-Assisted Internal Helpdesk

QuickDesk is an internal corporate helpdesk application that uses an LLM to assist support agents. Employees raise support tickets (e.g., "My VPN is not connecting", "Need access to the finance drive") and a team of support agents responds. **The AI does NOT replace the agent — it helps the agent move faster.**

---

## 🚀 How to Run Locally

Follow these step-by-step instructions to run QuickDesk on a fresh clone:

### Prerequisites
- **Node.js**: `v20.x` or higher
- **PostgreSQL**: `v15+` with `pgvector` extension enabled (or Docker Desktop)
- **Google Gemini API Key**: Optional (free key at [Google AI Studio](https://aistudio.google.com/)). Fallbacks are provided if omitted.

### Step 1: Environment Setup
Copy the environment template file:
```bash
cp .env.example .env
```
*(Optionally paste your `GEMINI_API_KEY` inside `.env`)*

### Step 2: Install Dependencies
Install all workspace dependencies from the root monorepo:
```bash
npm install
```

### Step 3: Database & Vector Indexing
Start PostgreSQL using Docker (or ensure your local Postgres service is running):
```bash
npm run db:up
```

Generate Prisma client & push database migrations:
```bash
npm run prisma:generate
npm run prisma:push
```

Seed initial accounts & index Knowledge Base markdown documents into vector embeddings:
```bash
npx ts-node --transpile-only backend/prisma/seed.ts
```

### Step 4: Run Application
Start both Backend API (`http://localhost:5000`) and Frontend Next.js (`http://localhost:3000`):
```bash
npm run dev
```

---

## 🏛️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           QUICKDESK SYSTEM                              │
│                                                                         │
│  ┌──────────────┐    HTTP/WS     ┌──────────────────┐    SQL     ┌────┐│
│  │   Frontend   │◄────────────►│     Backend      │◄─────────►│ DB ││
│  │  (Next.js)   │              │   (NestJS API)   │           │(PG)││
│  │              │              │                  │           └────┘│
│  │  - Employee  │              │  - Auth Module   │                 │
│  │    Dashboard │              │  - Tickets Module│    Embed   ┌───┐│
│  │  - Agent     │  Socket.io   │  - AI / RAG Mod  │◄─────────►│VDB││
│  │    Dashboard │◄────────────►│  - WS Gateway    │           │   ││
│  │  - Metrics   │              │  - Metrics Mod   │           └───┘│
│  └──────────────┘              │                  │                 │
│                                └────────┬─────────┘                 │
│                                         │                           │
│                                    ┌────┴────┐                      │
│                                    │ Gemini  │                      │
│                                    │ (LLM)   │                      │
│                                    └─────────┘                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📡 API Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| `POST` | `/api/auth/register` | Register new user account | ❌ Public |
| `POST` | `/api/auth/login` | Authenticate user & return JWT | ❌ Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | ✅ Bearer JWT |
| `POST` | `/api/tickets` | Submit new ticket (triggers AI classification) | ✅ Bearer JWT |
| `GET` | `/api/tickets` | Get tickets (Employee: own only; Agent: all + filters) | ✅ Bearer JWT |
| `GET` | `/api/tickets/:id` | Get single ticket detail & message thread | ✅ Bearer JWT |
| `POST` | `/api/tickets/:id/copilot-suggest` | Generate AI RAG copilot reply draft | ✅ Agent / Admin |
| `PATCH` | `/api/tickets/:id/category` | Override AI-suggested category | ✅ Agent / Admin |
| `PATCH` | `/api/tickets/:id/priority` | Override AI-suggested priority | ✅ Agent / Admin |
| `POST` | `/api/tickets/:id/reply` | Send final response & resolve ticket | ✅ Agent / Admin |
| `GET` | `/api/tickets/:id/audit-log` | Get override history trail for a ticket | ✅ Agent / Admin |
| `POST` | `/api/ai/chat` | RAG-assisted Q&A virtual assistant | ✅ Bearer JWT |
| `GET` | `/api/metrics/overview` | Ticket status counts, median resolution, AI override % | ✅ Agent / Admin |

> 📖 Interactive Swagger OpenAPI docs are available at **`http://localhost:5000/api/docs`**

---

## 💡 Decisions & Tradeoffs

### a) Why Next.js over React SPA?
Next.js App Router was chosen because built-in file-based routing, server-side data fetching, and SSR reduce initial client bundle size.

### b) How is the RAG pipeline structured?
Markdown articles in `knowledge-base/` are parsed using `RecursiveCharacterTextSplitter` (500-char chunks, 50 overlap), embedded via `text-embedding-004` (768 dimensions), stored in PostgreSQL (`pgvector`), and searched using Cosine Distance (`<=>`).

### c) How do you handle invalid AI categories?
The LLM prompt strictly forces JSON output. If Gemini outputs an invalid category or malformed JSON, validation logic intercepts it, logs an anomaly warning, and defaults safely to `OTHER`.

### d) Where is the JWT stored on the client?
The access token is stored in memory (`AuthContext`) and synchronized with `localStorage` for session persistence across page refreshes.

### e) How is role-based access enforced on the backend?
Backend protection uses `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.AGENT, Role.ADMIN)`. Even if an employee guesses an agent route on the frontend, NestJS rejects the API request with a `403 Forbidden` response.

### f) Why Socket.io for real-time?
Socket.io provides room management (`channel-agents` for agent queue alerts, `ticket-{id}` for private ticket chats) and automatic reconnection logic.

### g) What is the worst failure mode today?
If the database vector search or Gemini API fails, RAG degrades gracefully to keyword search fallbacks or default ticket creation options without crashing ticket submission flows.

---

## 🔑 Default Credentials (Seed Data)

| Role | Email | Password |
|------|-------|----------|
| **Support Agent** | `agent@quickdesk.com` | `agent123` |
| **Employee** | `employee@quickdesk.com` | `employee123` |