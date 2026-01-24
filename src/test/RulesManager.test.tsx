import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RulesManager } from '@/components/rules/RulesManager';

const mockRules = [
  {
    id: 'rule-1',
    campaign_id: 'campaign-1',
    category: 'Combat',
    rule_key: 'combat_1',
    title: 'Melee Combat Rules',
    content: {
      type: 'table',
      columns: ['Weapon', 'Damage'],
      rows: [{ id: 'row-1', Weapon: 'Sword', Damage: '3' }],
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
      sections: [{ id: 'sec-1', header: 'Walking', content: '6 inches' }],
    },
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// Mock the hooks with configurable returns
const mockUseWargameRules = vi.fn(() => ({
  data: mockRules,
  isLoading: false,
}));

const mockUseDeleteRule = vi.fn(() => ({
  mutate: vi.fn(),
}));

vi.mock('@/hooks/useWargameRules', () => ({
  useWargameRules: () => mockUseWargameRules(),
  useDeleteRule: () => mockUseDeleteRule(),
}));

vi.mock('@/hooks/useDashboardComponents', () => ({
  useCreateComponent: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('RulesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWargameRules.mockReturnValue({
      data: mockRules,
      isLoading: false,
    });
  });

  it('renders rules list', () => {
    render(<RulesManager campaignId="campaign-1" isGM={true} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Melee Combat Rules')).toBeInTheDocument();
    expect(screen.getByText('Movement Rules')).toBeInTheDocument();
  });

  it('shows category headers', () => {
    render(<RulesManager campaignId="campaign-1" isGM={true} />, {
      wrapper: createWrapper(),
    });

    // Use getAllByText since Combat and Movement appear in multiple places (dropdown + headers)
    expect(screen.getAllByText(/Combat/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Movement/).length).toBeGreaterThan(0);
  });

  it('shows create buttons for GM', () => {
    render(<RulesManager campaignId="campaign-1" isGM={true} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Rules Table')).toBeInTheDocument();
    expect(screen.getByText('Rules Card')).toBeInTheDocument();
    expect(screen.getByText('Custom Table')).toBeInTheDocument();
    expect(screen.getByText('Custom Card')).toBeInTheDocument();
  });

  it('hides create buttons for non-GM', () => {
    render(<RulesManager campaignId="campaign-1" isGM={false} />, {
      wrapper: createWrapper(),
    });

    expect(screen.queryByText('Rules Table')).not.toBeInTheDocument();
    expect(screen.queryByText('Custom Table')).not.toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<RulesManager campaignId="campaign-1" isGM={true} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByPlaceholderText('Search rules...')).toBeInTheDocument();
  });

  it('filters rules by search term', async () => {
    const user = userEvent.setup();
    
    render(<RulesManager campaignId="campaign-1" isGM={true} />, {
      wrapper: createWrapper(),
    });

    const searchInput = screen.getByPlaceholderText('Search rules...');
    await user.type(searchInput, 'Combat');

    expect(screen.getByText('Melee Combat Rules')).toBeInTheDocument();
    expect(screen.queryByText('Movement Rules')).not.toBeInTheDocument();
  });

  it('shows rule count', () => {
    render(<RulesManager campaignId="campaign-1" isGM={true} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('2 of 2 rules')).toBeInTheDocument();
  });

  it('expands rule on click', async () => {
    const user = userEvent.setup();
    
    render(<RulesManager campaignId="campaign-1" isGM={true} />, {
      wrapper: createWrapper(),
    });

    // Click on the first rule to expand
    const ruleButton = screen.getByText('Melee Combat Rules').closest('button');
    if (ruleButton) {
      await user.click(ruleButton);
    }

    // Should show action buttons when expanded
    expect(screen.getByText('Add to Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('shows preview info for table rules', () => {
    render(<RulesManager campaignId="campaign-1" isGM={true} />, {
      wrapper: createWrapper(),
    });

    // Table rule should show column/row count
    expect(screen.getByText('2 columns, 1 rows')).toBeInTheDocument();
  });

  it('shows preview info for card rules', () => {
    render(<RulesManager campaignId="campaign-1" isGM={true} />, {
      wrapper: createWrapper(),
    });

    // Card rule should show section count
    expect(screen.getByText('1 sections')).toBeInTheDocument();
  });
});

describe('RulesManager empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWargameRules.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('shows empty state when no rules', () => {
    render(<RulesManager campaignId="campaign-1" isGM={true} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('No rules yet')).toBeInTheDocument();
    expect(screen.getByText('Create a rules table or card to get started')).toBeInTheDocument();
  });

  it('shows different message for non-GM empty state', () => {
    render(<RulesManager campaignId="campaign-1" isGM={false} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('No rules yet')).toBeInTheDocument();
    expect(screen.getByText("The GM hasn't added any rules yet")).toBeInTheDocument();
  });
});

describe('RulesManager loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWargameRules.mockReturnValue({
      data: [],
      isLoading: true,
    });
  });

  it('shows loading state', () => {
    render(<RulesManager campaignId="campaign-1" isGM={true} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Loading rules...')).toBeInTheDocument();
  });
});
