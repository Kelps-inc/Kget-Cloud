import { Injectable } from "@nestjs/common";

const CHUNK_SIZE = 1500; // characters (~375 tokens)
const OVERLAP = 200;

export function sanitizeDocumentText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface TextChunk {
  content: string;
  chunkIndex: number;
}

@Injectable()
export class ChunkDocumentUseCase {
  execute(text: string): TextChunk[] {
    const cleaned = sanitizeDocumentText(text);
    if (cleaned.length === 0) return [];

    const chunks: TextChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < cleaned.length) {
      const end = Math.min(start + CHUNK_SIZE, cleaned.length);
      // Try to break at a sentence boundary
      let breakPoint = end;
      if (end < cleaned.length) {
        const sentenceEnd = cleaned.lastIndexOf(".", end);
        if (sentenceEnd > start + CHUNK_SIZE / 2) {
          breakPoint = sentenceEnd + 1;
        }
      }

      const content = cleaned.slice(start, breakPoint).trim();
      if (content.length > 0) {
        chunks.push({ content, chunkIndex: index++ });
      }
      if (breakPoint >= cleaned.length) break;

      const nextStart = Math.max(0, breakPoint - OVERLAP);
      start = nextStart > start ? nextStart : breakPoint;
    }

    return chunks;
  }
}
