# QuickDesk - API Specification

The NestJS backend exposes REST endpoints under the `/api` prefix. All endpoints require JSON payloads and return JSON responses. Protected endpoints expect a Bearer token in the `Authorization` header (`Authorization: Bearer <JWT>`).

---

## Authentication

### `POST /api/auth/register`
Creates a new user account.
- **Request Body**:
  ```json
  {
    "email": "employee.name@company.com",
    "password": "SecurePassword123!",
    "name": "Employee Name"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "u-12345",
    "email": "employee.name@company.com",
    "name": "Employee Name",
    "role": "EMPLOYEE"
  }
  ```

### `POST /api/auth/login`
Authenticates a user and returns a JSON Web Token.
- **Request Body**:
  ```json
  {
    "email": "employee.name@company.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "u-12345",
      "email": "employee.name@company.com",
      "name": "Employee Name",
      "role": "EMPLOYEE"
    }
  }
  ```

---

## Employee APIs

### `GET /api/tickets`
Fetch tickets created by the authenticated employee.
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "t-8877",
      "title": "VPN Setup Issue on macOS",
      "status": "IN_PROGRESS",
      "category": "IT",
      "priority": "MEDIUM",
      "createdAt": "2026-07-24T10:15:30Z",
      "agent": {
        "name": "John Doe"
      }
    }
  ]
  ```

### `POST /api/tickets`
Submits a support ticket. The description is automatically analyzed by the AI engine to classify the category and priority.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "title": "Cannot access HR portal",
    "description": "I am trying to view my leave balance but the page times out."
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "t-8878",
    "title": "Cannot access HR portal",
    "description": "I am trying to view my leave balance but the page times out.",
    "status": "OPEN",
    "category": "HR",
    "priority": "HIGH",
    "employeeId": "u-12345",
    "createdAt": "2026-07-24T12:00:00Z"
  }
  ```

### `POST /api/ai/chat`
Ask questions to the RAG-assisted virtual assistant.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "message": "How do I install the VPN on Windows?"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "answer": "To install the VPN client on Windows, you must:\n1. Download the VPN Client from the Software Portal.\n2. Run installer and restart.\n3. Login with your company email.",
    "citations": [
      {
        "articleId": "kb-vpn",
        "title": "VPN Setup Guide",
        "snippet": "Download the VPN Client from the Internal Software Portal..."
      }
    ]
  }
  ```

---

## Agent APIs

### `GET /api/agent/tickets`
Fetch tickets for the agent work queues. Supports query parameters for filtering and pagination.
- **Headers**: `Authorization: Bearer <token>` (Requires role `AGENT` or `ADMIN`)
- **Query Params**: `?status=OPEN&priority=HIGH&category=IT`
- **Response (200 OK)**:
  ```json
  {
    "tickets": [
      {
        "id": "t-8878",
        "title": "Cannot access HR portal",
        "employeeName": "Alice Smith",
        "priority": "HIGH",
        "status": "OPEN",
        "createdAt": "2026-07-24T12:00:00Z"
      }
    ],
    "totalCount": 1
  }
  ```

### `PATCH /api/tickets/:id/assign`
Assigns a ticket to the logged-in agent (or transfers assignment).
- **Headers**: `Authorization: Bearer <token>` (Requires role `AGENT` or `ADMIN`)
- **Request Body**: None (assigns to current user) or:
  ```json
  {
    "agentId": "u-agent-44"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "t-8878",
    "agentId": "u-agent-44",
    "status": "IN_PROGRESS"
  }
  ```

### `PATCH /api/tickets/:id/status`
Updates ticket status. Triggers audit logs.
- **Headers**: `Authorization: Bearer <token>` (Requires role `AGENT` or `ADMIN`)
- **Request Body**:
  ```json
  {
    "status": "RESOLVED"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "t-8878",
    "status": "RESOLVED"
  }
  ```

### `POST /api/tickets/:id/copilot-suggest`
Invokes the Agent Copilot RAG search to recommend a draft response for the agent to use.
- **Headers**: `Authorization: Bearer <token>` (Requires role `AGENT` or `ADMIN`)
- **Response (200 OK)**:
  ```json
  {
    "suggestion": "Hello Alice,\n\nI see you are having trouble loading the HR portal. This is a known issue related to recent DNS updates. Please clear your cache and try visiting the site at: hr.internal.company.com.\n\nLet me know if this works!"
  }
  ```

---

## Metrics APIs

### `GET /api/admin/metrics/overview`
Aggregated dashboard numbers for system administrators.
- **Headers**: `Authorization: Bearer <token>` (Requires role `ADMIN`)
- **Response (200 OK)**:
  ```json
  {
    "openTicketsCount": 14,
    "resolvedTicketsCount": 128,
    "averageResolutionTimeMinutes": 42.6,
    "slaAdherenceRatePercent": 94.2,
    "volumeByCategory": {
      "IT": 82,
      "HR": 31,
      "FINANCE": 29
    }
  }
  ```

---

## Health APIs

### `GET /api/health`
Kubernetes, Docker, or monitoring ping endpoint verifying external resource connectivity.
- **Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-07-24T12:26:40Z",
    "services": {
      "database": "connected",
      "geminiApi": "connected",
      "sockets": "listening"
    }
  }
  ```