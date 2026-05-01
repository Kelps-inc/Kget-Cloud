/**
 * Global test setup for the API.
 * Runs before every test file when using `bun test`.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Clean database between tests (use transaction rollback in real tests)
export async function cleanDatabase() {
  await prisma.$transaction([
    prisma.chatMessage.deleteMany(),
    prisma.chatSession.deleteMany(),
    prisma.documentChunk.deleteMany(),
    prisma.jobLog.deleteMany(),
    prisma.fileAsset.deleteMany(),
    prisma.downloadJob.deleteMany(),
    prisma.source.deleteMany(),
    prisma.agent.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);
}

export { prisma };
