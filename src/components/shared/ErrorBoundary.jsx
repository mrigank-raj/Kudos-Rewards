import React from 'react';
import Button from './Button';
import { AlertOctagon } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg-secondary)] animate-fade-in">
          <div className="max-w-md w-full bg-[var(--bg-elevated)] p-8 rounded-3xl border border-[var(--border-primary)] shadow-xl text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-[var(--color-danger-50)] text-[var(--color-danger-600)] flex items-center justify-center dark:bg-rose-900/30 dark:text-rose-400">
              <AlertOctagon className="w-8 h-8" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Something went wrong</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-2">
                An unexpected error occurred in the application.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[var(--bg-tertiary)] rounded-xl text-left overflow-auto max-h-32 border border-[var(--border-secondary)]">
                <code className="text-xs text-[var(--color-danger-500)] break-words">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
