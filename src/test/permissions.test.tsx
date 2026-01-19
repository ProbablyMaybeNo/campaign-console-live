import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import { RulesLibrary } from '@/components/rules/RulesLibrary';

// Mock data
const mockSources = [
  {
    id: 'source-1',
    campaign_id: 'campaign-1',
    type: 'pdf' as const,
    title: 'Core Rulebook',
    tags: ['core'],
    storage_path: 'test.pdf',
    github_repo_url: null,
    github_json_path: null,
    github_imported_at: null,
    index_status: 'indexed' as const,
    index_stats: { pages: 50, sections: 10, chunks: 150, tablesHigh: 5, tablesLow: 3, datasets: 2 },
    index_error: null,
    last_indexed_at: '2024-01-15',
    created_at: '2024-01-01',
    updated_at: '2024-01-15',
  },
  {
    id: 'source-2',
    campaign_id: 'campaign-1',
    type: 'paste' as const,
    title: 'House Rules',
    tags: [],
    storage_path: null,
    github_repo_url: null,
    github_json_path: null,
    github_imported_at: null,
    index_status: 'not_indexed' as const,
    index_stats: null,
    index_error: null,
    last_indexed_at: null,
    created_at: '2024-01-02',
    updated_at: '2024-01-02',
  },
];

// Mock the hooks
vi.mock('@/hooks/useRulesSources', () => ({
  useRulesSources: () => ({
    data: mockSources,
    isLoading: false,
  }),
  useCreatePdfSource: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-pdf-source' }),
    isPending: false,
  }),
  useCreatePasteSource: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-paste-source' }),
    isPending: false,
  }),
  useCreateGitHubSource: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-github-source' }),
    isPending: false,
  }),
  useDeleteSource: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useIndexSource: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

describe('RulesLibrary', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    campaignId: 'campaign-1',
    isGM: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sources Display', () => {
    it('displays all sources with correct status badges', async () => {
      render(<RulesLibrary {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Core Rulebook')).toBeInTheDocument();
        expect(screen.getByText('House Rules')).toBeInTheDocument();
      });
      
      // Check status badges
      expect(screen.getByText('Indexed')).toBeInTheDocument();
      expect(screen.getByText('Not Indexed')).toBeInTheDocument();
    });

    it('shows type badges for different source types', async () => {
      render(<RulesLibrary {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('PDF')).toBeInTheDocument();
        expect(screen.getByText('Text')).toBeInTheDocument();
      });
    });

    it('displays index stats for indexed sources', async () => {
      render(<RulesLibrary {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/50 pages/)).toBeInTheDocument();
        expect(screen.getByText(/150 chunks/)).toBeInTheDocument();
      });
    });
  });

  describe('GM Actions', () => {
    it('shows Add Source button for GMs', () => {
      render(<RulesLibrary {...defaultProps} />);
      
      expect(screen.getByText('Add Source')).toBeInTheDocument();
    });

    it('shows index and delete buttons for GMs', async () => {
      render(<RulesLibrary {...defaultProps} />);
      
      await waitFor(() => {
        // Should have index buttons for each source (refresh icons)
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(3); // Add + index buttons + delete buttons
      });
    });
  });

  describe('Player Permissions', () => {
    it('hides management actions for non-GM users', () => {
      render(<RulesLibrary {...defaultProps} isGM={false} />);
      
      // Add Source button should not be visible
      expect(screen.queryByText('Add Source')).not.toBeInTheDocument();
    });

    it('allows players to view sources list', async () => {
      render(<RulesLibrary {...defaultProps} isGM={false} />);
      
      await waitFor(() => {
        // Sources should still be visible
        expect(screen.getByText('Core Rulebook')).toBeInTheDocument();
        expect(screen.getByText('House Rules')).toBeInTheDocument();
      });
    });
  });

  describe('Stats Summary', () => {
    it('displays aggregate stats in header', async () => {
      render(<RulesLibrary {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // 2 sources
        expect(screen.getByText('sources')).toBeInTheDocument();
        expect(screen.getByText('indexed')).toBeInTheDocument();
      });
    });
  });
});

describe('RulesLibrary - Empty State', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('shows empty state when no sources exist', async () => {
    vi.doMock('@/hooks/useRulesSources', () => ({
      useRulesSources: () => ({
        data: [],
        isLoading: false,
      }),
      useCreatePdfSource: () => ({
        mutateAsync: vi.fn().mockResolvedValue({ id: 'new-pdf-source' }),
        isPending: false,
      }),
      useCreatePasteSource: () => ({
        mutateAsync: vi.fn().mockResolvedValue({ id: 'new-paste-source' }),
        isPending: false,
      }),
      useCreateGitHubSource: () => ({
        mutateAsync: vi.fn().mockResolvedValue({ id: 'new-github-source' }),
        isPending: false,
      }),
      useDeleteSource: () => ({ mutate: vi.fn(), isPending: false }),
      useIndexSource: () => ({ mutate: vi.fn(), isPending: false }),
    }));

    // Re-import with new mock
    const { RulesLibrary: MockedRulesLibrary } = await import('@/components/rules/RulesLibrary');
    
    render(
      <MockedRulesLibrary 
        open={true} 
        onOpenChange={vi.fn()} 
        campaignId="c1" 
        isGM={true} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No rules sources added yet/i)).toBeInTheDocument();
    });
  });
});
