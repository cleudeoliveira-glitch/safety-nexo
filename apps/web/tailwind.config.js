const tokens = require('@safety-nexo/design-tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ...tokens.colors, menta: '#6CF0C2', 'primary-escuro': '#082F3A' },
      fontFamily: tokens.fontFamily,
      borderRadius: tokens.radius,
    },
  },
  plugins: [],
};
