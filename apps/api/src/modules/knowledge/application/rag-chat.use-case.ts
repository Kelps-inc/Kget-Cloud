import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/database/prisma.service";
import { OpenAiService } from "../infrastructure/openai.service";
import { DocumentChunkPrismaRepository } from "../infrastructure/document-chunk.prisma-repository";

export interface RagChatInput {
  sessionId: string;
  organizationId: string;
  content: string;
}

const SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on the provided document excerpts.
Always base your answers on the context provided. If the answer is not in the context, say so clearly.
Be concise and precise. When relevant, indicate which part of the document supports your answer.`;

@Injectable()
export class RagChatUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiService,
    private readonly chunkRepo: DocumentChunkPrismaRepository,
  ) {}

  async execute(input: RagChatInput) {
    // 1. Save user message
    await this.prisma.chatMessage.create({
      data: {
        sessionId: input.sessionId,
        role: "user",
        content: input.content,
        sourceIds: [],
      },
    });

    // 2. Embed query and find similar chunks
    const queryEmbedding = await this.openai.embedQuery(input.content);
    const chunks = await this.chunkRepo.searchSimilar(
      input.organizationId,
      queryEmbedding,
      5,
    );

    // 3. Build context prompt
    const context = chunks
      .map((c, i) => `[${i + 1}] ${c.content}`)
      .join("\n\n");

    // 4. Load recent history (last 6 messages)
    const history = await this.prisma.chatMessage.findMany({
      where: { sessionId: input.sessionId },
      orderBy: { createdAt: "asc" },
      take: 6,
    });

    const messages: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "system",
        content: `Relevant document excerpts:\n\n${context || "No relevant documents found."}`,
      },
      ...history
        .slice(0, -1)
        .map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      { role: "user", content: input.content },
    ];

    // 5. Call OpenAI
    const answer = await this.openai.chat(messages);

    // 6. Save assistant message with source references
    const sourceIds = chunks.map((c) => c.id);
    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId: input.sessionId,
        role: "assistant",
        content: answer,
        sourceIds,
      },
    });

    return {
      id: assistantMessage.id,
      role: "assistant",
      content: answer,
      sources: chunks.map((c) => ({
        id: c.id,
        fileId: c.fileId,
        content: c.content.slice(0, 300),
        similarity: Number(c.similarity),
      })),
      createdAt: assistantMessage.createdAt,
    };
  }
}
