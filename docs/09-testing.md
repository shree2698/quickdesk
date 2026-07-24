# QuickDesk - Testing Strategy

This document outlines the testing architecture and validation procedures built into the QuickDesk codebase to ensure long-term system stability.

---

## Testing Strategy
QuickDesk employs a testing pyramid focused on:
- **Unit Tests**: Verifying deterministic logic (auth utilities, state machine changes) isolated from external databases.
- **Integration Tests**: Verifying the database ORM queries, WebSocket gateway event relays, and mock Gemini API calls.
- **End-to-End (E2E) Tests**: Simulating full user journeys (Employee submitting ticket -> Agent claiming and chatting -> Ticket resolution).

---

## Unit Tests
Unit testing is executed using **Jest** in NestJS and **Vitest** in NextJS.

### Mocking Databases
We mock database queries using `jest-mock-extended` to prevent unit tests from executing raw SQL statements:

```typescript
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;
```

### Key Areas Tested
1. **Auth Service**: Password hashing correctness, signature generation, and JWT guard role validations.
2. **Ticket State Machine**: Asserting rules on ticket status transitions (e.g., a ticket marked `CLOSED` cannot be directly transitioned back to `IN_PROGRESS` without reopening first).
3. **KB Chunk Splitter**: Verifying character limit boundaries and paragraph splits are respected during documents indexing.

---

## Integration Tests
Integration testing validates the interplay between controllers, services, database storage layers, and network socket connections.

### 1. Database Integration
Runs database operations against a local test instance.
- Cleans data tables before running tests.
- Verifies relational cascades (e.g., message deletion cascades on ticket deletions).
- Tests `pgvector` Cosine Similarity query calculations.

### 2. Realtime WebSocket Testing
Checks socket communication logic using custom client setups.
- Sets up two concurrent local socket client connections.
- Connects using mock tokens.
- Asserts that when Client A emits `send_message`, the server relays `message_received` containing Client A's payload to Client B.

---

## API Testing
We use **Supertest** to test HTTP route handlers in NestJS:

```typescript
import * as request from 'supertest';

describe('TicketsController (e2e)', () => {
  it('POST /tickets - Should fail with 401 when token is missing', () => {
    return request(app.getHttpServer())
      .post('/tickets')
      .send({ title: "Issue" })
      .expect(401);
  });
});
```

---

## Manual Testing
Developers can verify endpoint behavior using:
- **Swagger Documentation**: Mounted in development environments at `/api/docs`. Shows all available routes, models, and permits manual triggers with auth headers.
- **Postman Workspace**: A pre-configured API collection defining login variables, token stores, and REST parameters.

---

## Edge Cases Verified
The test suites explicitly check for the following failure vectors:

| Scenario | Risk | Validation Check |
| :--- | :--- | :--- |
| **Gemini API Down / Rate Limited** | Server blocks on ticket submissions. | Fallback check sets category/priority to defaults (`GENERAL`/`LOW`) and continues ticket writing without crashing. |
| **Empty RAG Searches** | Null vectors break postgres query queries. | Gateway intercepts empty/whitespace queries before database lookups, asking user to clarify. |
| **Rapid Connect/Disconnect** | Connection tracking memory leaks in Redis. | Gateways use clean garbage collectors on connection timeouts. |
| **Oversized Ticket Descriptions** | Input overflows tokenizer models. | Input validation decorators (@Length) restrict descriptions to 5,000 characters. |

---

## Future Improvements
- **Browser Automation (Playwright)**: Implementing E2E scripts simulating mouse/keyboard inputs across Employee panels and Agent dashboards to inspect state visual elements.
- **LLM Output Drift Grading (Ragas)**: Introducing cron metrics evaluating RAG outputs to detect accuracy drifts when Gemini models receive upstream upgrades.