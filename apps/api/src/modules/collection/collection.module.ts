import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@shared/infrastructure/queue/queue-names';

// TODO: wire sources, download-jobs, BullMQ processor, and agent runtime controller (Phase 2)
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.DOWNLOAD }),
  ],
})
export class CollectionModule {}
