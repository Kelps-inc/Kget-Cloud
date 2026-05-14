import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QUEUE_NAMES } from "@shared/infrastructure/queue/queue-names";
import { KnowledgeModule } from "@modules/knowledge/knowledge.module";
import { CollectionService } from "./application/collection.service";
import { SourcesController } from "./presentation/sources.controller";

@Module({
  imports: [
    KnowledgeModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.DOWNLOAD }),
  ],
  providers: [CollectionService],
  controllers: [SourcesController],
  exports: [CollectionService],
})
export class CollectionModule {}
