import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] ' +
    'focus-visible:ring-[var(--color-primary-500)] shadow-sm',
  secondary:
    'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--color-neutral-200)] ' +
    'dark:hover:bg-[var(--color-neutral-700)] focus-visible:ring-[var(--color-neutral-400)] border border-[var(--border-primary)]',
  danger:
    'bg-[var(--color-danger-600)] text-white hover:bg-[var(--color-danger-700)] ' +
    'focus-visible:ring-[var(--color-danger-500)] shadow-sm',
  ghost:
    'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] ' +
    'focus-visible:ring-[var(--color-neutral-400)]',
  success:
    'bg-[var(--color-secondary-600)] text-white hover:bg-[var(--color-secondary-700)] ' +
    'focus-visible:ring-[var(--color-secondary-500)] shadow-sm',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    iconPosition = 'left',
    className = '',
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-200 ease-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-[0.97]
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!loading && Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
    </button>
  );
});

export default Button;
