import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import OpenAI from "openai";
import * as crypto from "crypto";

const EMBEDDING_DIMENSIONS = 1536;

@Injectable()
export class OpenAiService {
  private readonly client: OpenAI | null;
  private readonly logger = new Logger(OpenAiService.name);
  private readonly chatModel: string;
  private readonly embeddingModel: string;
  private readonly useRemoteEmbeddings: boolean;

  constructor() {
    const apiKey =
      process.env.AI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
    const baseURL =
      process.env.AI_BASE_URL?.trim() || process.env.OPENAI_BASE_URL?.trim();
    this.chatModel =
      process.env.AI_CHAT_MODEL?.trim() ||
      process.env.OPENAI_CHAT_MODEL?.trim() ||
      "gpt-4o-mini";
    this.embeddingModel =
      process.env.AI_EMBEDDING_MODEL?.trim() ||
      process.env.OPENAI_EMBEDDING_MODEL?.trim() ||
      "text-embedding-ada-002";

    const embeddingMode =
      process.env.AI_EMBEDDING_MODE?.trim().toLowerCase() ||
      process.env.OPENAI_EMBEDDING_MODE?.trim().toLowerCase();
    this.useRemoteEmbeddings =
      embeddingMode === "api" ||
      Boolean(apiKey && !baseURL && embeddingMode !== "local");

    this.client = apiKey
      ? new OpenAI({
          apiKey,
          baseURL: baseURL || undefined,
        })
      : null;
    if (!this.client) {
      this.logger.warn(
        "No AI API key configured; using local deterministic embeddings and extractive chat fallback.",
      );
    } else if (!this.useRemoteEmbeddings) {
      this.logger.log(
        "Using configured AI chat provider with local deterministic embeddings.",
      );
    }
  }

  private getClient(): OpenAI {
    if (!this.client) {
      throw new ServiceUnavailableException(
        "No AI chat provider is configured. Add AI_API_KEY or OPENAI_API_KEY to enable generated chat answers.",
      );
    }
    return this.client;
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (!this.useRemoteEmbeddings) {
      return texts.map((text) => this.localEmbedding(text));
    }
    const response = await this.getClient().embeddings.create({
      model: this.embeddingModel,
      input: texts,
    });
    return response.data.map((d) => d.embedding);
  }

  async embedQuery(text: string): Promise<number[]> {
    const [embedding] = await this.embedTexts([text]);
    return embedding;
  }

  async chat(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
  ): Promise<string> {
    const response = await this.getClient().chat.completions.create({
      model: this.chatModel,
      messages,
      temperature: 0.3,
    });
    return response.choices[0].message.content ?? "";
  }

  get hasChatCompletion() {
    return Boolean(this.client);
  }

  get embeddingDimensions() {
    return EMBEDDING_DIMENSIONS;
  }

  private localEmbedding(text: string): number[] {
    const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
    const tokens = text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-z0-9_]{2,}/g);

    for (const token of tokens ?? []) {
      const hash = crypto.createHash("sha256").update(token).digest();
      const index = hash.readUInt32BE(0) % EMBEDDING_DIMENSIONS;
      const sign = hash[4] % 2 === 0 ? 1 : -1;
      vector[index] += sign;
    }

    const norm = Math.sqrt(
      vector.reduce((sum, value) => sum + value * value, 0),
    );
    if (norm === 0) return vector;
    return vector.map((value) => value / norm);
  }
}
