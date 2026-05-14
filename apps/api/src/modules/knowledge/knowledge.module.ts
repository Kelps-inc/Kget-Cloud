import { Module } from "@nestjs/common";
import { UploadFileUseCase } from "./application/upload-file.use-case";
import { ProcessFileUseCase } from "./application/process-file.use-case";
import { ExtractTextUseCase } from "./application/extract-text.use-case";
import { ChunkDocumentUseCase } from "./application/chunk-document.use-case";
import { RagChatUseCase } from "./application/rag-chat.use-case";
import { OpenAiService } from "./infrastructure/openai.service";
import { DocumentChunkPrismaRepository } from "./infrastructure/document-chunk.prisma-repository";
import { FilesController } from "./presentation/files.controller";
import { ChatController } from "./presentation/chat.controller";

@Module({
  providers: [
    UploadFileUseCase,
    ProcessFileUseCase,
    ExtractTextUseCase,
    ChunkDocumentUseCase,
    RagChatUseCase,
    OpenAiService,
    DocumentChunkPrismaRepository,
  ],
  controllers: [FilesController, ChatController],
  exports: [ProcessFileUseCase],
})
export class KnowledgeModule {}
