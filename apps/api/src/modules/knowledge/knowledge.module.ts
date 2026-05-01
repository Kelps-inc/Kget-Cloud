import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@shared/infrastructure/queue/queue-names';

// TODO: wire file upload, text extraction, chunking, embeddings, pgvector search, and chat (Phase 1 + Phase 4)
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.INGESTION }),
    BullModule.registerQueue({ name: QUEUE_NAMES.EMBEDDING }),
  ],
})
export class KnowledgeModule {}
