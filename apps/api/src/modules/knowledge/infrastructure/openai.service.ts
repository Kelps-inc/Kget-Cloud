import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-ada-002";
const CHAT_MODEL = "gpt-4o-mini";
const EMBEDDING_DIMENSIONS = 1536;

@Injectable()
export class OpenAiService {
  private readonly client: OpenAI | null;
  private readonly logger = new Logger(OpenAiService.name);

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    if (!this.client) {
      this.logger.warn(
        "OPENAI_API_KEY is not configured; document indexing and RAG chat are disabled.",
      );
    }
  }

  private getClient(): OpenAI {
    if (!this.client) {
      throw new ServiceUnavailableException(
        "OPENAI_API_KEY is not configured. Add it in Vercel to enable document indexing and RAG chat.",
      );
    }
    return this.client;
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await this.getClient().embeddings.create({
      model: EMBEDDING_MODEL,
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
      model: CHAT_MODEL,
      messages,
      temperature: 0.3,
    });
    return response.choices[0].message.content ?? "";
  }

  get embeddingDimensions() {
    return EMBEDDING_DIMENSIONS;
  }
}
