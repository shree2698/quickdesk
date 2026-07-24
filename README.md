# QuickDesk - AI-Assisted Helpdesk Application

QuickDesk is an enterprise-grade internal support ticketing system featuring automated AI categorization, priority triage, a RAG-powered Q&A virtual assistant, and a realtime agent-employee messaging workspace.

---

## 🚀 Quick Start (Local Setup)

To spin up the entire application stack locally:

1. **Clone and Navigate**: Ensure you are in the project root: [quickdesk](file:///E:/ME/quickdesk).
2. **Start Infrastructure**: Run Docker Compose to boot up PostgreSQL (with pgvector) and Redis:
   ```bash
   docker compose up -d
   ```
3. **Configure & Run Backend**:
   - Navigate to [backend](file:///E:/ME/quickdesk/backend).
   - Copy [.env.example](file:///E:/ME/quickdesk/backend/.env.example) to `.env` and fill in your keys (including your `GEMINI_API_KEY`).
   - Run migrations and seeds:
     ```bash
     npm install
     npx prisma migrate dev
     npx prisma db seed
     ```
   - Start the NestJS dev server:
     ```bash
     npm run start:dev
     ```
4. **Configure & Run Frontend**:
   - Navigate to [frontend](file:///E:/ME/quickdesk/frontend).
   - Start the Next.js dev server:
     ```bash
     npm install
     npm run dev
     ```
   - Open your browser at `http://localhost:3000` to access the dashboard.

---

## 📂 Project Structure

- **[backend](file:///E:/ME/quickdesk/backend)**: NestJS server application containing business modules:
  - [src/auth](file:///E:/ME/quickdesk/backend/src/auth): JWT and role validation logic.
  - [src/tickets](file:///E:/ME/quickdesk/backend/src/tickets): Ticket operations and state management.
  - [src/ai](file:///E:/ME/quickdesk/backend/src/ai): LangChain and Gemini integrations.
  - [src/realtime](file:///E:/ME/quickdesk/backend/src/realtime): WebSocket gateways.
- **[frontend](file:///E:/ME/quickdesk/frontend)**: Next.js Client App (Employee and Agent panels).
- **[docs](file:///E:/ME/quickdesk/docs)**: Technical design specifications and deployment guidelines.
- **[knowledge-base](file:///E:/ME/quickdesk/knowledge-base)**: Markdown policy documents parsed by the RAG search:
  - [leave-policy.md](file:///E:/ME/quickdesk/knowledge-base/leave-policy.md)
  - [password-reset.md](file:///E:/ME/quickdesk/knowledge-base/password-reset.md)
  - [vpn-setup.md](file:///E:/ME/quickdesk/knowledge-base/vpn-setup.md)
  - [laptop-request.md](file:///E:/ME/quickdesk/knowledge-base/laptop-request.md)
  - [expense-reimbursement.md](file:///E:/ME/quickdesk/knowledge-base/expense-reimbursement.md)

---

## 📚 Technical Documentation Suite

For a detailed look at the application architecture and setup, review the files in the [docs](file:///E:/ME/quickdesk/docs) folder:

1. **[01 System Overview](file:///E:/ME/quickdesk/docs/01-system-overview.md)**: Product description, feature highlights, and functional/non-functional requirements.
2. **[02 Architecture](file:///E:/ME/quickdesk/docs/02-architecture.md)**: Multi-layer system design, request flowcharts, and directory layouts.
3. **[03 Database Spec](file:///E:/ME/quickdesk/docs/03-database.md)**: ER Diagram, schemas, custom indexes, constraints, and migrations.
4. **[04 API Spec](file:///E:/ME/quickdesk/docs/04-api.md)**: REST routing paths, request formats, responses, and authorization roles.
5. **[05 AI & RAG Pipeline](file:///E:/ME/quickdesk/docs/05-ai-rag.md)**: Text chunking, similarity queries, embedding maps, and prompt formats.
6. **[06 Auth & Security](file:///E:/ME/quickdesk/docs/06-auth.md)**: JWT lifecycles, bcrypt details, middleware rules, and handshake validators.
7. **[07 Realtime Gateway](file:///E:/ME/quickdesk/docs/07-realtime.md)**: Socket room logic, client-server event list, and reconnect configurations.
8. **[08 Deployment Guide](file:///E:/ME/quickdesk/docs/08-deployment.md)**: Build scripts, docker-compose configuration, and production scaling rules.
9. **[09 Testing Strategy](file:///E:/ME/quickdesk/docs/09-testing.md)**: Jest unit checks, integration setups, API tests, and edge case mappings.