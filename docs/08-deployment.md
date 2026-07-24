# QuickDesk - Deployment Guide

This guide details the processes required to build, test, package, and deploy QuickDesk to development and production environments.

---

## Requirements
To compile and run QuickDesk, your environment must satisfy the following dependencies:
- **Node.js**: version `20.x` or later (LTS recommended)
- **Database**: PostgreSQL `15+` with the **`pgvector`** extension installed
- **Caching & Broker**: Redis `7+` (required if running clustered Socket.io servers)
- **Containerization**: Docker and Docker Compose (recommended for local setup)

---

## Environment Variables

### Backend (`backend/.env`)
```ini
PORT=3000
DATABASE_URL="postgresql://postgres:postgres_pwd@localhost:5432/quickdesk?schema=public"
JWT_SECRET="YOUR_LONG_RANDOM_HMAC_SECRET"
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
REDIS_URL="redis://localhost:6379"
CORS_ORIGIN="http://localhost:3001"
```

### Frontend (`frontend/.env.local`)
```ini
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXT_PUBLIC_WS_URL="http://localhost:3000/api/ws"
```

---

## Database Setup & Initialization
1. **Enable pgvector**: Ensure your Postgres server has `pgvector` loaded. If self-hosting, run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
2. **Apply Schema Migrations**:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```
3. **Execute Seed Data Loader**: Populate system accounts and build the vector search index from the knowledge base docs:
   ```bash
   npx prisma db seed
   ```

---

## Service Compilations

### Backend Deployment
Build commands for production deployment:
```bash
cd backend
npm install
npm run build
npm run start:prod
```
The compiled output is located under `backend/dist/main.js`.

### Frontend Deployment
Build commands for production compilation:
```bash
cd frontend
npm install
npm run build
npm run start
```
The production bundle compiles inside directory `frontend/.next`.

---

## Containerization (Docker)
We use Docker Compose to simplify multi-service orchestrations:

### `docker-compose.yml` (Root Directory)
```yaml
version: '3.8'

services:
  postgres:
    image: ankane/pgvector:v0.5.1  # Postgres bundled with pgvector
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_pwd
      POSTGRES_DB: quickdesk
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres_pwd@postgres:5432/quickdesk?schema=public
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000/api
      - NEXT_PUBLIC_WS_URL=http://localhost:3000/api/ws
    depends_on:
      - backend

volumes:
  pgdata:
```

---

## Production Architecture Notes
1. **Reverse Proxy (Nginx)**: Deploy Nginx in front of both services to route incoming HTTP requests:
   - Route `/api/ws/*` to the `backend` upstream, ensuring WebSocket headers are correctly updated:
     ```nginx
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "upgrade";
     ```
   - Route `/api/*` to the `backend` REST API.
   - Route all other requests (`/*`) to the `frontend` server.
2. **WebSocket Clustering**: When scaling the backend beyond a single node instance, configure the Socket.io Redis adapter in `backend/src/realtime/realtime.module.ts`. This ensures socket events emitted on server Node A reach connections listening on server Node B.

---

## CI/CD Pipeline (GitHub Actions)
Deployments are managed by a GitHub Actions workflow:

```yaml
name: Deploy Pipeline

on:
  push:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      # Backend Checks
      - name: Backend CI
        run: |
          cd backend
          npm ci
          npm run lint
          npm run test
          npm run build

      # Frontend Checks
      - name: Frontend CI
        run: |
          cd frontend
          npm ci
          npm run build
```
In CD steps, compiled Docker images are tagged and pushed to registries (e.g. DockerHub or Amazon ECR), initiating rolling updates in server clusters (e.g. AWS ECS or Kubernetes).