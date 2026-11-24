const tokens = require('@safety-nexo/design-tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ...tokens.colors, menta: '#6CF0C2', 'primary-escuro': '#082F3A' },
      fontFamily: tokens.fontFamily,
      borderRadius: tokens.radius,
      // Tela baixa (notebook de 768 px com a barra do navegador e do Windows): o menu lateral fica mais compacto.
      screens: { baixa: { raw: '(min-width: 768px) and (max-height: 820px)' } },
    },
  },
  plugins: [],
};
