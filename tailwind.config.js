/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:        '#2F8F6B', // bleu nuit profond
        'primary-2':    '#2F8F6B',
        'primary-3':    '#2F8F6B',

        accent:         '#FCD116', // même couleur → cohérence
        surface:        '#f8fafc', // fond neutre (plus de bleu clair)
        'surface-soft': '#2F8F6B',

        text:           '#0b1a3a',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        soft:  '0 4px 20px rgba(11,26,58,0.06)',
        card:  '0 4px 20px rgba(11,26,58,0.08)',
        heavy: '0 10px 40px rgba(11,26,58,0.15)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in':  'fadeIn 0.25s ease',
        'slide-up': 'slideUp 0.3s ease',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};