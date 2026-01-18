import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildClientStats, usePdfIndexer, shouldAttemptOcrFallback } from "@/hooks/useRulesIndexer";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockSupabaseClient, resetSupabaseMocks } from "@/test/mocks/supabase";
import { extractPdfTextEnhanced, removeHeadersFooters, shouldFlagScannedPdf, shouldUseOcrFallback } from "@/lib/pdfExtractor";
import React, { type ReactNode } from "react";

vi.mock("@/integrations/supabase/client", async () => {
  const { mockSupabaseClient } = await import("@/test/mocks/supabase");
  return { supabase: mockSupabaseClient };
});

vi.mock("@/lib/pdfExtractor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/pdfExtractor")>();
  return {
    ...actual,
    extractPdfTextEnhanced: vi.fn(),
    removeHeadersFooters: vi.fn(),
    shouldFlagScannedPdf: vi.fn(),
    shouldUseOcrFallback: vi.fn(),
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

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

describe("usePdfIndexer OCR fallback", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.mocked(extractPdfTextEnhanced).mockReset();
    vi.mocked(removeHeadersFooters).mockReset();
    vi.mocked(shouldFlagScannedPdf).mockReset();
    vi.mocked(shouldUseOcrFallback).mockReset();
  });

  it("invokes OCR fallback when low-text content is detected", async () => {
    const lowTextPages = [
      { pageNumber: 1, text: "Short", charCount: 5 },
      { pageNumber: 2, text: "", charCount: 0 },
    ];

    vi.mocked(extractPdfTextEnhanced).mockResolvedValue({
      pages: lowTextPages,
      totalPages: 2,
      totalChars: 5,
      emptyPages: 1,
      avgCharsPerPage: 2,
      pageErrors: [],
      detectedTables: [],
      detectedSections: [],
    });
    vi.mocked(removeHeadersFooters).mockReturnValue(lowTextPages);
    vi.mocked(shouldUseOcrFallback).mockReturnValue(true);
    vi.mocked(shouldFlagScannedPdf).mockReturnValue(false);

    mockSupabaseClient.functions.invoke.mockImplementation((fnName: string) => {
      if (fnName === "parse-pdf-llamaparse") {
        return Promise.resolve({
          data: { pages: [{ pageNumber: 1, text: "OCR text", charCount: 8 }] },
          error: null,
        });
      }
      if (fnName === "index-rules-source") {
        return Promise.resolve({
          data: { stats: { pages: 1, chunks: 1, tablesHigh: 0, tablesLow: 0, datasets: 0 } },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { result } = renderHook(() => usePdfIndexer(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.indexPdf("source-1", "campaign-1", "path/to/file.pdf");
    });

    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
      "parse-pdf-llamaparse",
      { body: { storagePath: "path/to/file.pdf", sourceId: "source-1" } }
    );
  });
});

describe("shouldAttemptOcrFallback", () => {
  it("returns true for low-text PDFs", async () => {
    const actual = await vi.importActual<typeof import("@/lib/pdfExtractor")>("@/lib/pdfExtractor");
    vi.mocked(shouldUseOcrFallback).mockImplementation(actual.shouldUseOcrFallback);

    const pages = [
      { pageNumber: 1, text: "Short", charCount: 5 },
      { pageNumber: 2, text: "", charCount: 0 },
      { pageNumber: 3, text: "Small", charCount: 5 },
    ];
    expect(shouldAttemptOcrFallback(pages)).toBe(true);
  });
});
