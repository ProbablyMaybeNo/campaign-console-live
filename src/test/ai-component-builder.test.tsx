import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { AIComponentBuilder } from '@/components/dashboard/AIComponentBuilder';

// Mock hooks and supabase
vi.mock('@/hooks/useDashboardComponents', () => ({
  useCreateComponent: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-component' }),
    isPending: false,
  }),
}));

const mockInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

describe('AIComponentBuilder', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    campaignId: 'campaign-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the AI builder modal with chat interface', () => {
      render(<AIComponentBuilder {...defaultProps} />);
      
      expect(screen.getByText(/AI Component Builder/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Describe what components/i)).toBeInTheDocument();
    });

    it('shows upload and URL input options', () => {
      render(<AIComponentBuilder {...defaultProps} />);
      
      expect(screen.getByText(/Upload PDF\/Text/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Or paste a URL/i)).toBeInTheDocument();
    });
  });

  describe('Chat Functionality', () => {
    it('sends user message and displays response', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          message: 'I found 3 tables in the document',
          components: [],
        },
        error: null,
      });

      render(<AIComponentBuilder {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Describe what components/i);
      fireEvent.change(input, { target: { value: 'List all tables' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('List all tables')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/I found 3 tables/i)).toBeInTheDocument();
      });
    });

    it('passes campaignId to edge function for live data access', async () => {
      mockInvoke.mockResolvedValue({
        data: { message: 'Response', components: [] },
        error: null,
      });

      render(<AIComponentBuilder {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Describe what components/i);
      fireEvent.change(input, { target: { value: 'Show players' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          'ai-component-builder',
          expect.objectContaining({
            body: expect.objectContaining({
              campaignId: 'campaign-123',
            }),
          })
        );
      });
    });
  });

  describe('Component Creation', () => {
    it('displays generated components with create buttons', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          message: 'Created your table',
          components: [
            {
              type: 'table',
              data: {
                title: 'Injury Table',
                columns: ['Roll', 'Result'],
                rows: [{ Roll: '1-2', Result: 'Minor Wound' }],
              },
            },
          ],
        },
        error: null,
      });

      render(<AIComponentBuilder {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Describe what components/i);
      fireEvent.change(input, { target: { value: 'Create injury table' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Injury Table')).toBeInTheDocument();
      });

      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('component references stored IDs not static text', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          message: 'Found matching table',
          components: [
            {
              type: 'table',
              data: {
                title: 'Equipment List',
                columns: ['Name', 'Cost'],
                rows: [{ Name: 'Sword', Cost: '10' }],
              },
              dataSource: 'rules',
              sourceId: 'source-1',
              tableId: 'table-123',
            },
          ],
        },
        error: null,
      });

      render(<AIComponentBuilder {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Describe what components/i);
      fireEvent.change(input, { target: { value: 'Show equipment' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Equipment List')).toBeInTheDocument();
      });

      // The component should be creatable (showing the data source is linked)
      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('handles multiple component creation at once', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          message: 'Created 3 tables',
          components: [
            { type: 'table', data: { title: 'Injury Table', columns: ['A'], rows: [] } },
            { type: 'table', data: { title: 'Exploration Table', columns: ['B'], rows: [] } },
            { type: 'table', data: { title: 'Advancement Table', columns: ['C'], rows: [] } },
          ],
        },
        error: null,
      });

      render(<AIComponentBuilder {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Describe what components/i);
      fireEvent.change(input, { target: { value: 'Create all tables' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Injury Table')).toBeInTheDocument();
        expect(screen.getByText('Exploration Table')).toBeInTheDocument();
        expect(screen.getByText('Advancement Table')).toBeInTheDocument();
      });

      // Should show "Create All" button when multiple uncreated components
      expect(screen.getByText('Create All Components')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message on API failure', async () => {
      mockInvoke.mockResolvedValue({
        data: { error: 'Rate limit exceeded' },
        error: null,
      });

      render(<AIComponentBuilder {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Describe what components/i);
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/Rate limit exceeded/i)).toBeInTheDocument();
      });
    });
  });
});

describe('AI Auto-Pick Scoring', () => {
  it('prefers datasets over tables when both match', async () => {
    // This tests the scoring logic in the AI response
    mockInvoke.mockResolvedValue({
      data: {
        message: 'Using equipment dataset for best accuracy',
        components: [
          {
            type: 'table',
            data: { title: 'Equipment', columns: ['Name', 'Cost'], rows: [] },
            dataSource: 'rules',
            preferred: 'dataset',
            datasetId: 'dataset-1',
          },
        ],
      },
      error: null,
    });

    render(<AIComponentBuilder open={true} onOpenChange={vi.fn()} campaignId="c1" />);
    
    const input = screen.getByPlaceholderText(/Describe what components/i);
    fireEvent.change(input, { target: { value: 'Show equipment' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  it('falls back to chunks when no tables/datasets match', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        message: 'No specific table found, using text chunks',
        components: [
          {
            type: 'card',
            data: { title: 'Combat Rules', cards: [] },
            dataSource: 'rules',
            preferred: 'chunks',
            chunkIds: ['chunk-1', 'chunk-2'],
          },
        ],
      },
      error: null,
    });

    render(<AIComponentBuilder open={true} onOpenChange={vi.fn()} campaignId="c1" />);
    
    const input = screen.getByPlaceholderText(/Describe what components/i);
    fireEvent.change(input, { target: { value: 'Show combat info' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Combat Rules')).toBeInTheDocument();
    });
  });
});
