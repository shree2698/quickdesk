# QuickDesk — Agent Roles, Permissions & Implementation Guide

> **Related Docs:** [REQUIREMENTS.md](file:///E:/ME/quickdesk/REQUIREMENTS.md) · [DESIGN.md](file:///E:/ME/quickdesk/DESIGN.md) · [WORKPLAN.md](file:///E:/ME/quickdesk/WORKPLAN.md)

---

## 📚 Documentation Index

All detailed specifications live in the [`docs/`](file:///E:/ME/quickdesk/docs) folder. Each document covers a specific phase/domain of the system:

| # | Document | Description | Phase |
|---|----------|-------------|-------|
| 1 | [01-system-overview.md](file:///E:/ME/quickdesk/docs/01-system-overview.md) | Project vision, problem statement, features, functional & non-functional requirements, tech stack, roadmap | Foundation |
| 2 | [02-architecture.md](file:///E:/ME/quickdesk/docs/02-architecture.md) | High-level architecture, frontend/backend layer design, request flow diagrams, folder structure | Foundation |
| 3 | [03-database.md](file:///E:/ME/quickdesk/docs/03-database.md) | PostgreSQL + pgvector schema, ER diagram, entities, indexes, constraints, enums, migration & seed strategy | Phase 1 |
| 4 | [04-api.md](file:///E:/ME/quickdesk/docs/04-api.md) | REST API specification — auth, employee, agent, metrics, and health endpoints with request/response examples | Phase 1 |
| 5 | [05-ai-rag.md](file:///E:/ME/quickdesk/docs/05-ai-rag.md) | AI & RAG pipeline — LLM selection, prompt engineering, knowledge base chunking, vector store, citation, fallback | Phase 2 |
| 6 | [06-auth.md](file:///E:/ME/quickdesk/docs/06-auth.md) | Authentication & security — JWT flow, bcrypt hashing, RBAC matrix, guards, refresh token rotation, security notes | Phase 1 |
| 7 | [07-realtime.md](file:///E:/ME/quickdesk/docs/07-realtime.md) | Socket.io realtime — gateway setup, events (client↔server), connection flow, room organization, reconnection | Phase 3 |
| 8 | [08-deployment.md](file:///E:/ME/quickdesk/docs/08-deployment.md) | Deployment guide — requirements, env vars, Docker Compose, production architecture, CI/CD pipeline | Phase 4 |
| 9 | [09-testing.md](file:///E:/ME/quickdesk/docs/09-testing.md) | Testing strategy — unit, integration, E2E, API testing, edge cases, manual testing tools | Phase 4 |

### Prompt Templates

| Prompt | Purpose |
|--------|---------|
| [prompts/ai.md](file:///E:/ME/quickdesk/docs/prompts/ai.md) | AI module development prompts |
| [prompts/backend.md](file:///E:/ME/quickdesk/docs/prompts/backend.md) | Backend module development prompts |
| [prompts/database.md](file:///E:/ME/quickdesk/docs/prompts/database.md) | Database setup & migration prompts |
| [prompts/frontend.md](file:///E:/ME/quickdesk/docs/prompts/frontend.md) | Frontend UI development prompts |
| [prompts/testing.md](file:///E:/ME/quickdesk/docs/prompts/testing.md) | Testing implementation prompts |

---

## 1. Role Definitions

QuickDesk enforces **Role-Based Access Control (RBAC)** across three distinct personas (as defined in [01-system-overview.md](file:///E:/ME/quickdesk/docs/01-system-overview.md#L47-L55)):

| Role | Description | Created By |
|------|-------------|------------|
| **`EMPLOYEE`** | Internal company staff who raise support tickets and chat with the AI assistant | Self-registration or seed script |
| **`AGENT`** | Support team members who respond to, assign, and resolve tickets | Self-registration or seed script |
| **`ADMIN`** | System administrators who manage users, knowledge base, and view metrics | Seed script only |

> **Note**: The assessment PDF specifies two roles (`employee`, `agent`). The existing system design extends this with a third `ADMIN` role for knowledge base management and metrics. See [06-auth.md — Roles & Permissions Matrix](file:///E:/ME/quickdesk/docs/06-auth.md#L70-L82) for the full permission table.

---

## 2. Permission Matrix

### 2.1 Ticket Operations

Detailed API-level permissions are specified in [04-api.md](file:///E:/ME/quickdesk/docs/04-api.md) and enforced via guards documented in [06-auth.md](file:///E:/ME/quickdesk/docs/06-auth.md#L85-L99).

| Operation | `EMPLOYEE` | `AGENT` | `ADMIN` |
|-----------|:----------:|:-------:|:-------:|
| Create ticket (`POST /api/tickets`) | ✅ | ✅ | ✅ |
| View own tickets (`GET /api/tickets`) | ✅ | ✅ | ✅ |
| View all tickets (`GET /api/agent/tickets`) | ❌ | ✅ | ✅ |
| Filter/search tickets | ❌ | ✅ | ✅ |
| Assign ticket (`PATCH /api/tickets/:id/assign`) | ❌ | ✅ | ✅ |
| Override AI category | ❌ | ✅ | ✅ |
| Override AI priority | ❌ | ✅ | ✅ |
| Update ticket status (`PATCH /api/tickets/:id/status`) | ❌ | ✅ | ✅ |
| Send reply (resolve ticket) | ❌ | ✅ | ✅ |
| View AI draft reply / copilot suggestion | ❌ | ✅ | ✅ |
| View audit log | ❌ | ✅ | ✅ |

### 2.2 AI & Knowledge Base

RAG pipeline permissions align with roles defined in [05-ai-rag.md](file:///E:/ME/quickdesk/docs/05-ai-rag.md):

| Operation | `EMPLOYEE` | `AGENT` | `ADMIN` |
|-----------|:----------:|:-------:|:-------:|
| Chat with RAG AI assistant (`POST /api/ai/chat`) | ✅ | ✅ | ✅ |
| Request AI copilot draft (`POST /api/tickets/:id/copilot-suggest`) | ❌ | ✅ | ✅ |
| Upload knowledge base articles (`POST /api/kb/upload`) | ❌ | ❌ | ✅ |

### 2.3 Metrics & Dashboard

Metrics specification from [01-system-overview.md](file:///E:/ME/quickdesk/docs/01-system-overview.md#L40-L43):

| Operation | `EMPLOYEE` | `AGENT` | `ADMIN` |
|-----------|:----------:|:-------:|:-------:|
| View metrics dashboard (`GET /api/admin/metrics/overview`) | ❌ | ❌ | ✅ |
| View ticket statistics | ❌ | ❌ | ✅ |
| View SLA compliance | ❌ | ❌ | ✅ |

### 2.4 Real-Time Events

Socket.io events are role-scoped as defined in [07-realtime.md](file:///E:/ME/quickdesk/docs/07-realtime.md#L28-L33):

| Event | `EMPLOYEE` | `AGENT` |
|-------|:----------:|:-------:|
| Receive `ticket_updated` (own ticket) | ✅ | ✅ |
| Receive `ticket_updated` (all tickets via `channel-agents`) | ❌ | ✅ |
| Send/Receive `message_received` in ticket room | ✅ (own ticket) | ✅ |
| Send/Receive `typing_status` | ✅ | ✅ |

---

## 3. UI Views by Role

### 3.1 Employee Views

As described in [01-system-overview.md — Employee Portal](file:///E:/ME/quickdesk/docs/01-system-overview.md#L28-L33) and [02-architecture.md](file:///E:/ME/quickdesk/docs/02-architecture.md#L157-L159):

```
┌─────────────────────────────────────────────────────┐
│  Employee Experience                                 │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │  🤖 AI RAG Assistant                      │      │
│  │  - Interactive chat interface              │      │
│  │  - Answers questions from knowledge base   │      │
│  │  - Shows citations from source articles    │      │
│  │  - "Create Ticket" if unresolved           │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │  📝 Submit Ticket                          │      │
│  │  - Title                                   │      │
│  │  - Description                             │      │
│  │  - Attachment (filename)                   │      │
│  │  [Submit] → triggers AI categorization     │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │  📋 My Tickets Dashboard                   │      │
│  │  - List of own tickets only                │      │
│  │  - Status (Open / In Progress / Resolved)  │      │
│  │  - AI-suggested category & priority        │      │
│  │  - Assigned agent name                     │      │
│  │  - Real-time status updates via Socket.io  │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │  💬 Live Ticket Chat Room                  │      │
│  │  - Direct messaging with assigned agent    │      │
│  │  - Typing indicators                       │      │
│  │  - Real-time message delivery              │      │
│  └───────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

### 3.2 Agent Views

As described in [01-system-overview.md — Agent Dashboard](file:///E:/ME/quickdesk/docs/01-system-overview.md#L34-L38) and [02-architecture.md](file:///E:/ME/quickdesk/docs/02-architecture.md#L160):

```
┌─────────────────────────────────────────────────────┐
│  Agent Experience                                    │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │  📊 Unified Ticket Queue                   │      │
│  │  - All tickets (real-time filterable list)  │      │
│  │  - Filters: status, category, priority      │      │
│  │  - Search by title                          │      │
│  │  - One-click ticket assignment              │      │
│  │  - Real-time new ticket alerts              │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │  🎫 Ticket Detail + Chat Workspace         │      │
│  │  - Original ticket info + employee name     │      │
│  │  - AI category (override ▼)                 │      │
│  │  - AI priority (override ▼)                 │      │
│  │  - AI Copilot pane (draft reply + citations)│      │
│  │  - Live chat with employee                  │      │
│  │  - [Send Reply] / [Resolve] buttons         │      │
│  │  - Override audit log trail                 │      │
│  └───────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

### 3.3 Admin Views

As described in [01-system-overview.md — Admin Panel](file:///E:/ME/quickdesk/docs/01-system-overview.md#L40-L43):

```
┌─────────────────────────────────────────────────────┐
│  Admin Experience                                    │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │  👥 User & Role Management                  │      │
│  │  - Create/edit employees and agents         │      │
│  │  - Assign permissions                       │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │  📖 Knowledge Base Manager                  │      │
│  │  - Upload markdown guides                   │      │
│  │  - Process & chunk into vector DB           │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │  📈 Metrics & SLA Dashboard                 │      │
│  │  - Tickets by status (Open / Resolved)      │      │
│  │  - Tickets by category (count)              │      │
│  │  - Avg/Median resolution time               │      │
│  │  - SLA adherence rate                       │      │
│  │  - AI override percentage                   │      │
│  └───────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

---

## 4. Backend Enforcement Strategy

Full implementation details in [06-auth.md — Protected Routes & Guards](file:///E:/ME/quickdesk/docs/06-auth.md#L85-L105).

### 4.1 Authentication Guard (JwtAuthGuard)

Every protected endpoint requires a valid JWT in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

The guard (via Passport strategy):
1. Extracts the token from the header
2. Verifies signature and expiry using `JWT_SECRET`
3. Attaches `user` object to the request (`req.user`)
4. Rejects with `401 Unauthorized` if invalid

### 4.2 Role Guard (RolesGuard)

Applied via decorator on controller methods:

```typescript
// Example: Agent-only endpoint
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT, Role.ADMIN)
@Patch(':id/status')
async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
  return this.ticketsService.updateStatus(id, dto);
}
```

The guard:
1. Reads `@Roles()` metadata from the endpoint
2. Checks `req.user.role` against allowed roles
3. Rejects with `403 Forbidden` if role doesn't match

### 4.3 Ownership Enforcement

For employee ticket access, the service layer filters by ownership:

```typescript
// Employee can only see their own tickets
if (user.role === 'EMPLOYEE') {
  return this.ticketRepo.find({ where: { employeeId: user.id } });
}
// Agent/Admin sees all
return this.ticketRepo.find();
```

### 4.4 Frontend Guards (Next.js Middleware)

As documented in [06-auth.md — Frontend Guards](file:///E:/ME/quickdesk/docs/06-auth.md#L100-L105):

- `/employee/*` → requires `EMPLOYEE` or higher
- `/agent/*` → requires `AGENT` or `ADMIN`
- `/admin/*` → requires `ADMIN` only

### 4.5 Endpoint Protection Map

Full API specification with auth requirements in [04-api.md](file:///E:/ME/quickdesk/docs/04-api.md):

| Endpoint | Guard | Role Check | Ownership Check |
|----------|-------|-----------|----------------|
| `POST /api/auth/register` | None | None | None |
| `POST /api/auth/login` | None | None | None |
| `GET /api/tickets` | JWT | Any | Employee: own only |
| `POST /api/tickets` | JWT | Any | None |
| `GET /api/agent/tickets` | JWT + Roles | Agent/Admin | None |
| `PATCH /api/tickets/:id/assign` | JWT + Roles | Agent/Admin | None |
| `PATCH /api/tickets/:id/status` | JWT + Roles | Agent/Admin | None |
| `POST /api/tickets/:id/copilot-suggest` | JWT + Roles | Agent/Admin | None |
| `POST /api/ai/chat` | JWT | Any | None |
| `GET /api/admin/metrics/overview` | JWT + Roles | Admin | None |
| `GET /api/health` | None | None | None |

---

## 5. JWT Token Structure

Full JWT specification in [06-auth.md — JWT Properties](file:///E:/ME/quickdesk/docs/06-auth.md#L35-L49).

### 5.1 Payload

```json
{
  "sub": "u-12345",
  "email": "user@company.com",
  "role": "EMPLOYEE | AGENT | ADMIN",
  "iat": 1784894400,
  "exp": 1784895300
}
```

### 5.2 Configuration

| Parameter | Value |
|-----------|-------|
| Algorithm | HS256 |
| Access Token Expiry | 15 minutes |
| Refresh Token Expiry | 7 days |
| Secret | From `JWT_SECRET` env variable |
| Access Token Storage | React Context state (in-memory, XSS-safe) |
| Refresh Token Storage | httpOnly, Secure, SameSite=Strict cookie |

### 5.3 Token Rotation

As documented in [06-auth.md — Refresh Strategy](file:///E:/ME/quickdesk/docs/06-auth.md#L108-L116):

1. Access token stored in memory (React Context) — prevents XSS
2. Refresh token stored in httpOnly cookie — prevents JS access
3. Client calls `/api/auth/refresh` before access token expiry
4. Server validates refresh cookie, returns new access token

---

## 6. Real-Time Event Routing by Role

Full specification in [07-realtime.md](file:///E:/ME/quickdesk/docs/07-realtime.md).

### Room Organization

| Room | Members | Purpose |
|------|---------|---------|
| `channel-agents` | All connected agents | Broadcast ticket queue updates |
| `ticket-{ticketId}` | Ticket owner + assigned agent | Private chat messages, status updates |

### Socket Events by Role

| Event | Direction | Employee Receives | Agent Receives |
|-------|-----------|:-----------------:|:--------------:|
| `ticket_updated` | Server → Client | ✅ (own ticket room) | ✅ (ticket room + agent channel) |
| `message_received` | Server → Room | ✅ (own ticket room) | ✅ (assigned ticket room) |
| `typing_status` | Server → Room | ✅ | ✅ |

### Socket Authentication

From [07-realtime.md — Socket Gateway](file:///E:/ME/quickdesk/docs/07-realtime.md#L7-L24):

```typescript
const socket = io("/api/ws", {
  auth: { token: "Bearer " + accessToken },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
```

### Reconnection Strategy

From [07-realtime.md — Reconnection](file:///E:/ME/quickdesk/docs/07-realtime.md#L145-L161):
- Automatic reconnection with exponential backoff
- Event buffer during offline periods
- Room re-entry on reconnect via `join_ticket` re-emit

---

## 7. Seed Data

As specified in [03-database.md — Seed Data](file:///E:/ME/quickdesk/docs/03-database.md#L210-L218):

### 7.1 Default Users

| Name | Email | Role | Password (dev only) |
|------|-------|------|---------------------|
| Admin User | admin@company.com | `ADMIN` | `admin123` |
| Agent John | agent.john@company.com | `AGENT` | `agent123` |
| Agent Sarah | agent.sarah@company.com | `AGENT` | `agent123` |
| Employee Bob | employee.bob@company.com | `EMPLOYEE` | `employee123` |
| Employee Alice | employee.alice@company.com | `EMPLOYEE` | `employee123` |

> ⚠️ Passwords are **bcrypt-hashed** (10 salt rounds) before storage. Plaintext values above are for the seed script reference only. See [06-auth.md — Password Hashing](file:///E:/ME/quickdesk/docs/06-auth.md#L53-L67).

### 7.2 Knowledge Base Articles

Loaded from the `knowledge-base/` directory and processed through the RAG pipeline described in [05-ai-rag.md — Knowledge Base Processing](file:///E:/ME/quickdesk/docs/05-ai-rag.md#L48-L58):

| # | Topic | ~Words | Chunking |
|---|-------|--------|----------|
| 1 | VPN Setup Guide | 150-200 | RecursiveCharacterTextSplitter, 500 chars, 50 overlap |
| 2 | Password Reset Policy | 150-200 | ↑ same |
| 3 | Leave Application Process | 150-200 | ↑ same |
| 4 | Expense Reimbursement | 150-200 | ↑ same |
| 5 | Laptop/Hardware Request | 150-200 | ↑ same |
| 6+ | Additional guides as needed | 100-150 | ↑ same |

---

## 8. AI-Powered Features by Role

Details in [05-ai-rag.md](file:///E:/ME/quickdesk/docs/05-ai-rag.md):

### For Employees
- **RAG Chat Assistant**: Ask questions → get answers grounded in knowledge base with citations
- **Self-Service Deflection**: AI attempts to resolve before ticket creation
- **Auto-Triage on Submission**: Ticket automatically gets AI-predicted category & priority

### For Agents
- **AI Copilot**: "Suggest Draft" button generates context-aware reply using ticket history + knowledge base
- **AI Category/Priority Display**: See AI suggestions, override with one click (logged to audit trail)
- **Citation Transparency**: See which knowledge base articles the AI referenced

### Category Prediction

From [05-ai-rag.md — Category Prediction](file:///E:/ME/quickdesk/docs/05-ai-rag.md#L32-L37):

| Category | Scope |
|----------|-------|
| `IT` | Software, hardware, networking, credentials |
| `HR` | Benefits, leave, job roles, employee matters |
| `FINANCE` | Reimbursements, salary, tax, subscriptions |
| `GENERAL` | Facility access, general feedback, other |

### Priority Prediction

From [05-ai-rag.md — Priority Prediction](file:///E:/ME/quickdesk/docs/05-ai-rag.md#L39-L44):

| Priority | Criteria |
|----------|----------|
| `URGENT` | Affecting whole offices or business-critical systems |
| `HIGH` | Major issues blocking single user productivity |
| `MEDIUM` | Annoyances that can be worked around |
| `LOW` | Queries, questions, or non-blocking issues |

---

## 9. Security Layering — What Stops Unauthorized Access?

Detailed in [06-auth.md — Security Notes](file:///E:/ME/quickdesk/docs/06-auth.md#L119-L130):

| Layer | Protection | Reference |
|-------|-----------|-----------|
| **1. JWT Validation** | No valid token → `401 Unauthorized` | [06-auth.md](file:///E:/ME/quickdesk/docs/06-auth.md#L97-L98) |
| **2. Role Guard** | Wrong role → `403 Forbidden` | [06-auth.md](file:///E:/ME/quickdesk/docs/06-auth.md#L98-L99) |
| **3. Data Scoping** | Queries filtered by `employeeId` | Service layer |
| **4. Frontend Middleware** | Routes hidden/redirected per role | [06-auth.md](file:///E:/ME/quickdesk/docs/06-auth.md#L100-L105) |
| **5. WebSocket Auth** | JWT validated during handshake | [07-realtime.md](file:///E:/ME/quickdesk/docs/07-realtime.md#L12-L24) |
| **6. CORS** | Limited to registered origins only | [06-auth.md](file:///E:/ME/quickdesk/docs/06-auth.md#L120) |
| **7. Input Sanitization** | Prisma parameterized queries + XSS prevention | [06-auth.md](file:///E:/ME/quickdesk/docs/06-auth.md#L130) |

> **Key principle**: The frontend hides buttons/routes for UX convenience. The **backend enforces** security. Guessing a URL is not sufficient to gain access.

---

## 10. Development Roadmap

From [01-system-overview.md — Development Roadmap](file:///E:/ME/quickdesk/docs/01-system-overview.md#L106-L123):

| Phase | Focus | Key Docs |
|-------|-------|----------|
| **Phase 1: Core System** | Database schema, Auth, Ticket CRUD, Core APIs | [03-database.md](file:///E:/ME/quickdesk/docs/03-database.md), [04-api.md](file:///E:/ME/quickdesk/docs/04-api.md), [06-auth.md](file:///E:/ME/quickdesk/docs/06-auth.md) |
| **Phase 2: AI & KB** | Knowledge base processing, pgvector, Gemini categorization, RAG engine | [05-ai-rag.md](file:///E:/ME/quickdesk/docs/05-ai-rag.md) |
| **Phase 3: Realtime & UX** | Socket.io chatrooms, live status hooks, Agent AI Copilot UI | [07-realtime.md](file:///E:/ME/quickdesk/docs/07-realtime.md) |
| **Phase 4: Polish & Deploy** | Admin metrics, SLA dashboard, testing, Docker deployment | [08-deployment.md](file:///E:/ME/quickdesk/docs/08-deployment.md), [09-testing.md](file:///E:/ME/quickdesk/docs/09-testing.md) |

---

## 11. Testing by Role

From [09-testing.md](file:///E:/ME/quickdesk/docs/09-testing.md):

| Test Area | What's Verified | Role Tested |
|-----------|----------------|-------------|
| Auth guard validation | Token missing → `401`, wrong role → `403` | All |
| Employee ticket scoping | Employee sees only own tickets | Employee |
| Agent ticket access | Agent sees full queue | Agent |
| AI categorization fallback | Gemini down → defaults to `GENERAL`/`LOW` | System |
| WebSocket room isolation | Employee can't join another user's ticket room | Employee |
| Audit log creation | Category/priority override creates audit entry | Agent |

---

## 12. Edge Cases & Failure Modes

From [09-testing.md — Edge Cases](file:///E:/ME/quickdesk/docs/09-testing.md#L77-L86) and [05-ai-rag.md — Fallback Strategy](file:///E:/ME/quickdesk/docs/05-ai-rag.md#L119-L124):

| Scenario | Impact | Mitigation |
|----------|--------|-----------|
| Gemini API down/rate limited | Ticket creation blocks | Fallback to default category (`GENERAL`) and priority (`LOW`), continue ticket creation |
| RAG returns no relevant chunks | AI hallucinates answer | Similarity threshold check; if below threshold, return "I couldn't find that" + offer ticket creation |
| Socket disconnect mid-chat | Messages lost | Socket.io auto-reconnect + event buffer + room re-entry on reconnect |
| Employee guesses agent URL | Unauthorized access | Backend `RolesGuard` returns `403 Forbidden` regardless of frontend routing |
| Oversized ticket description | Token overflow | Input validation decorator `@Length` restricts to 5,000 characters |
