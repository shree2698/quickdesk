import { PrismaClient, Role, TicketStatus, TicketCategory, TicketPriority } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// Load root .env file
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
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting QuickDesk comprehensive database seeding...');

  // 1. Create Default Users (Bcrypt hashed passwords)
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

  const agent = await prisma.user.upsert({
    where: { email: 'agent@quickdesk.com' },
    update: { passwordHash: agentPassword, name: 'Agent Smith', role: Role.AGENT },
    create: {
      email: 'agent@quickdesk.com',
      name: 'Agent Smith',
      passwordHash: agentPassword,
      role: Role.AGENT,
    },
  });

  const agent2 = await prisma.user.upsert({
    where: { email: 'sarah.agent@quickdesk.com' },
    update: { passwordHash: agentPassword, name: 'Agent Sarah', role: Role.AGENT },
    create: {
      email: 'sarah.agent@quickdesk.com',
      name: 'Agent Sarah',
      passwordHash: agentPassword,
      role: Role.AGENT,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'employee@quickdesk.com' },
    update: { passwordHash: employeePassword, name: 'John Employee', role: Role.EMPLOYEE },
    create: {
      email: 'employee@quickdesk.com',
      name: 'John Employee',
      passwordHash: employeePassword,
      role: Role.EMPLOYEE,
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: 'alice@quickdesk.com' },
    update: { passwordHash: employeePassword, name: 'Alice Smith', role: Role.EMPLOYEE },
    create: {
      email: 'alice@quickdesk.com',
      name: 'Alice Smith',
      passwordHash: employeePassword,
      role: Role.EMPLOYEE,
    },
  });

  console.log(`✅ Default accounts created:`);
  console.log(`   - Admin:    ${admin.email} (password: admin123)`);
  console.log(`   - Agent:    ${agent.email} (password: agent123)`);
  console.log(`   - Agent:    ${agent2.email} (password: agent123)`);
  console.log(`   - Employee: ${employee.email} (password: employee123)`);
  console.log(`   - Employee: ${employee2.email} (password: employee123)`);

  // 2. Load & Index Knowledge Base Articles into Vector DB
  const kbDir = path.join(__dirname, '..', 'knowledge-base');
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  if (fs.existsSync(kbDir)) {
    const files = fs.readdirSync(kbDir).filter((f) => f.endsWith('.md'));
    console.log(`\n📚 Processing ${files.length} Knowledge Base articles...`);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
      separators: ['\n\n', '\n', ' ', ''],
    });

    for (const file of files) {
      const filePath = path.join(kbDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const title = file.replace('.md', '').replace(/-/g, ' ').toUpperCase();

      const article = await prisma.knowledgeArticle.upsert({
        where: { filename: file },
        update: { title },
        create: { title, filename: file },
      });

      const docs = await splitter.createDocuments([content]);
      await prisma.knowledgeArticleChunk.deleteMany({ where: { articleId: article.id } });

      for (let i = 0; i < docs.length; i++) {
        const chunkText = docs[i].pageContent;
        let embeddingVector: number[] | null = null;

        if (ai) {
          try {
            const embedRes = await ai.models.embedContent({
              model: 'text-embedding-004',
              contents: chunkText,
            });
            embeddingVector = embedRes.embeddings?.[0]?.values || null;
          } catch (e) {
            // Silently fallback if key invalid
          }
        }

        const chunk = await prisma.knowledgeArticleChunk.create({
          data: {
            articleId: article.id,
            content: chunkText,
            chunkIndex: i,
          },
        });

        if (embeddingVector && embeddingVector.length > 0) {
          const vectorStr = `[${embeddingVector.join(',')}]`;
          await prisma.$executeRawUnsafe(
            `UPDATE "KnowledgeArticleChunk" SET embedding = $1::vector WHERE id = $2`,
            vectorStr,
            chunk.id,
          );
        }
      }
      console.log(`   ✓ Indexed ${file} (${docs.length} chunks)`);
    }
  }

  // 3. Seed Sample Ticket Pool
  console.log('\n🎫 Seeding sample ticket pool & audit history...');

  const ticket1 = await prisma.ticket.create({
    data: {
      title: 'VPN fails to authenticate on remote network',
      description: 'I am attempting to connect to the corporate VPN from home but receive error "TLS Handshake Failed".',
      status: TicketStatus.OPEN,
      category: TicketCategory.IT,
      priority: TicketPriority.HIGH,
      aiCategory: TicketCategory.IT,
      aiPriority: TicketPriority.HIGH,
      employeeId: employee.id,
      attachmentFilename: 'vpn-error.png',
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      title: 'Need annual leave balance clarification for Q3',
      description: 'The HR portal shows 12 days remaining, but I took 3 days off last month. Can someone verify?',
      status: TicketStatus.RESOLVED,
      category: TicketCategory.HR,
      priority: TicketPriority.MEDIUM,
      aiCategory: TicketCategory.HR,
      aiPriority: TicketPriority.LOW,
      employeeId: employee2.id,
      agentId: agent.id,
      aiDraftReply: 'Dear Alice,\n\nBased on our Leave Policy, leave requests submitted in the last 30 days are reflected after payroll cycle close. Your accurate balance is 12 days.',
      finalReply: 'Hi Alice,\n\nI verified with payroll. Your leave request was approved after the last cutoff, so 12 days is indeed your accurate balance.\n\nBest regards,\nAgent Smith',
      ragCitations: ['LEAVE POLICY'],
      resolvedAt: new Date(),
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      title: 'Software expense reimbursement pending approval',
      description: 'Submitted receipt for IDE subscription $49. Please expedite reimbursement approval.',
      status: TicketStatus.IN_PROGRESS,
      category: TicketCategory.FINANCE,
      priority: TicketPriority.MEDIUM,
      aiCategory: TicketCategory.FINANCE,
      aiPriority: TicketPriority.MEDIUM,
      employeeId: employee.id,
      agentId: agent2.id,
      attachmentFilename: 'receipt-ide.pdf',
    },
  });

  // 4. Seed Audit Logs for Overrides
  await prisma.auditLog.create({
    data: {
      ticketId: ticket2.id,
      changedById: agent.id,
      field: 'priority',
      oldValue: 'LOW',
      newValue: 'MEDIUM',
    },
  });

  console.log(`   ✓ Created sample tickets (Open: ${ticket1.id}, Resolved: ${ticket2.id}, In Progress: ${ticket3.id})`);
  console.log('\n🎉 Comprehensive database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
