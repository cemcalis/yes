module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    '../src/**/*.{js,ts,jsx,tsx}',
    '../../src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        foreground: 'var(--foreground)',
        background: 'var(--background)',
        champagne: {
          100: 'var(--champagne-100)',
          200: 'var(--champagne-200)'
        }
      }
    },
  },
  plugins: [],
};
