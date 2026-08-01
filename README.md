# QuickDesk

AI-assisted internal helpdesk. Coding assessment submission.

## What this is

QuickDesk is an internal helpdesk where employees submit support tickets and a small team of agents resolves them, with an LLM sitting beside the agent rather than in front of the employee. On submission, the backend calls Gemini to suggest a category and priority, stores both as AI-suggested values alongside the live values, and broadcasts the ticket to online agents over Socket.io. In the ticket detail view an agent clicks "Suggest Draft" to get a reply drafted by a LangChain RAG chain grounded in uploaded knowledge base articles stored as pgvector embeddings, with the source article titles returned as citations. The agent edits the draft, sends it, and resolves the ticket. Every agent override of the AI's category or priority is written to an audit log (who, when, from, to) and shown on the ticket page, and an agent-only metrics route reports ticket counts by status and category, median resolution time, and how often agents override the AI's category.

## How to run it locally

Prerequisites: Node 20+, npm 10+, Docker, and (optional but recommended) a free Gemini API key from https://aistudio.google.com/.

### 1. Environment file

```bash
cp .env.example .env
```

Then edit `.env`. Two values in the template do not match what the code and `docker-compose.yml` actually need, so set them explicitly:

```dotenv
# docker-compose.yml creates the Postgres user/password as root/root,
# NOT postgres/postgres as the template says
DATABASE_URL="postgresql://root:root@localhost:5432/quickdesk?schema=public"

JWT_SECRET="any-long-random-string"

# LLM provider. Omit GEMINI_API_KEY to run without a key (see Known issues).
AI_PROVIDER="google"
AI_MODEL="gemini-2.0-flash"
EMBEDDING_MODEL="gemini-embedding-001"
GEMINI_API_KEY="your-key-here"

PORT=5000
FRONTEND_URL="http://localhost:3000"

# Only needed for the admin knowledge base upload feature (BullMQ)
REDIS_HOST="localhost"
REDIS_PORT=6379
```

`backend/.env.example` documents the alternate providers the LLM factory supports (`grok`, `openrouter`, `openai`) if you would rather not use Gemini.

### 2. Install

```bash
npm install
```

npm workspaces; installs root, `backend/`, and `frontend/` together.

### 3. Start Postgres with pgvector

```bash
npm run db:up
```

Brings up `pgvector/pgvector:0.8.0-pg16` on port 5432 plus Adminer on port 8080. `setup-pgvector.sql` runs `CREATE EXTENSION IF NOT EXISTS vector` on first init. Confirm with `docker ps` (container `quickdesk-postgres-pgvector`).

### 4. Apply the schema

```bash
npm run prisma:generate
npm run prisma:migrate
```

Applies the three committed migrations in `backend/prisma/migrations/`, which create the `vector` extension, the enums, and `users`, `tickets`, `messages`, `audit_logs`, `knowledge_bases`, `knowledge_base_chunks` with their indexes. Migrations are used rather than `db push` so the schema comes from version-controlled history. On a fresh, empty database this applies all three and exits without prompting; `npm run prisma:push` remains available for throwaway experiments.

### 5. Seed users, tickets, and the knowledge base

```bash
npm run db:seed
```

Creates the accounts below, three sample tickets (open / resolved / in progress) with a sample audit log entry and chat thread. Without `GEMINI_API_KEY` the seed prints a warning and stores chunks with a NULL embedding (if any KB articles were present during seed), which means vector search finds nothing and the AI falls back to ungrounded answers. Note: Knowledge base articles should be uploaded via the Admin UI.

### 6. Run both servers

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000 (all routes under `/api`)
- Swagger: http://localhost:5000/api/docs

### 7. Optional: Redis, for the admin knowledge base upload

The knowledge base upload / reindex / delete endpoints hand work to BullMQ, which needs Redis. `docker-compose.yml` does not include it:

```bash
docker run -d --name quickdesk-redis -p 6379:6379 redis:7-alpine
```

Without Redis the core ticket and RAG flow still works (the KB is seeded directly by the seed script), but the backend logs repeated Redis connection errors and queued upload jobs never process.

### Seeded accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@quickdesk.com` | `admin123` |
| Agent | `agent@quickdesk.com` | `agent123` |
| Agent (second, for testing live queue sync) | `sarah.agent@quickdesk.com` | `agent123` |
| Employee | `employee@quickdesk.com` | `employee123` |
| Employee (second) | `alice@quickdesk.com` | `employee123` |

Passwords are bcrypt hashed at 10 salt rounds, in both the seed and `AuthService.register`.

### Useful scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Backend and frontend concurrently |
| `npm run dev:backend` / `npm run dev:frontend` | One side only |
| `npm run build` / `npm run start` | Production build / run |
| `npm run db:up` / `npm run db:down` | Postgres container up / down |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Apply migrations, and create a new one after a schema change (`migrate dev`) |
| `npm run prisma:push` | Push the schema without a migration, for throwaway experiments |
| `npm run prisma:reset` | Drop everything and replay all migrations |
| `npm run db:seed` | Seed users, tickets, and KB embeddings |

To add a knowledge base article, use the Admin Knowledge Base upload feature in the frontend. Uploaded files are stored in `backend/uploads/knowledge-base/` and chunked/embedded by a background job.

## Architecture diagram

```
┌──────────────────────────────── Browser (Next.js 16 App Router) ────────────────────────────────┐
│                                                                                                 │
│  /login  /register                                                                              │
│  Employee: /employee/submit-ticket  /employee/my-tickets  /employee/ai-assistant                │
│  Agent:    /agent/dashboard  /agent/tickets/[id]  /agent/metrics                                │
│  Admin:    /admin/agents  /admin/knowledge                                                      │
│                                                                                                 │
│  AuthContext (localStorage: quickdesk_token, quickdesk_user)                                    │
│  api.ts (axios, Authorization: Bearer <token> interceptor)                                      │
│  SocketContext (socket.io-client, handshake auth.token = "Bearer <jwt>")                         │
└───────────────┬──────────────────────────────────────────────┬──────────────────────────────────┘
                │ REST /api/*                                  │ WebSocket (Socket.io)
                ▼                                              ▼
┌──────────────────────────────────── NestJS 11 backend :5000 ────────────────────────────────────┐
│                                                                                                 │
│  Global: setGlobalPrefix('api'), CORS(FRONTEND_URL),                                            │
│          ValidationPipe{whitelist, forbidNonWhitelisted, transform}, Swagger at /api/docs        │
│                                                                                                 │
│  AuthModule        JwtStrategy (passport-jwt, HS256, 1d) + JwtAuthGuard + RolesGuard             │
│  TicketsModule     create / list+filter / detail / copilot-suggest / category / priority /       │
│                    reply / resolve / audit-log       (ownership checks in the service)           │
│  AiModule          AiService.classifyTicket, AiService.generateCopilotDraft, RagService          │
│                    LlmFactory picks provider from AI_PROVIDER                                    │
│  KnowledgeModule   KB CRUD, DocumentLoaderService (pdf/docx/csv/md), VectorStoreService          │
│  QueueModule       BullMQ: knowledge-upload / -reindex / -delete  ──▶ Redis :6379                │
│  MetricsModule     counts, median resolution time, AI category override rate                     │
│  RealtimeModule    RealtimeGateway: rooms user-{id}, channel-agents, ticket-{id}                 │
│                    emits ticket:new, ticket:updated, ticket:resolved, message_received           │
└──────┬─────────────────────────────┬────────────────────────────────────┬───────────────────────┘
       │ Prisma 7 + @prisma/adapter-pg│ raw SQL for vectors               │ HTTPS
       ▼                              ▼                                   ▼
┌──────────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│ Postgres 16                  │  │ knowledge_base_chunks    │  │ Google Gemini            │
│ users, tickets, messages,    │  │ embedding vector(768)    │  │ gemini-2.0-flash (chat)  │
│ audit_logs, knowledge_bases  │  │ cosine distance <=>      │  │ gemini-embedding-001     │
└──────────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘
```

RAG path on "Suggest Draft":

```
ticket title (first 150 chars) + description (first 400) + chat history (last 400)
  → embedQuery, truncate vector to first 768 dims
  → SELECT ... ORDER BY embedding <=> $1::vector LIMIT 4      (pgvector cosine)
  → if 0 hits or top similarity < 0.4: ungrounded fallback answer, zero citations
  → else build context (each chunk clipped to 600 chars, prefixed "[Source: <title>]")
  → LangChain LCEL: PromptTemplate → ChatGoogleGenerativeAI(temp 0.2) → StringOutputParser
  → draft saved to tickets.aiDraftReply, citation titles to tickets.ragCitations
```

## API endpoints

All paths are prefixed with `/api`. Auth column: "JWT" means any authenticated user; role names mean `RolesGuard` rejects everyone else with 403.

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/` | Health / hello string | None |
| POST | `/api/auth/register` | Self-registration, always creates an `EMPLOYEE` | None |
| POST | `/api/auth/login` | Verify bcrypt hash, return access token and user | None |
| GET | `/api/auth/me` | Current user profile, re-read from the DB | JWT |
| POST | `/api/tickets` | Create ticket, run LLM classification, broadcast `ticket:new` | JWT (EMPLOYEE, AGENT, ADMIN) |
| GET | `/api/tickets` | List tickets; employees are scoped to their own; filters `status`, `category`, `priority`, `search` (title), `page`, `limit` | JWT |
| GET | `/api/tickets/:id` | Ticket with employee, agent, message thread, and audit logs | JWT (employees: own only, else 403) |
| POST | `/api/tickets/:id/copilot-suggest` | Generate RAG draft + citations, persist to the ticket | AGENT, ADMIN |
| PATCH | `/api/tickets/:id/category` | Override category, write audit log entry | AGENT, ADMIN |
| PATCH | `/api/tickets/:id/priority` | Override priority, write audit log entry | AGENT, ADMIN |
| POST | `/api/tickets/:id/reply` | Append a message; agent replies claim the ticket and move OPEN to IN_PROGRESS | JWT (employees: own only) |
| POST | `/api/tickets/:id/resolve` | Store `finalReply`, set status RESOLVED and `resolvedAt`, emit `ticket:resolved` | AGENT, ADMIN |
| GET | `/api/tickets/:id/audit-log` | Override history with the user who made each change | AGENT, ADMIN |
| POST | `/api/ai/chat` | RAG Q&A over the knowledge base, returns answer + sources | JWT |
| GET | `/api/metrics/overview` | Status counts, category counts, median resolution minutes, AI override % | AGENT, ADMIN |
| GET | `/api/knowledge` | List KB documents, paginated | JWT |
| GET | `/api/knowledge/:id` | KB document detail | JWT |
| GET | `/api/knowledge/:id/status` | Indexing status (`UPLOADED`, `PROCESSING`, `INDEXED`, `FAILED`) | JWT |
| POST | `/api/knowledge/upload` | Upload a file, queue chunk + embed job | ADMIN |
| POST | `/api/knowledge/:id/reindex` | Queue a re-chunk and re-embed | ADMIN |
| DELETE | `/api/knowledge/:id` | Queue delete of the document and its chunks | ADMIN |
| POST | `/api/users` | Create an agent or admin account | ADMIN |
| GET | `/api/users` | List users, optional `role` filter, paginated | ADMIN |
| GET | `/api/users/:id` | User detail | ADMIN |
| PATCH | `/api/users/:id` | Update name, password, or role | ADMIN |
| DELETE | `/api/users/:id` | Delete a user (self-delete blocked in the service) | ADMIN |

Socket.io events, for completeness:

| Direction | Event | Payload / effect |
|-----------|-------|------------------|
| client to server | `join_ticket` | Joins `ticket-{id}`; employees are checked against `ticket.employeeId` first |
| client to server | `leave_ticket` | Leaves the room |
| client to server | `send_message` | Persists a `Message`, re-emits `message_received` to the room |
| client to server | `typing_start` / `typing_stop` | Relays `typing_status` to the room |
| server to client | `ticket:new` | To `channel-agents` when a ticket is created |
| server to client | `ticket:updated` / `ticket_updated` | To `ticket-{id}` and `channel-agents` |
| server to client | `ticket:resolved` | To `ticket-{id}` and `user-{employeeId}` |

## Decisions and tradeoffs

**a) Why did you pick this frontend framework (React vs Next.js)?**

Next.js App Router, for file-system routing that mirrors the role boundaries (`app/employee/*`, `app/agent/*`, `app/admin/*`) and for a single `app/layout.tsx` that wraps `AuthProvider`, `SocketProvider`, and `LayoutShell` once. Everything is a client component (`'use client'`) because auth state lives in `localStorage` and the pages are socket-driven, so this build gets almost none of what Next.js is actually good at: no server components, no server-side data fetching, no route handlers. Vite plus React Router would have been lighter and honestly a better fit. The tradeoff paid off in one place only: routing and layout cost near zero effort.

**b) How did you structure the RAG pipeline? Chunk size, embedding model, retriever, prompt?**

- Loader: `DocumentLoaderService` handles pdf / docx / csv and treats everything else as plain text or markdown.
- Splitter: `RecursiveCharacterTextSplitter`, `chunkSize: 1000`, `chunkOverlap: 200`, separators `['\n\n', '\n', ' ', '']`. The chunked articles produce appropriately sized pieces of text. Retrieval is effectively whole-article retrieval right now for small docs, which is fine for a corpus this small and would need a smaller chunk size (200 to 300) the moment real multi-page policy PDFs land.
- Embeddings: `gemini-embedding-001` through `GoogleGenerativeAIEmbeddings`. Its native output is longer than 768 dims, so both `VectorStoreService` and the seed script slice the vector to its first 768 values to fit the `vector(768)` column. Truncating Matryoshka-style embeddings is supported in principle, but the code does not re-normalize after slicing, so cosine scores are slightly off. It works because query and document vectors are truncated identically. The clean fix is to re-normalize, or to store the full dimensionality.
- Store: pgvector in the same Postgres instance, queried with raw SQL (`1 - (embedding <=> $1::vector) as similarity`, `ORDER BY embedding <=> $1::vector LIMIT 4`) because Prisma cannot express an `Unsupported("vector(768)")` column in its typed API.
- Retriever: top k = 4, with a relevance gate at similarity 0.4 on the top hit.
- Prompt: "Answer using ONLY the context chunks below", cite the source name in brackets, and if the answer is not in context say "I cannot find that in our company documentation." Chained with LCEL (`RunnableSequence`), temperature 0.2 for RAG answers, 0.1 for classification.
- Chunks are embedded in batches of 10, with one retry after 2s and a 300ms gap between batches, to stay inside the Gemini free-tier rate limit. If both attempts fail the chunk is stored with a NULL embedding rather than dropped.

Cost control was deliberate and visible in the code: the ticket title is clipped to 150 chars, the description to 400, chat history to the last 400, retrieved chunks to 600 chars in the prompt and 450 in the copilot context, and citation snippets to 100 chars.

**c) How did you handle the case where the LLM returns a category that does not match your allowed list?**

The prompt asks for JSON only, then the code distrusts it in three layers: a `\{[\s\S]*\}` regex pulls the first JSON object out of any prose or code fence the model wraps it in; `JSON.parse` runs inside a try/catch; and each field is checked against `Object.values(TicketCategory)` / `Object.values(TicketPriority)` from Prisma. An unrecognized category becomes `OTHER`, an unrecognized priority becomes `LOW`, and a total failure (parse error, network error, 429, no API key) falls through to `GENERAL` / `LOW`. Ticket creation never fails because the LLM misbehaved. The tradeoff: a silent `GENERAL` / `LOW` is indistinguishable to the agent from a confident model prediction. There is no `aiClassificationFailed` flag, and there should be.

**d) Where did you store the JWT on the client, and why?**

`localStorage`, under `quickdesk_token` and `quickdesk_user`. An axios request interceptor attaches `Authorization: Bearer <token>`, and `SocketContext` passes the same string as `auth.token` in the Socket.io handshake. This was chosen for one reason: the token has to be readable by JavaScript to authenticate the WebSocket handshake, and an httpOnly cookie is not. The cost is real and I am not going to dress it up: any XSS on the page can read the token, and a 1-day expiry with no refresh token and no server-side revocation means a stolen token stays valid for up to 24 hours. The production version is an httpOnly, Secure, SameSite=Strict refresh cookie with a short-lived in-memory access token, and a cookie-authenticated socket handshake.

**e) How did you enforce role-based access on the backend? What stops an employee from hitting an agent-only endpoint by guessing the URL?**

Three layers, none of them in the UI:

1. `JwtAuthGuard` (passport-jwt) validates the signature and expiry, then `JwtStrategy.validate` re-reads the user from Postgres by `payload.sub`, so a token belonging to a deleted user is rejected and the role comes from the database row rather than from the token body.
2. `RolesGuard` reads `@Roles(...)` metadata off the handler or controller via `Reflector.getAllAndOverride` and throws `ForbiddenException` on a mismatch. `TicketsController`, `MetricsController`, `KnowledgeController`, and `UsersController` all sit behind `@UseGuards(JwtAuthGuard, RolesGuard)`.
3. Ownership checks in the service layer, because a role check alone does not stop one employee reading another employee's ticket. `TicketsService.findOne` and `sendReply` compare `ticket.employeeId` against `user.id` when the role is `EMPLOYEE`, `findAll` injects `employeeId` into the `where` clause for employees, and `RealtimeGateway.handleJoinTicket` runs the same check before letting a socket into a `ticket-{id}` room.

So an employee who guesses `GET /api/tickets/:id` for someone else's ticket gets 403 from layer 3; one who guesses `GET /api/metrics/overview` or `POST /api/users` gets 403 from layer 2; one with no token or an expired one gets 401 from layer 1. A global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted` rejects unexpected body fields, so an employee cannot smuggle `role: "ADMIN"` into the register payload, and `AuthService.register` hard-codes `Role.EMPLOYEE` regardless.

**f) Why did you pick Socket.io / WebSockets / SSE for real-time? What is the failure mode if the socket disconnects mid-session?**

Socket.io, for three reasons that map directly onto the requirements. Rooms: broadcasting a new ticket to every agent is `server.to('channel-agents').emit(...)`, with no connection bookkeeping of my own, and the same primitive gives per-ticket rooms and a `user-{id}` room for the "my ticket flipped to Resolved" push. Bidirectionality: SSE is server to client only, and `send_message` / `typing_start` need the other direction. Reconnect and transport fallback come for free, where native WebSockets would mean hand-rolling backoff. The cost is a heavier protocol and a client library, on top of the fact that `@nestjs/websockets` makes either choice about equally easy to write.

Failure mode on a mid-session disconnect, described accurately rather than optimistically: the client retries 10 times with 1s backoff growing to 5s, and re-authenticates from `localStorage` on each attempt. There is no event buffering or replay, so anything emitted while the socket was down is lost, and the frontend does not refetch on `connect`. A ticket detail page recovers on the next `ticket:updated`, since its handler refetches from REST rather than trusting the payload, but a dashboard that missed a `ticket:new` stays stale until the user changes a filter or reloads. The fix is a `socket.on('connect', refetch)` in each page-level effect, which is roughly ten lines and is listed below under what I would do next. Server-side, `handleConnection` verifies the JWT with `jsonwebtoken` and disconnects on failure, so a client whose token expires mid-session is dropped and, since the token in `localStorage` is still the expired one, its retries also fail; the user is stuck on stale data until reload, when `/auth/me` fails and `AuthContext` logs them out.

**g) What is the worst failure mode in your system today, and what would you do to address it?**

Not the socket, the LLM boundary. `TicketsService.create` awaits `classifyTicket` before it writes the ticket, so every submission is gated on a Gemini round trip. When the free tier returns 429 or hangs, the catch block returns `GENERAL` / `LOW` and the ticket saves, which is the right call, but the employee still waits out the latency and the agent sees a confident-looking classification that is really a default. There is no timeout on the call, so a slow provider is bounded only by the client's default.

The fix is to invert the order: write the ticket immediately, broadcast it, and run classification as a background job (BullMQ is already wired for the knowledge base queues, so the infrastructure exists) that patches `aiCategory` / `aiPriority` and emits `ticket:updated` when it lands. Add an explicit timeout, and store a classification status on the ticket so `GENERAL` / `LOW` from a failure renders as "not classified" instead of as a prediction.

Second place goes to the embedding path. A missing or rate-limited `GEMINI_API_KEY` at seed time stores chunks with NULL embeddings, retrieval quietly returns nothing, the 0.4 gate sends every question to the ungrounded fallback, and the UI shows plausible answers with zero citations. It degrades silently, which is worse than failing loudly. A startup check that counts chunks with NULL embeddings and logs a warning would cost about five lines.

**h) Where did AI tools help you most? Where did they hurt or mislead you?**

Helped most on the mechanical breadth: NestJS module scaffolding, DTOs with `class-validator` decorators, Swagger annotations, the Prisma schema's relation and index boilerplate, and the Tailwind-heavy page markup. That is high-volume, low-ambiguity code where reviewing a generated version is faster than typing one.

Hurt in three specific places. First, pgvector plus Prisma: generated code kept trying to write and query the `embedding` column through the typed Prisma client, which cannot work for `Unsupported("vector(768)")`, and the fix was hand-written `$queryRawUnsafe` / `$executeRawUnsafe`. Second, the embedding dimension mismatch: the suggested code assumed the model output would match the `vector(768)` column, and the `slice(0, 768)` in `VectorStoreService` and the seed is a workaround I had to reason about myself, including the fact that it skips re-normalization. Third, React hook dependencies: generated `useEffect` blocks in `AuthContext` and `SocketContext` produced re-render loops until the dependency arrays and the `useCallback` boundaries were reworked by hand. The general pattern: the further a task sat from well-trodden documentation, the more confidently wrong the output was.

## What I would do with more time

Roughly in the order I would pick them up:

1. Wire the two real-time listeners that are currently missing on the frontend. The backend emits `ticket:new` to `channel-agents` and `ticket:resolved` to `user-{employeeId}`, but `app/agent/dashboard/page.tsx` pulls `socket` out of the context without registering a handler, and `app/employee/my-tickets/page.tsx` does not touch the socket at all. Only the agent ticket detail page subscribes. This is the largest gap against the brief and the smallest fix.
2. Move LLM classification off the ticket-creation request path into a BullMQ job, add a timeout, and add a classification-status field so failures are visible instead of looking like a `GENERAL` / `LOW` prediction.
3. Real tests. Right now `backend/src/app.controller.spec.ts` is the untouched Nest "Hello World!" test and `test/app.e2e-spec.ts` is the default template. The tests worth writing first: role enforcement (employee hits `/api/metrics/overview` and `/api/tickets/:someone-elses-id`, expect 403), the classification fallback when the LLM returns garbage or a category outside the enum, RAG behaviour below the 0.4 similarity gate, and the audit log entry written on a category override.
4. Fix the `.env.example` / `docker-compose.yml` credential mismatch, add `REDIS_HOST` / `REDIS_PORT` / `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` to the template, and add Redis, backend, and frontend services to compose so the whole stack really is one command.
5. Move the JWT to an httpOnly refresh cookie with a short-lived access token, and authenticate the socket handshake from the cookie.
6. Fix the override-rate metric to count distinct tickets rather than audit rows (see below), and re-normalize truncated embedding vectors.
7. Rate limiting on ticket submission per employee, which the brief lists as a stretch goal and which the current code does not implement at all.

## Known issues and limitations

**Blocks a fresh clone until worked around**

- `.env.example` ships `DATABASE_URL` with `postgres:postgres`, but `docker-compose.yml` creates the role as `root` / `root`. Copying the template verbatim gives a Postgres authentication failure. Step 1 above has the working value.
- `QueueModule` calls `BullModule.forRoot` with `REDIS_HOST` / `REDIS_PORT`, neither of which is in `.env.example`, and compose does not start Redis. The app boots and the ticket and RAG flow work, but the backend logs Redis connection errors and admin KB uploads never index. See step 7.
- `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` are read by the frontend but absent from `.env.example`. The hard-coded `localhost:5000` defaults make this invisible locally and a problem anywhere else.

**Not fully implemented against the brief**

- Real-time on the dashboard and "My Tickets" is server-side only; the browser never subscribes. Item 1 above.
- The brief has "Send Reply" move the ticket to Resolved in one action. Here `POST /api/tickets/:id/reply` appends a message and moves OPEN to IN_PROGRESS, and resolving is a separate `POST /api/tickets/:id/resolve` that stores `finalReply` and sets `resolvedAt`. Both AI draft and final reply are kept, as asked, but the flow is two clicks.
- Categories are `IT | HR | FINANCE | GENERAL | OTHER`. The brief lists Admin where this has GENERAL. Priorities add `URGENT` on top of the brief's Low / Medium / High.
- The brief specifies two roles; there is a third, `ADMIN`, which owns user management and KB upload. Extra surface area to review, and it was not asked for.
- Stretch goals not attempted: email notifications, AI confidence score, rate limiting. `docker-compose.yml` covers only Postgres and Adminer, not the app itself, so the Dockerize goal is partial.
- No meaningful test suite. `npm test --workspace=backend` runs the default scaffolded spec.

**Correctness and quality caveats**

- The AI override percentage in `/api/metrics/overview` divides `count(audit_logs where field = 'category')` by `count(tickets where aiCategory is not null)`. Audit rows, not distinct tickets, so an agent who changes the same ticket's category twice counts twice and the figure can exceed 100%.
- Embedding vectors are truncated with `slice(0, 768)` and not re-normalized, so cosine similarities are marginally distorted. Consistent between query and document, so ranking holds up, but the absolute 0.4 threshold is softer than it looks.
- Retrieval has no per-knowledge-base or per-category scoping: every query searches all chunks, and the gate only inspects the top hit's score.
- Without `GEMINI_API_KEY` the system degrades silently rather than loudly: classification defaults to `GENERAL` / `LOW`, chunks store NULL embeddings, and the assistant answers from the model's general knowledge with no citations. There is no mocked LLM path.
- Attachments store a filename only (`tickets.attachmentFilename`), with no upload, matching the brief. Admin KB uploads do write real files, to `backend/uploads/knowledge-base/` on local disk, which does not survive a container restart or work across replicas.
- `resolveTicket` accepts `ragCitations` from the client rather than reading back what the server stored on the ticket, so a crafted request could record citations that were never retrieved.
- Socket reconnects do not replay missed events and the client does not refetch on reconnect. See (f).
- Pagination on `GET /api/tickets` is optional: if `page` and `limit` are omitted the endpoint returns every matching ticket in one response.

**Disclosure**

No boilerplate or starter template beyond `nest new` and `create-next-app`. AI tooling was used throughout for scaffolding, DTOs, Swagger annotations, and UI markup, with the specific limits described in (h). LLM access is the Gemini free tier (`gemini-2.0-flash` for chat, `gemini-embedding-001` for embeddings); `LlmFactory` also supports Grok, OpenRouter, and OpenAI through `AI_PROVIDER`, though only the Gemini path has been exercised.
