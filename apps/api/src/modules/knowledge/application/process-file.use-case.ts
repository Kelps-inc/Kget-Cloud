import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/database/prisma.service";
import { LocalStorageProvider } from "@shared/infrastructure/storage/local-storage.provider";
import { ExtractTextUseCase } from "./extract-text.use-case";
import { ChunkDocumentUseCase } from "./chunk-document.use-case";
import { OpenAiService } from "../infrastructure/openai.service";
import { DocumentChunkPrismaRepository } from "../infrastructure/document-chunk.prisma-repository";

@Injectable()
export class ProcessFileUseCase {
  private readonly logger = new Logger(ProcessFileUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageProvider,
    private readonly extractText: ExtractTextUseCase,
    private readonly chunkDocument: ChunkDocumentUseCase,
    private readonly openai: OpenAiService,
    private readonly chunkRepo: DocumentChunkPrismaRepository,
  ) {}

  async execute(fileId: string): Promise<void> {
    const asset = await this.prisma.fileAsset.findUniqueOrThrow({
      where: { id: fileId },
    });

    await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: { status: "processing" },
    });

    try {
      const buffer = await this.storage.readBuffer(asset.storageKey);
      const text = await this.extractText.execute(buffer, asset.mimeType);

      if (!text || text.trim().length === 0) {
        await this.prisma.fileAsset.update({
          where: { id: fileId },
          data: { status: "indexed" },
        });
        return;
      }

      const chunks = this.chunkDocument.execute(text);
      this.logger.log(`File ${fileId}: ${chunks.length} chunks`);

      // Batch embed in groups of 20
      const BATCH = 20;
      for (let i = 0; i < chunks.length; i += BATCH) {
        const batch = chunks.slice(i, i + BATCH);
        const embeddings = await this.openai.embedTexts(
          batch.map((c) => c.content),
        );
        await this.chunkRepo.saveMany(
          batch.map((chunk, j) => ({
            organizationId: asset.organizationId,
            fileId: asset.id,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            embedding: embeddings[j],
          })),
        );
      }

      await this.prisma.fileAsset.update({
        where: { id: fileId },
        data: { status: "indexed" },
      });
      this.logger.log(`File ${fileId} indexed successfully`);
    } catch (err) {
      this.logger.error(`File ${fileId} processing failed`, err);
      await this.prisma.fileAsset.update({
        where: { id: fileId },
        data: { status: "error" },
      });
    }
  }
}
