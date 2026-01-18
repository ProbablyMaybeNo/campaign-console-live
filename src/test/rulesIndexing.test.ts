import { describe, it, expect } from "vitest";
import { buildChunksFromText } from "../../supabase/functions/_shared/indexing";

describe("buildChunksFromText", () => {
  it("creates overlapped chunks near the target size", () => {
    const paragraph = "This is a long paragraph with multiple sentences to ensure that the chunker splits it into multiple chunks without cutting mid sentence.";
    const text = Array.from({ length: 20 }, () => paragraph).join("\n\n");

    const chunks = buildChunksFromText(text, { targetSize: 200, overlap: 20 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.length).toBeLessThanOrEqual(200);

    const overlapText = chunks[0].text.slice(-20);
    expect(chunks[1].text.startsWith(overlapText.trim())).toBe(true);
  });
});
