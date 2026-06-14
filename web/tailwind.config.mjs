/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        // Deep blues. `navy` is the content text/link colour — variable-driven
        // so it flips to a light blue in dark mode. `brand` is the fixed navy
        // used for the few navy *backgrounds* (nav, table headers, FAB) that
        // must stay dark in both themes.
        navy: { DEFAULT: 'rgb(var(--c-navy) / <alpha-value>)', strong: '#0b2444', soft: '#1d4e89' },
        brand: { DEFAULT: '#16335c', strong: '#0b2444' },
        // Bright blue accents (variations)
        blue: { DEFAULT: '#1f6feb', bright: '#3b82f6', light: '#6aa6ff', sky: '#dbeafe' },
        // Vibrant yellow / gold (variations)
        saffron: { DEFAULT: '#f4b21a', soft: '#fdeec8', deep: '#9a6a07' },
        gold: { DEFAULT: '#f4b21a', bright: '#ffc83d', soft: '#fdeec8', deep: '#9a6a07' },
        // Neutrals
        paper: 'rgb(var(--c-paper) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        black: '#0a0d14',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        ok: '#2f7d4f',
      },
      fontFamily: {
        serif: ['Georgia', '"Iowan Old Style"', '"Times New Roman"', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        gur: ['"Noto Sans Gurmukhi"', '"Gurmukhi MN"', '"Gurbani Akhar"', '"Raavi"', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,19,26,.06), 0 10px 26px rgba(31,111,235,.08)',
        lift: '0 14px 34px rgba(31,111,235,.18)',
      },
      maxWidth: { content: '1100px' },
      borderRadius: { xl2: '1.1rem' },
    },
  },
  plugins: [],
};
