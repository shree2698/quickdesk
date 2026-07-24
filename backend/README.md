# QuickDesk - Backend Service

This is the NestJS backend application serving the QuickDesk platform, exposing REST API endpoints and Socket.io WebSocket channels.

---

## 🛠️ Requirements & Setup

1. **Navigate**: Ensure you are in the backend directory: [backend](file:///E:/ME/quickdesk/backend).
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Environment Setup**:
   - Create a `.env` file in this directory based on the [.env.example](file:///E:/ME/quickdesk/backend/.env.example) configuration.
   - Configure the `DATABASE_URL` pointing to your PostgreSQL instance.
   - Set your `GEMINI_API_KEY` for AI features.
4. **Database Migration & Seeding**:
   - Apply schema changes:
     ```bash
     npx prisma migrate dev
     ```
   - Seed database tables and initialize vector embeddings:
     ```bash
     npx prisma db seed
     ```
5. **Run Service**:
   - Start in development watch mode:
     ```bash
     npm run start:dev
     ```
   - Build and run production build:
     ```bash
     npm run build
     npm run start:prod
     ```

---

## 📂 Core Modules Layout

The application codebase is organized into domain modules under [src](file:///E:/ME/quickdesk/backend/src):

- **[auth](file:///E:/ME/quickdesk/backend/src/auth)**: Custom passport JWT strategy, login/register routers, and Role Guards.
- **[tickets](file:///E:/ME/quickdesk/backend/src/tickets)**: Relational ticket operations, assignments, queues, and status transitions.
- **[ai](file:///E:/ME/quickdesk/backend/src/ai)**: Orchestrates LangChain operations, embeds documents using `text-embedding-004`, performs similarity searches using pgvector, and predicts ticket triage classifications.
- **[realtime](file:///E:/ME/quickdesk/backend/src/realtime)**: Socket.io gateway handling private ticket rooms, chat messaging, and typing notifications.
- **[prisma](file:///E:/ME/quickdesk/backend/src/prisma)**: Prisma client initialization and database query wrappers.

---

## 🧪 Testing

The backend includes comprehensive test coverage:
- **Unit Tests**: Test core logic and state controls:
  ```bash
  npm run test
  ```
- **E2E/Integration Tests**: Run route checks using Supertest:
  ```bash
  npm run test:e2e
  ```
- **Test Coverage**: Review coverage reports:
  ```bash
  npm run test:cov
  ```

---

## 📚 API Specifications
For the full REST endpoint list and payload examples, refer to **[04 API Specification](file:///E:/ME/quickdesk/docs/04-api.md)**.
For database schema design and relations, refer to **[03 Database Spec](file:///E:/ME/quickdesk/docs/03-database.md)**.
