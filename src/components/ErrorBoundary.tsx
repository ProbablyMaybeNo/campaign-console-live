import React, { Component, ErrorInfo, ReactNode } from 'react';
import { reportReactError } from '@/lib/errorReporter';
import { TerminalButton } from '@/components/ui/TerminalButton';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Report to error tracking
    reportReactError(error, errorInfo.componentStack || '');
    
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-destructive/10">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground font-display">
                Something went wrong
              </h1>
              <p className="text-muted-foreground">
                An unexpected error occurred. This has been automatically reported to our team.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="p-4 bg-muted rounded-lg text-left overflow-auto max-h-48">
                <p className="text-sm font-mono text-destructive">
                  {this.state.error.message}
                </p>
                <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <TerminalButton
                onClick={this.handleRetry}
                variant="default"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </TerminalButton>
              <TerminalButton
                onClick={this.handleReload}
                variant="outline"
              >
                Reload Page
              </TerminalButton>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
