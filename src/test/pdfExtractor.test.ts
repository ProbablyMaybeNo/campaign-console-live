import { describe, it, expect } from "vitest";
import { detectDiceRollTables, removeHeadersFooters, shouldFlagScannedPdf, shouldUseOcrFallback } from "@/lib/pdfExtractor";

describe("pdfExtractor helpers", () => {
  it("removes repeated headers and footers", () => {
    const pages = [1, 2, 3, 4, 5].map((pageNumber) => ({
      pageNumber,
      text: `GAME TITLE\nLine ${pageNumber}\nMore text\nCampaign Rules`,
      charCount: 0,
    }));

    const cleaned = removeHeadersFooters(pages);

    for (const page of cleaned) {
      const lines = page.text.split("\n");
      expect(lines[0]).not.toBe("GAME TITLE");
      expect(lines[lines.length - 1]).not.toMatch(/Page \d/);
    }
  });

  it("detects dice roll tables with header context", () => {
    const text = [
      "Injuries",
      "Roll on the Injury Table:",
      "1-2 Broken Arm",
      "3-4 Concussion",
      "5-6 Dead",
    ].join("\n");

    const tables = detectDiceRollTables(text, 1);
    expect(tables).toHaveLength(1);
    expect(tables[0].rows?.length).toBeGreaterThanOrEqual(3);
    expect(tables[0].headerContext).toContain("Roll on the Injury Table");
  });

  it("flags scanned PDFs with mostly empty pages", () => {
    const pages = [
      { pageNumber: 1, text: "", charCount: 0 },
      { pageNumber: 2, text: " ", charCount: 0 },
      { pageNumber: 3, text: "", charCount: 0 },
      { pageNumber: 4, text: "Small", charCount: 5 },
    ];

    expect(shouldFlagScannedPdf(pages)).toBe(true);
  });

  it("avoids removing headers that do not repeat enough", () => {
    const pages = [1, 2, 3, 4, 5].map((pageNumber) => ({
      pageNumber,
      text: pageNumber <= 2
        ? "SPECIAL INTRO\nLine A\nLine B\nPage footer"
        : `Unique Header ${pageNumber}\nLine A\nLine B\nPage footer`,
      charCount: 0,
    }));

    const cleaned = removeHeadersFooters(pages);
    expect(cleaned[0].text).toContain("SPECIAL INTRO");
  });

  it("flags low-text PDFs for OCR fallback", () => {
    const pages = [
      { pageNumber: 1, text: "Sparse text", charCount: 11 },
      { pageNumber: 2, text: "", charCount: 0 },
      { pageNumber: 3, text: "Few words", charCount: 9 },
    ];

    expect(shouldUseOcrFallback(pages)).toBe(true);
  });
});
