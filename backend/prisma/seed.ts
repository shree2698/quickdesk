import { PrismaClient, Role, TicketStatus, TicketCategory, TicketPriority } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// ---------------------------------------------------------------------------
// 1. Environment & Prisma setup
// ---------------------------------------------------------------------------
let currentDir = __dirname;
while (currentDir) {
  const envPath = path.join(currentDir, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
  const parentDir = path.dirname(currentDir);
  if (parentDir === currentDir) break;
  currentDir = parentDir;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not defined.');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// 2. Embedding helper — matches runtime VectorStoreService config
// ---------------------------------------------------------------------------
function createEmbeddings(): GoogleGenerativeAIEmbeddings | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  GEMINI_API_KEY not set — embeddings will be skipped during seeding');
    return null;
  }
  return new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: process.env.EMBEDDING_MODEL || 'gemini-embedding-001',
  });
}

// ---------------------------------------------------------------------------
// 3. Rate-limited batch embedding (respects Gemini API quotas)
// ---------------------------------------------------------------------------
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function main() {
  console.log('🌱 Starting QuickDesk database seeding...\n');

  // =========================================================================
  // STEP 1 — Seed default users
  // =========================================================================
  const saltRounds = 10;
  const adminPassword = await bcrypt.hash('admin123', saltRounds);
  const agentPassword = await bcrypt.hash('agent123', saltRounds);
  const employeePassword = await bcrypt.hash('employee123', saltRounds);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@quickdesk.com' },
    update: { passwordHash: adminPassword, name: 'System Admin', role: Role.ADMIN },
    create: {
      email: 'admin@quickdesk.com',
      name: 'System Admin',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  const agentJohn = await prisma.user.upsert({
    where: { email: 'agent.john@quickdesk.com' },
    update: { passwordHash: agentPassword, name: 'Agent John', role: Role.AGENT },
    create: {
      email: 'agent.john@quickdesk.com',
      name: 'Agent John',
      passwordHash: agentPassword,
      role: Role.AGENT,
    },
  });

  const agentSarah = await prisma.user.upsert({
    where: { email: 'agent.sarah@quickdesk.com' },
    update: { passwordHash: agentPassword, name: 'Agent Sarah', role: Role.AGENT },
    create: {
      email: 'agent.sarah@quickdesk.com',
      name: 'Agent Sarah',
      passwordHash: agentPassword,
      role: Role.AGENT,
    },
  });

  const employeeBob = await prisma.user.upsert({
    where: { email: 'employee.bob@quickdesk.com' },
    update: { passwordHash: employeePassword, name: 'Employee Bob', role: Role.EMPLOYEE },
    create: {
      email: 'employee.bob@quickdesk.com',
      name: 'Employee Bob',
      passwordHash: employeePassword,
      role: Role.EMPLOYEE,
    },
  });

  const employeeAlice = await prisma.user.upsert({
    where: { email: 'employee.alice@quickdesk.com' },
    update: { passwordHash: employeePassword, name: 'Employee Alice', role: Role.EMPLOYEE },
    create: {
      email: 'employee.alice@quickdesk.com',
      name: 'Employee Alice',
      passwordHash: employeePassword,
      role: Role.EMPLOYEE,
    },
  });

  console.log('✅ Default user accounts seeded:');
  console.log(`   Admin:      ${admin.email}         (password: admin123)`);
  console.log(`   Agent:      ${agentJohn.email}  (password: agent123)`);
  console.log(`   Agent:      ${agentSarah.email} (password: agent123)`);
  console.log(`   Employee:   ${employeeBob.email}   (password: employee123)`);
  console.log(`   Employee:   ${employeeAlice.email} (password: employee123)`);

  // =========================================================================
  // STEP 2 — Load & index Knowledge Base articles with proper chunk metadata
  // =========================================================================
  const kbDir = path.join(__dirname, '..', 'knowledge-base');
  const embeddings = createEmbeddings();

  if (fs.existsSync(kbDir)) {
    const files = fs.readdirSync(kbDir).filter((f) => f.endsWith('.md'));
    console.log(`\n📚 Processing ${files.length} Knowledge Base articles...`);

    // Use the SAME splitter config as DocumentLoaderService (1000 chars, 200 overlap)
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', ' ', ''],
    });

    for (const file of files) {
      const filePath = path.join(kbDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Derive a readable title from filename
      const title = file
        .replace('.md', '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      // Upsert the KnowledgeBase article record (stable seed ID)
      const seedId = `seed-${file}`;
      const article = await prisma.knowledgeBase.upsert({
        where: { id: seedId },
        update: {
          title,
          filename: file,
          mimeType: 'text/markdown',
          storagePath: filePath,
        },
        create: {
          id: seedId,
          title,
          filename: file,
          mimeType: 'text/markdown',
          storagePath: filePath,
          status: 'PROCESSING',
          uploadedBy: admin.id,
        },
      });

      // Split content into chunks
      const docs = await splitter.createDocuments([content]);

      // Clear any existing chunks for this article (idempotent re-seed)
      await prisma.knowledgeBaseChunk.deleteMany({
        where: { knowledgeBaseId: article.id },
      });

      let embeddedCount = 0;

      for (let j = 0; j < docs.length; j++) {
        const chunkText = docs[j].pageContent;
        let vector: number[] | null = null;

        if (embeddings) {
          try {
            const rawVectors = await embeddings.embedDocuments([chunkText]);
            if (rawVectors?.[0]?.length) {
              vector = rawVectors[0].slice(0, 768);
            }
          } catch (e: any) {
            console.warn(`   ⚠️  Embedding chunk ${j} failed for ${file}: ${e.message}`);
          }
        }

        const chunkMetadata = {
          sourceTitle: title,
          sourceFile: file,
          knowledgeBaseId: article.id,
          chunkIndex: j,
          totalChunks: docs.length,
        };

        if (vector && vector.length > 0) {
          const vectorStr = `[${vector.join(',')}]`;
          await prisma.$executeRawUnsafe(
            `INSERT INTO knowledge_base_chunks (id, "knowledgeBaseId", "chunkIndex", content, metadata, embedding)
             VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5::vector)`,
            article.id,
            j,
            chunkText,
            JSON.stringify(chunkMetadata),
            vectorStr,
          );
          embeddedCount++;
        } else {
          await prisma.knowledgeBaseChunk.create({
            data: {
              knowledgeBaseId: article.id,
              chunkIndex: j,
              content: chunkText,
              metadata: chunkMetadata,
            },
          });
        }
      }

      // Update the KnowledgeBase record with final status and chunk count
      await prisma.knowledgeBase.update({
        where: { id: article.id },
        data: {
          status: 'INDEXED',
          chunkCount: docs.length,
        },
      });

      console.log(
        `   ✓ ${file}: ${docs.length} chunks created, ${embeddedCount} embedded`,
      );
    }
  } else {
    console.warn('⚠️  knowledge-base/ directory not found — skipping KB seeding');
  }

  // =========================================================================
  // STEP 3 — Seed sample tickets (idempotent via upsert with stable IDs)
  // =========================================================================
  console.log('\n🎫 Seeding sample tickets & audit history...');

  const TICKET_SEED_IDS = {
    vpnIssue: 'seed-ticket-vpn-auth-fail',
    leaveBalance: 'seed-ticket-leave-balance',
    expenseReimburse: 'seed-ticket-expense-ide',
  };

  const ticket1 = await prisma.ticket.upsert({
    where: { id: TICKET_SEED_IDS.vpnIssue },
    update: {
      title: 'VPN fails to authenticate on remote network',
      description:
        'I am attempting to connect to the corporate VPN from home but receive error "TLS Handshake Failed". I have tried restarting the VPN client and my router.',
      status: TicketStatus.OPEN,
      category: TicketCategory.IT,
      priority: TicketPriority.HIGH,
      aiCategory: TicketCategory.IT,
      aiPriority: TicketPriority.HIGH,
      employeeId: employeeBob.id,
    },
    create: {
      id: TICKET_SEED_IDS.vpnIssue,
      title: 'VPN fails to authenticate on remote network',
      description:
        'I am attempting to connect to the corporate VPN from home but receive error "TLS Handshake Failed". I have tried restarting the VPN client and my router.',
      status: TicketStatus.OPEN,
      category: TicketCategory.IT,
      priority: TicketPriority.HIGH,
      aiCategory: TicketCategory.IT,
      aiPriority: TicketPriority.HIGH,
      employeeId: employeeBob.id,
      attachmentFilename: 'vpn-error.png',
    },
  });

  const ticket2 = await prisma.ticket.upsert({
    where: { id: TICKET_SEED_IDS.leaveBalance },
    update: {
      title: 'Need annual leave balance clarification for Q3',
      description:
        'The HR portal shows 12 days remaining, but I took 3 days off last month. Can someone verify?',
      status: TicketStatus.RESOLVED,
      category: TicketCategory.HR,
      priority: TicketPriority.MEDIUM,
      aiCategory: TicketCategory.HR,
      aiPriority: TicketPriority.LOW,
      employeeId: employeeAlice.id,
      agentId: agentJohn.id,
    },
    create: {
      id: TICKET_SEED_IDS.leaveBalance,
      title: 'Need annual leave balance clarification for Q3',
      description:
        'The HR portal shows 12 days remaining, but I took 3 days off last month. Can someone verify?',
      status: TicketStatus.RESOLVED,
      category: TicketCategory.HR,
      priority: TicketPriority.MEDIUM,
      aiCategory: TicketCategory.HR,
      aiPriority: TicketPriority.LOW,
      employeeId: employeeAlice.id,
      agentId: agentJohn.id,
      aiDraftReply:
        'Dear Alice,\n\nBased on our Leave Policy, leave requests submitted in the last 30 days are reflected after payroll cycle close. Your accurate balance is 12 days.',
      finalReply:
        'Hi Alice,\n\nI verified with payroll. Your leave request was approved after the last cutoff, so 12 days is indeed your accurate balance.\n\nBest regards,\nAgent John',
      ragCitations: ['Leave Policy'],
      resolvedAt: new Date(),
    },
  });

  const ticket3 = await prisma.ticket.upsert({
    where: { id: TICKET_SEED_IDS.expenseReimburse },
    update: {
      title: 'Software expense reimbursement pending approval',
      description:
        'Submitted receipt for IDE subscription $49. Please expedite reimbursement approval.',
      status: TicketStatus.IN_PROGRESS,
      category: TicketCategory.FINANCE,
      priority: TicketPriority.MEDIUM,
      aiCategory: TicketCategory.FINANCE,
      aiPriority: TicketPriority.MEDIUM,
      employeeId: employeeBob.id,
      agentId: agentSarah.id,
    },
    create: {
      id: TICKET_SEED_IDS.expenseReimburse,
      title: 'Software expense reimbursement pending approval',
      description:
        'Submitted receipt for IDE subscription $49. Please expedite reimbursement approval.',
      status: TicketStatus.IN_PROGRESS,
      category: TicketCategory.FINANCE,
      priority: TicketPriority.MEDIUM,
      aiCategory: TicketCategory.FINANCE,
      aiPriority: TicketPriority.MEDIUM,
      employeeId: employeeBob.id,
      agentId: agentSarah.id,
      attachmentFilename: 'receipt-ide.pdf',
    },
  });

  // =========================================================================
  // STEP 4 — Seed audit log entries (idempotent — delete & recreate for seeds)
  // =========================================================================
  // Clean up seed audit logs before re-creating
  await prisma.auditLog.deleteMany({
    where: { ticketId: ticket2.id, field: 'priority' },
  });

  await prisma.auditLog.create({
    data: {
      ticketId: ticket2.id,
      changedById: agentJohn.id,
      field: 'priority',
      oldValue: 'LOW',
      newValue: 'MEDIUM',
    },
  });

  // =========================================================================
  // STEP 5 — Seed sample chat messages for the resolved ticket
  // =========================================================================
  const existingMessages = await prisma.message.count({
    where: { ticketId: ticket2.id },
  });

  if (existingMessages === 0) {
    await prisma.message.createMany({
      data: [
        {
          ticketId: ticket2.id,
          senderId: employeeAlice.id,
          text: 'Hi, I noticed my leave balance seems incorrect. The portal shows 12 days but I recently took 3 days off.',
        },
        {
          ticketId: ticket2.id,
          senderId: agentJohn.id,
          text: 'Hi Alice, thanks for reaching out. Let me check with the payroll team on this. Leave balance updates typically happen after the payroll cycle closes.',
        },
        {
          ticketId: ticket2.id,
          senderId: agentJohn.id,
          text: 'I verified with payroll — your 3 days were approved after the last cutoff date, so they will reflect in the next cycle. 12 days is your accurate current balance.',
        },
      ],
    });
    console.log('   ✓ Sample chat messages seeded for resolved ticket');
  }

  console.log(`   ✓ Tickets seeded — Open: ${ticket1.id}, Resolved: ${ticket2.id}, In Progress: ${ticket3.id}`);
  console.log('\n🎉 Database seeding completed successfully!');
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------
main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
