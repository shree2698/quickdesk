import { PrismaClient, Role, TicketStatus, TicketCategory, TicketPriority } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load root .env
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
  console.log('🌱 Starting QuickDesk database seeding...');

  // 1. Create Default Users (Bcrypt hashed passwords)
  const saltRounds = 10;
  const agentPassword = await bcrypt.hash('agent123', saltRounds);
  const employeePassword = await bcrypt.hash('employee123', saltRounds);

  const agent = await prisma.user.upsert({
    where: { email: 'agent@quickdesk.com' },
    update: {},
    create: {
      email: 'agent@quickdesk.com',
      name: 'Agent Smith',
      passwordHash: agentPassword,
      role: Role.AGENT,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'employee@quickdesk.com' },
    update: {},
    create: {
      email: 'employee@quickdesk.com',
      name: 'John Employee',
      passwordHash: employeePassword,
      role: Role.EMPLOYEE,
    },
  });

  console.log(`✅ Users created: Agent (${agent.email}), Employee (${employee.email})`);

  // 2. Create Sample Ticket
  const sampleTicket = await prisma.ticket.create({
    data: {
      title: 'VPN fails to authenticate on remote network',
      description: 'I am attempting to connect to the corporate VPN from home but receive error "TLS Handshake Failed".',
      status: TicketStatus.OPEN,
      category: TicketCategory.IT,
      priority: TicketPriority.HIGH,
      aiCategory: TicketCategory.IT,
      aiPriority: TicketPriority.HIGH,
      employeeId: employee.id,
    },
  });

  console.log(`✅ Sample ticket created: ${sampleTicket.id}`);
  console.log('🚀 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
