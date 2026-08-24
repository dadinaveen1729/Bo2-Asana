import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#FFF2F1',
          100: '#FFE2E1',
          200: '#FFC9C7',
          300: '#FFA6A3',
          400: '#FE8481',
          500: '#FC636B',
          600: '#F03E4E',
          700: '#D22B42',
          800: '#AF2440',
          900: '#8F213B',
        },
        canvas: 'hsl(var(--canvas))',
        surface: 'hsl(var(--surface))',
        'surface-hover': 'hsl(var(--surface-hover))',
        border: 'hsl(var(--border))',
        'border-strong': 'hsl(var(--border-strong))',
        ink: 'hsl(var(--ink))',
        'ink-muted': 'hsl(var(--ink-muted))',
        'ink-faint': 'hsl(var(--ink-faint))',
        sidebar: 'hsl(var(--sidebar))',
        'sidebar-ink': 'hsl(var(--sidebar-ink))',
        'sidebar-ink-strong': 'hsl(var(--sidebar-ink-strong))',
        'sidebar-ink-faint': 'hsl(var(--sidebar-ink-faint))',
        'sidebar-hover': 'hsl(var(--sidebar-hover))',
        'sidebar-border': 'hsl(var(--sidebar-border))',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
        popover: '0 4px 6px -2px rgba(16,24,40,0.05), 0 12px 16px -4px rgba(16,24,40,0.10)',
        modal: '0 8px 8px -4px rgba(16,24,40,0.04), 0 20px 24px -4px rgba(16,24,40,0.12)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in': { from: { transform: 'translateX(12px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        'slide-up': { from: { transform: 'translateY(6px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-in': 'slide-in 200ms cubic-bezier(0.16,1,0.3,1)',
        'slide-up': 'slide-up 150ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
