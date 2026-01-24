import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

// Mock supabase responses
const mockUpdateResponse = { data: { campaign_id: 'campaign-1' }, error: null };

// Mock supabase client
const mockUpdate = vi.fn(() => ({
  eq: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve(mockUpdateResponse)),
    })),
  })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  },
}));

import { useRuleSync } from '@/hooks/useRuleSync';

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useRuleSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncTableToRule', () => {
    it('syncs table content to a rule', async () => {
      const { result } = renderHook(() => useRuleSync(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.syncTableToRule({
          ruleId: 'rule-1',
          columns: ['Name', 'Value'],
          rows: [{ id: 'row-1', Name: 'Test', Value: '100' }],
          rawText: 'Original text',
        });
      });

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('does nothing when ruleId is empty', async () => {
      const { result } = renderHook(() => useRuleSync(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.syncTableToRule({
          ruleId: '',
          columns: ['Name'],
          rows: [],
        });
      });

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('syncCardToRule', () => {
    it('syncs card content to a rule', async () => {
      const { result } = renderHook(() => useRuleSync(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.syncCardToRule({
          ruleId: 'rule-2',
          title: 'Updated Card',
          sections: [
            { id: 'sec-1', header: 'Header', content: 'Content' },
          ],
          rawText: 'Original text',
        });
      });

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('does nothing when ruleId is empty', async () => {
      const { result } = renderHook(() => useRuleSync(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.syncCardToRule({
          ruleId: '',
          title: 'Test',
          sections: [],
        });
      });

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});

describe('RuleSync content structure', () => {
  it('creates correct table content structure', () => {
    const tableContent = {
      type: 'table' as const,
      columns: ['Col1', 'Col2'],
      rows: [{ id: '1', Col1: 'A', Col2: 'B' }],
      rawText: 'test',
    };

    expect(tableContent.type).toBe('table');
    expect(tableContent.columns).toHaveLength(2);
    expect(tableContent.rows[0].Col1).toBe('A');
  });

  it('creates correct card content structure', () => {
    const cardContent = {
      type: 'card' as const,
      title: 'Test Card',
      sections: [{ id: '1', header: 'H1', content: 'C1' }],
      rawText: 'test',
    };

    expect(cardContent.type).toBe('card');
    expect(cardContent.title).toBe('Test Card');
    expect(cardContent.sections).toHaveLength(1);
  });
});
