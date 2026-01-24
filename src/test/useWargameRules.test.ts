import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockRules, error: null })),
          })),
          single: vi.fn(() => Promise.resolve({ data: mockRules[0], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockRules[0], error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockRules[0], error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      or: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  useWargameRules,
  useWargameRule,
  useCreateRule,
  useUpdateRule,
  useDeleteRule,
  useRuleCategories,
  type WargameRule,
  type TableRuleContent,
  type CardRuleContent,
} from '@/hooks/useWargameRules';

const mockRules: WargameRule[] = [
  {
    id: 'rule-1',
    campaign_id: 'campaign-1',
    category: 'Combat',
    rule_key: 'combat_1',
    title: 'Melee Combat Rules',
    content: {
      type: 'table',
      columns: ['Weapon', 'Damage', 'Range'],
      rows: [
        { id: 'row-1', Weapon: 'Sword', Damage: '3', Range: '1"' },
        { id: 'row-2', Weapon: 'Spear', Damage: '2', Range: '2"' },
      ],
    },
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'rule-2',
    campaign_id: 'campaign-1',
    category: 'Movement',
    rule_key: 'movement_1',
    title: 'Movement Rules',
    content: {
      type: 'card',
      title: 'Movement Rules',
      sections: [
        { id: 'sec-1', header: 'Walking', content: 'Units can walk 6 inches' },
        { id: 'sec-2', header: 'Running', content: 'Units can run 12 inches' },
      ],
    },
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

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

describe('useWargameRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches rules for a campaign', async () => {
    const { result } = renderHook(() => useWargameRules('campaign-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRules);
  });

  it('returns empty array when campaignId is undefined', async () => {
    const { result } = renderHook(() => useWargameRules(undefined), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});

describe('useWargameRule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a single rule by id', async () => {
    const { result } = renderHook(() => useWargameRule('rule-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRules[0]);
  });

  it('returns null when ruleId is undefined', async () => {
    const { result } = renderHook(() => useWargameRule(undefined), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });
});

describe('useRuleCategories', () => {
  it('groups rules by category', async () => {
    const { result } = renderHook(() => useRuleCategories('campaign-1'), {
      wrapper: createWrapper(),
    });

    // Wait for parent query to complete
    await waitFor(() => {
      expect(result.current.length).toBeGreaterThan(0);
    });

    expect(result.current).toContainEqual(
      expect.objectContaining({ category: 'Combat' })
    );
    expect(result.current).toContainEqual(
      expect.objectContaining({ category: 'Movement' })
    );
  });
});

describe('RuleContent Types', () => {
  it('correctly identifies table content', () => {
    const tableContent = mockRules[0].content as unknown as TableRuleContent;
    expect(tableContent.type).toBe('table');
    expect(tableContent.columns).toHaveLength(3);
    expect(tableContent.rows).toHaveLength(2);
  });

  it('correctly identifies card content', () => {
    const cardContent = mockRules[1].content as unknown as CardRuleContent;
    expect(cardContent.type).toBe('card');
    expect(cardContent.sections).toHaveLength(2);
  });
});

describe('useCreateRule', () => {
  it('creates a new rule', async () => {
    const { result } = renderHook(() => useCreateRule(), {
      wrapper: createWrapper(),
    });

    const newRule: { campaignId: string; title: string; category: string; content: TableRuleContent } = {
      campaignId: 'campaign-1',
      title: 'New Rule',
      category: 'Combat',
      content: {
        type: 'table',
        columns: ['A', 'B'],
        rows: [],
      },
    };

    result.current.mutate(newRule);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useUpdateRule', () => {
  it('updates an existing rule', async () => {
    const { result } = renderHook(() => useUpdateRule(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'rule-1',
      title: 'Updated Title',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useDeleteRule', () => {
  it('deletes a rule', async () => {
    const { result } = renderHook(() => useDeleteRule(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 'rule-1', campaignId: 'campaign-1' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
