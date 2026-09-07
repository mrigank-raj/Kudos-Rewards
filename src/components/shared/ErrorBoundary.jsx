import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui';

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
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-canvas animate-fade-in">
          <div className="max-w-md w-full bg-surface-base p-8 rounded-3xl border border-stroke-subtle shadow-elevation-lg text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-danger-subtle text-danger-solid flex items-center justify-center">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-heading-lg text-ink-primary">Something went wrong</h2>
              <p className="text-body-sm text-ink-secondary mt-2">
                An unexpected error occurred in the application.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-surface-subtle rounded-xl text-left overflow-auto max-h-32 border border-stroke-subtle">
                <code className="text-xs text-danger-solid break-words">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <Button
              className="w-full"
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
