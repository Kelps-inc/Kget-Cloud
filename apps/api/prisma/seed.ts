import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding development database...');

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { id: 'org_demo' },
    update: {},
    create: {
      id: 'org_demo',
      name: 'Demo Company',
      plan: 'pro',
    },
  });

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { email: 'demo@kgetcloud.com' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Demo User',
      email: 'demo@kgetcloud.com',
      passwordHash,
      role: 'owner',
    },
  });

  console.log('✅ Seed complete');
  console.log('   Email: demo@kgetcloud.com');
  console.log('   Password: password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
