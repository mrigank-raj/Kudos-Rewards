/**
 * Token names map 1:1 onto the Figma "Kudos Theme" variable collection.
 *   Figma surface/base   ->  bg-surface-base
 *   Figma border/subtle  ->  border-stroke-subtle
 *   Figma text/primary   ->  text-ink-primary
 *   Figma brand/solid    ->  bg-brand-solid
 * Values live as RGB triples in src/index.css so light and dark swap
 * from one [data-theme] attribute, exactly like the Figma mode switch.
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          canvas: token('surface-canvas'),
          base: token('surface-base'),
          raised: token('surface-raised'),
          sunken: token('surface-sunken'),
          subtle: token('surface-subtle'),
          nav: token('surface-nav'),
        },
        stroke: {
          subtle: token('stroke-subtle'),
          DEFAULT: token('stroke-default'),
          strong: token('stroke-strong'),
        },
        ink: {
          primary: token('ink-primary'),
          secondary: token('ink-secondary'),
          muted: token('ink-muted'),
          inverse: token('ink-inverse'),
          onbrand: token('ink-onbrand'),
        },
        brand: {
          solid: token('brand-solid'),
          hover: token('brand-hover'),
          text: token('brand-text'),
          subtle: token('brand-subtle'),
          border: token('brand-border'),
        },
        gold: {
          solid: token('gold-solid'),
          text: token('gold-text'),
          subtle: token('gold-subtle'),
          border: token('gold-border'),
        },
        success: {
          solid: token('success-solid'),
          text: token('success-text'),
          subtle: token('success-subtle'),
          border: token('success-border'),
        },
        danger: {
          solid: token('danger-solid'),
          text: token('danger-text'),
          subtle: token('danger-subtle'),
          border: token('danger-border'),
        },
      },
      fontFamily: {
        sans: ['Geist', 'SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // matches the Figma type ramp
        'display-xl': ['2.75rem', { lineHeight: '3rem', letterSpacing: '-0.0875rem', fontWeight: '700' }],
        'display-lg': ['2rem', { lineHeight: '2.375rem', letterSpacing: '-0.056rem', fontWeight: '600' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.875rem', letterSpacing: '-0.031rem', fontWeight: '600' }],
        'heading-md': ['1.125rem', { lineHeight: '1.5rem', letterSpacing: '-0.019rem', fontWeight: '600' }],
        'heading-sm': ['0.9375rem', { lineHeight: '1.25rem', letterSpacing: '-0.006rem', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem' }],
        'body-md': ['0.875rem', { lineHeight: '1.3125rem' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.1875rem' }],
        'label-md': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        'label-sm': ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '500' }],
        'label-xs': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
        overline: ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.056rem', fontWeight: '500' }],
        'numeric-hero': ['3.5rem', { lineHeight: '3.625rem', letterSpacing: '-0.1375rem', fontWeight: '700' }],
        'numeric-xl': ['2.125rem', { lineHeight: '2.375rem', letterSpacing: '-0.0625rem', fontWeight: '600' }],
        'numeric-lg': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.031rem', fontWeight: '600' }],
      },
      boxShadow: {
        // Figma effect styles
        'elevation-sm': '0 1px 2px rgb(0 0 0 / 0.04), 0 1px 3px rgb(0 0 0 / 0.05)',
        'elevation-md': '0 8px 30px rgb(0 0 0 / 0.05), 0 1px 2px rgb(0 0 0 / 0.03)',
        'elevation-lg': '0 24px 60px -12px rgb(0 0 0 / 0.12), 0 2px 6px rgb(0 0 0 / 0.04)',
        'glow-brand': '0 16px 44px -8px rgb(79 70 229 / 0.38)',
        'glow-gold': '0 12px 32px -6px rgb(245 158 11 / 0.35)',
        'focus-brand': '0 0 0 4px rgb(79 70 229 / 0.16)',
        'focus-danger': '0 0 0 4px rgb(225 29 72 / 0.16)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      keyframes: {
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(0.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'sheet-up': 'sheet-up 0.34s cubic-bezier(0.23, 1, 0.32, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'pop-in': 'pop-in 0.24s cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
  plugins: [],
}
