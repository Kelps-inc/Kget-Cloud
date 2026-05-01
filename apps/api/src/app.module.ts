import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@shared/infrastructure/database/prisma.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { AgentsModule } from '@modules/agents/agents.module';
import { CollectionModule } from '@modules/collection/collection.module';
import { KnowledgeModule } from '@modules/knowledge/knowledge.module';
import { LogsModule } from '@modules/logs/logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({ connection: { url: process.env.REDIS_URL } }),
    PrismaModule,
    IdentityModule,
    OrganizationsModule,
    AgentsModule,
    CollectionModule,
    KnowledgeModule,
    LogsModule,
  ],
})
export class AppModule {}
