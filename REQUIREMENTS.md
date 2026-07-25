# QuickDesk — Requirements Specification

> **Source:** `docs/Coding Assessment_Exp.pdf`
>
> **Related Docs:** [System Overview](file:///E:/ME/quickdesk/docs/01-system-overview.md) · [Architecture](file:///E:/ME/quickdesk/docs/02-architecture.md) · [Database](file:///E:/ME/quickdesk/docs/03-database.md) · [API](file:///E:/ME/quickdesk/docs/04-api.md) · [AI & RAG](file:///E:/ME/quickdesk/docs/05-ai-rag.md) · [Auth](file:///E:/ME/quickdesk/docs/06-auth.md) · [Realtime](file:///E:/ME/quickdesk/docs/07-realtime.md) · [Deployment](file:///E:/ME/quickdesk/docs/08-deployment.md) · [Testing](file:///E:/ME/quickdesk/docs/09-testing.md)
>
> **Agent Guide:** [AGENT.md](file:///E:/ME/quickdesk/AGENT.md) · **Design Doc:** [DESIGN.md](file:///E:/ME/quickdesk/DESIGN.md) · **Work Plan:** [WORKPLAN.md](file:///E:/ME/quickdesk/WORKPLAN.md)

---

## 1. Project Overview

**QuickDesk** is a small internal helpdesk application that uses an LLM to assist support agents. Employees raise support tickets (e.g., "My VPN is not connecting", "Need access to the finance drive") and a team of support agents responds. **The AI does NOT replace the agent — it helps the agent move faster.**

---

## 2. Core Scope (Must Build)

### 2.1 Authentication & Roles

| # | Requirement | Priority |
|---|-------------|----------|
| 1 | JWT-based authentication | **Must** |
| 2 | Two roles: `employee` and `agent` | **Must** |
| 2a | Employees can submit tickets and view **only their own** tickets | **Must** |
| 2b | Agents can see **all** tickets, reply, and resolve them | **Must** |
| 3 | Role enforcement **must be on the backend**, not just hidden buttons on the frontend (will be tested) | **Must** |
| 4 | Passwords hashed with **bcrypt** or **argon2**. Plaintext is an **instant fail** | **Must** |

### 2.2 Ticket Submission (Employee Side)

| # | Requirement | Priority |
|---|-------------|----------|
| 5 | Simple form: **title**, **description**, and optional **attachment** field (store filename only, no real upload needed) | **Must** |
| 6 | On submission, backend uses LLM to: | **Must** |
| 6a | — Suggest a **category** (`IT`, `HR`, `Finance`, `Admin`, `Other`) | **Must** |
| 6b | — Suggest a **priority** (`Low`, `Medium`, `High`) | **Must** |
| 6c | — Both values stored on the ticket, marked as **"AI-suggested"** (agent can override later) | **Must** |
| 7 | Employees see a **"My Tickets"** view with status of each ticket | **Must** |

### 2.3 Agent Dashboard

| # | Requirement | Priority |
|---|-------------|----------|
| 8 | List view of all tickets with **filters** (status, category, priority) and a **search box** on title | **Must** |
| 9 | Ticket detail view showing: | **Must** |
| 9a | — Original ticket and the employee who raised it | **Must** |
| 9b | — AI-suggested category and priority (agent can **override** either) | **Must** |
| 9c | — AI-drafted reply generated using **RAG** over a small knowledge base | **Must** |
| 9d | — Editor where agent can edit the AI draft and click **"Send Reply"** | **Must** |
| 9e | — **Citations**: show which knowledge base article(s) the AI pulled from | **Must** |
| 10 | On "Send Reply": ticket moves to **"Resolved"**, final reply is stored. Both **AI draft** and **final reply** are kept for comparison | **Must** |
| 11 | **Override audit log**: when agent changes AI-suggested category or priority → log (who, when, from, to). Visible on ticket detail page | **Must** |

### 2.4 Real-Time Updates

| # | Requirement | Priority |
|---|-------------|----------|
| 12 | When an employee submits a new ticket, all agents on the dashboard see it appear **without refreshing** | **Must** |
| 13 | When an agent replies, the employee viewing "My Tickets" sees status flip to "Resolved" **without refreshing** | **Must** |
| 14 | Use **Socket.io**, native **WebSockets**, or **Server-Sent Events**. Document the choice in README | **Must** |

### 2.5 Knowledge Base for RAG

| # | Requirement | Priority |
|---|-------------|----------|
| 15 | Seed system with **5–10 small markdown** knowledge base articles (topics: VPN setup, password reset policy, leave application process, expense reimbursement, laptop request, etc.). 100–300 words each | **Must** |
| 16 | AI drafted reply must be **grounded** in these articles. If no article is relevant, AI should **say so** rather than hallucinate | **Must** |

### 2.6 Basic Metrics Page (Agent-Only)

| # | Requirement | Priority |
|---|-------------|----------|
| 17a | Total tickets by status (Open / Resolved) | **Must** |
| 17b | Tickets by category (count) | **Must** |
| 17c | Median resolution time | **Must** |
| 17d | How often agents overrode AI's suggested category (percentage) | **Must** |

---

## 3. Stretch Goals (Optional)

> Pick at most **one or two**. Do NOT attempt all.

| Stretch Goal | Description |
|-------------|-------------|
| **Dockerize** | A working `docker-compose.yml` that spins up backend + frontend + DB with a single command |
| **Email Notifications** | When an agent replies, send a (mock or real) email notification to the employee. Console logging is acceptable |
| **AI Confidence Score** | Have the LLM return a confidence score with its category suggestion and surface it in the UI |
| **Rate Limiting** | Limit ticket submission to N per hour per employee |
| **Tests** | Meaningful tests on critical paths (auth, RAG endpoint, role enforcement) |

---

## 4. Tech Stack Constraints

| Layer | Choice |
|-------|--------|
| **Frontend** | React or Next.js (TypeScript preferred but not required) |
| **Backend** | Nest.js **OR** Python + FastAPI (pick one) |
| **Database** | PostgreSQL |
| **LLM** | Any free-tier provider: OpenAI, Gemini, Groq (free), or HuggingFace inference. Document in README |
| **RAG Pipeline** | LangChain. In-memory vector store is fine (Chroma, FAISS, or LangChain MemoryVectorStore). No Pinecone needed |
| **Auth** | JWT + bcrypt/argon2. Plaintext passwords = instant fail |
| **Styling** | Anything (Tailwind, plain CSS, MUI). Must look intentional, not broken |

---

## 5. Hard Rules (Instant Fail / Not Accepted)

- ❌ Repo dumped in one massive commit at the end
- ❌ README obviously written entirely by AI with no specific decisions/numbers
- ❌ Hard-coded API keys committed to git (use `.env.example`)
- ❌ Plaintext passwords
- ❌ Copy of a public boilerplate with the brief bolted on top

---

## 6. Deliverables

### 6.1 GitHub Repository
- Public repo named `quickdesk` (or similar)
- Working `npm install` (or `pip install -r requirements.txt`) + clear run instructions
- `.env.example` with all required env variables (no real keys)
- **Seed script** that creates: 1 sample agent user, 1 sample employee user, and loads knowledge base articles

### 6.2 README.md (High Importance)
Must cover:
1. What this is (one paragraph)
2. How to run it locally (step-by-step, must work on fresh clone)
3. Architecture diagram (text-based or image)
4. API endpoints table (method, path, purpose, auth required)
5. Decisions and Tradeoffs (see Section 7 below)
6. What I would do with more time
7. Known issues / limitations

### 6.3 Demo Video (3–5 minutes)
- Show: submitting a ticket → AI suggestion appearing → agent replying with AI draft
- Talk through architecture in 1–2 minutes
- Keep it casual

---

## 7. Decisions & Tradeoffs to Address in README

| ID | Question |
|----|----------|
| a | Why did you pick this frontend framework (React vs Next.js)? |
| b | How did you structure the RAG pipeline? Chunk size, embedding model, retriever, prompt? |
| c | How did you handle the case where the LLM returns a category not in the allowed list? |
| d | Where did you store the JWT on the client, and why? |
| e | How did you enforce role-based access on the backend? What stops an employee from hitting an agent-only endpoint? |
| f | Why did you pick Socket.io / WebSockets / SSE for real-time? What is the failure mode if the socket disconnects? |
| g | What is the worst failure mode in your system today, and what would you do to address it? |
| h | Where did AI tools help you most? Where did they hurt or mislead you? |

---

## 8. FAQ Summary

| Question | Answer |
|----------|--------|
| Can't get an LLM API key? | Use **Groq** (free tier). If absolutely can't, mock the LLM call with realistic output and document in README |
| Can I use a boilerplate? | Yes, but **disclose it** in README. Avoid templates with helpdesk-like features |
| Can I skip JWT and use sessions? | Yes, but **explain the tradeoff** in README |
| How polished must the UI be? | It should look like you **cared**. Doesn't need to look designer-touched |
| What if I run out of time? | Submit what you have with a clear "what is missing" section. **Honesty > overreach** |
| How important is the demo video? | **Important** — cheapest way for them to see how you think |
