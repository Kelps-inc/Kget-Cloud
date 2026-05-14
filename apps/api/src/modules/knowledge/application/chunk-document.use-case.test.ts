import { describe, expect, it } from "bun:test";
import { ChunkDocumentUseCase } from "./chunk-document.use-case";

describe("ChunkDocumentUseCase", () => {
  it("returns one chunk for short documents without looping", () => {
    const chunks = new ChunkDocumentUseCase().execute(
      "Small operational note.",
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe("Small operational note.");
  });

  it("chunks long documents and always advances", () => {
    const text = Array.from(
      { length: 120 },
      (_, i) => `Sentence ${i} has useful evidence.`,
    ).join(" ");
    const chunks = new ChunkDocumentUseCase().execute(text);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.length).toBeLessThan(20);
    expect(chunks.every((chunk, index) => chunk.chunkIndex === index)).toBe(
      true,
    );
  });
});
