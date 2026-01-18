import { describe, it, expect } from "vitest";
import { buildClientStats } from "@/hooks/useRulesIndexer";

describe("buildClientStats", () => {
  it("summarizes page extraction stats", () => {
    const pages = [
      { pageNumber: 1, text: "This page has enough text to count as non-empty.", charCount: 52 },
      { pageNumber: 2, text: "", charCount: 0 },
    ];

    const stats = buildClientStats(pages);

    expect(stats.pagesExtracted).toBe(2);
    expect(stats.emptyPages).toBe(1);
    expect(stats.avgCharsPerPage).toBeGreaterThan(0);
  });
});
