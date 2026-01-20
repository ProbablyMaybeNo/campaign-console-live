import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { waitFor } from '@/test/utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock data
const mockSources = [
  {
    id: 'source-1',
    campaign_id: 'campaign-1',
    type: 'pdf',
    title: 'Core Rulebook',
    tags: ['core'],
    storage_path: 'test.pdf',
    index_status: 'not_indexed',
    index_stats: null,
    index_error: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

// Mock supabase
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockInsert = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInvoke = vi.fn().mockResolvedValue({
  data: { success: true, message: 'Indexed successfully' },
  error: null,
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table);
      return {
        select: () => {
          mockSelect();
          return {
            eq: (col: string, val: string) => {
              mockEq(col, val);
              return {
                order: () => {
                  mockOrder();
                  return Promise.resolve({ data: mockSources, error: null });
                },
              };
            },
          };
        },
        insert: (data: unknown) => {
          mockInsert(data);
          return {
            select: () => ({
              single: () => {
                mockSingle();
                return Promise.resolve({ 
                  data: { id: 'new-source', ...data as object }, 
                  error: null 
                });
              },
            }),
          };
        },
        update: (data: unknown) => {
          mockUpdate(data);
          return {
            eq: () => Promise.resolve({ data: null, error: null }),
          };
        },
      };
    },
    functions: {
      invoke: mockInvoke,
    },
  },
}));

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useRulesSources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches sources for a campaign', async () => {
    const { useRulesSources } = await import('@/hooks/useRulesSources');
    
    const { result } = renderHook(() => useRulesSources('campaign-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('rules_sources');
    expect(mockEq).toHaveBeenCalledWith('campaign_id', 'campaign-1');
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].title).toBe('Core Rulebook');
  });
});

describe('useIndexSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls index-rules-source edge function', async () => {
    const { useIndexSource } = await import('@/hooks/useRulesSources');
    
    const { result } = renderHook(() => useIndexSource(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ sourceId: 'source-1', campaignId: 'campaign-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInvoke).toHaveBeenCalledWith(
      'index-rules-source',
      { body: { sourceId: 'source-1' } }
    );
  });

  it('handles indexing failure gracefully', async () => {
    mockInvoke.mockResolvedValueOnce({ 
      data: null, 
      error: new Error('Indexing failed') 
    });

    const { useIndexSource } = await import('@/hooks/useRulesSources');
    
    const { result } = renderHook(() => useIndexSource(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync({ sourceId: 'source-1', campaignId: 'campaign-1' }))
      .rejects.toThrow('Indexing failed');
  });
});

describe('Indexing Status Updates', () => {
  it('updates source status after successful indexing', async () => {
    // Mock the function invoke to return success with stats
    mockInvoke.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Indexed 50 pages, 150 chunks, 10 tables',
      },
      error: null,
    });

    const { useIndexSource } = await import('@/hooks/useRulesSources');
    
    const { result } = renderHook(() => useIndexSource(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ sourceId: 'source-1', campaignId: 'campaign-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    expect(result.current.data?.message).toContain('Indexed');
  });

  it('sets failed status with error details on failure', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { error: 'PDF extraction failed' },
      error: null,
    });

    const { useIndexSource } = await import('@/hooks/useRulesSources');
    
    const { result } = renderHook(() => useIndexSource(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync({ sourceId: 'source-1', campaignId: 'campaign-1' }))
      .rejects.toThrow('PDF extraction failed');
  });
});
