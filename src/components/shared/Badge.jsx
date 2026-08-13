import { forwardRef } from 'react';

const variants = {
  default: 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)] dark:bg-[var(--color-neutral-800)] dark:text-[var(--color-neutral-300)]',
  primary: 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] dark:bg-indigo-900/50 dark:text-indigo-300',
  success: 'bg-[var(--color-secondary-100)] text-[var(--color-secondary-700)] dark:bg-emerald-900/50 dark:text-emerald-300',
  warning: 'bg-[var(--color-warning-100)] text-[var(--color-warning-700)] dark:bg-amber-900/50 dark:text-amber-300',
  danger: 'bg-[var(--color-danger-100)] text-[var(--color-danger-700)] dark:bg-rose-900/50 dark:text-rose-300',
};

const Badge = forwardRef(function Badge(
  { children, variant = 'default', className = '', ...props },
  ref
) {
  return (
    <span
      ref={ref}
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variants[variant] || variants.default}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
});

export default Badge;
