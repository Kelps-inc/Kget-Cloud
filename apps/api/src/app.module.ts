import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "@shared/infrastructure/database/prisma.module";
import { StorageModule } from "@shared/infrastructure/storage/storage.module";
import { IdentityModule } from "@modules/identity/identity.module";
import { OrganizationsModule } from "@modules/organizations/organizations.module";
import { AgentsModule } from "@modules/agents/agents.module";
import { CollectionModule } from "@modules/collection/collection.module";
import { KnowledgeModule } from "@modules/knowledge/knowledge.module";
import { LogsModule } from "@modules/logs/logs.module";

const queueImports = process.env.REDIS_URL
  ? [BullModule.forRoot({ connection: { url: process.env.REDIS_URL } })]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ...queueImports,
    PrismaModule,
    StorageModule,
    IdentityModule,
    OrganizationsModule,
    AgentsModule,
    CollectionModule,
    KnowledgeModule,
    LogsModule,
  ],
})
export class AppModule {}
