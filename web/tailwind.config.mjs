/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#16335c', strong: '#0f2547', soft: '#1d4e89' },
        saffron: { DEFAULT: '#c8862a', soft: '#f3e6cf', deep: '#8a5a14' },
        paper: '#f6f1e7',
        surface: '#fffdf9',
        ink: '#2b2b2b',
        muted: '#5c6273',
        line: '#e2dccd',
        ok: '#2f7d4f',
      },
      fontFamily: {
        serif: ['Georgia', '"Iowan Old Style"', '"Times New Roman"', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        gur: ['"Noto Sans Gurmukhi"', '"Gurmukhi MN"', '"Gurbani Akhar"', '"Raavi"', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(22,51,92,.07), 0 8px 24px rgba(22,51,92,.06)',
        lift: '0 10px 30px rgba(22,51,92,.14)',
      },
      maxWidth: { content: '1100px' },
      borderRadius: { xl2: '1.1rem' },
    },
  },
  plugins: [],
};
