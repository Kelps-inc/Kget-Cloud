import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/database/prisma.service";
import { Prisma } from "@prisma/client";

export interface ChunkToSave {
  organizationId: string;
  fileId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}

export interface SimilarChunk {
  id: string;
  fileId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

@Injectable()
export class DocumentChunkPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveMany(chunks: ChunkToSave[]): Promise<void> {
    for (const chunk of chunks) {
      const embeddingStr = `[${chunk.embedding.join(",")}]`;
      await this.prisma.$executeRaw`
        INSERT INTO document_chunks ("id", "organizationId", "fileId", "chunkIndex", "content", "embedding")
        VALUES (
          ${crypto.randomUUID()},
          ${chunk.organizationId},
          ${chunk.fileId},
          ${chunk.chunkIndex},
          ${chunk.content},
          ${embeddingStr}::vector
        )
      `;
    }
  }

  async searchSimilar(
    organizationId: string,
    embedding: number[],
    limit = 5,
  ): Promise<SimilarChunk[]> {
    const embeddingStr = `[${embedding.join(",")}]`;
    const results = await this.prisma.$queryRaw<SimilarChunk[]>`
      SELECT
        id,
        "fileId",
        "chunkIndex",
        content,
        1 - (embedding <=> ${embeddingStr}::vector) AS similarity
      FROM document_chunks
      WHERE "organizationId" = ${organizationId}
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `;
    return results;
  }

  async deleteByFileId(fileId: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM document_chunks WHERE "fileId" = ${fileId}
    `;
  }

  async countByFileId(fileId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM document_chunks WHERE "fileId" = ${fileId}
    `;
    return Number(result[0].count);
  }
}
