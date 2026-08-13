import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <Loader2
        className={`animate-spin text-[var(--color-primary-500)] ${sizes[size] || sizes.md}`}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary)]">
      <LoadingSpinner size="lg" />
    </div>
  );
}
