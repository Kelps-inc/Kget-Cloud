import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-ada-002";
const CHAT_MODEL = "gpt-4o-mini";
const EMBEDDING_DIMENSIONS = 1536;

@Injectable()
export class OpenAiService {
  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenAiService.name);

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await this.client.embeddings.create({
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
    const response = await this.client.chat.completions.create({
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
