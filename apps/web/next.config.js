/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Não mostra que o site é feito em Next.js e não publica o "mapa" do código-fonte.
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  transpilePackages: ['@safety-nexo/design-tokens'],
};

module.exports = nextConfig;
