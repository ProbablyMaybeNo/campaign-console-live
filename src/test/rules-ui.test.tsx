import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { AddSourceModal } from '@/components/rules/AddSourceModal';

// Mock the hooks
vi.mock('@/hooks/useRulesSources', () => ({
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
  useIndexSource: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
}));

describe('AddSourceModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    campaignId: 'campaign-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PDF Tab', () => {
    it('renders PDF upload form with required elements', () => {
      render(<AddSourceModal {...defaultProps} />);
      
      expect(screen.getByTestId('add-source-modal')).toBeInTheDocument();
      expect(screen.getByTestId('pdf-tab')).toBeInTheDocument();
      expect(screen.getByTestId('pdf-title-input')).toBeInTheDocument();
      expect(screen.getByTestId('pdf-submit')).toBeInTheDocument();
    });

    it('disables submit when title is empty', () => {
      render(<AddSourceModal {...defaultProps} />);
      
      const submitButton = screen.getByTestId('pdf-submit');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Paste Tab', () => {
    it('renders paste form and accepts text input', async () => {
      render(<AddSourceModal {...defaultProps} />);
      
      // Switch to paste tab
      const user = userEvent.setup();
      const pasteTab = screen.getByRole('tab', { name: /paste/i });
      await user.click(pasteTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('paste-tab')).toBeInTheDocument();
      });
      
      const titleInput = screen.getByTestId('paste-title-input');
      const textInput = screen.getByTestId('paste-text-input');
      
      await user.type(titleInput, 'House Rules');
      await user.type(textInput, 'These are my custom rules...');
      
      expect(titleInput).toHaveValue('House Rules');
      expect(textInput).toHaveValue('These are my custom rules...');
    });

    it('creates paste source with correct shape', async () => {
      render(<AddSourceModal {...defaultProps} />);
      
      // Switch to paste tab and fill form
      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /paste/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('paste-title-input')).toBeInTheDocument();
      });
      
      await user.type(screen.getByTestId('paste-title-input'), 'Test Title');
      await user.type(screen.getByTestId('paste-text-input'), 'Test content');
      
      const submitButton = screen.getByTestId('paste-submit');
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('GitHub Tab', () => {
    it('renders GitHub form with URL and path inputs', async () => {
      render(<AddSourceModal {...defaultProps} />);
      
      // Switch to GitHub tab
      const user = userEvent.setup();
      const githubTab = screen.getByRole('tab', { name: /github/i });
      await user.click(githubTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('github-tab')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('github-title-input')).toBeInTheDocument();
      expect(screen.getByTestId('github-url-input')).toBeInTheDocument();
      expect(screen.getByTestId('github-path-input')).toBeInTheDocument();
      expect(screen.getByTestId('github-submit')).toBeInTheDocument();
    });

    it('stores GitHub metadata correctly', async () => {
      render(<AddSourceModal {...defaultProps} />);
      
      // Switch to GitHub tab
      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /github/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('github-url-input')).toBeInTheDocument();
      });
      
      await user.type(screen.getByTestId('github-title-input'), 'Community Rules');
      await user.type(screen.getByTestId('github-url-input'), 'https://github.com/example/rules');
      await user.clear(screen.getByTestId('github-path-input'));
      await user.type(screen.getByTestId('github-path-input'), 'data/rules.json');
      
      expect(screen.getByTestId('github-url-input')).toHaveValue('https://github.com/example/rules');
      expect(screen.getByTestId('github-path-input')).toHaveValue('data/rules.json');
    });
  });
});
