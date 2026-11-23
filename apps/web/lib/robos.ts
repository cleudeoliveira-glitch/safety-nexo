// Robôs que leem sites para alimentar inteligência artificial ou para copiar o site inteiro.
// Eles não são clientes nem buscadores (Google e Bing continuam liberados nas páginas de venda).
// A lista vale para o robots.txt (aviso educado) e para o bloqueio de verdade no middleware.

export const ROBOS_IA = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
  'ClaudeBot', 'Claude-Web', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
  'Google-Extended', 'GoogleOther', 'Google-CloudVertexBot',
  'Applebot-Extended',
  'PerplexityBot', 'Perplexity-User',
  'CCBot', 'Bytespider', 'Amazonbot', 'meta-externalagent', 'meta-externalfetcher', 'FacebookBot',
  'cohere-ai', 'cohere-training-data-crawler', 'Diffbot', 'YouBot', 'AI2Bot', 'Ai2Bot-Dolma',
  'DuckAssistBot', 'MistralAI-User', 'PetalBot', 'Timpibot', 'omgili', 'omgilibot',
  'ImagesiftBot', 'img2dataset', 'Kangaroo Bot', 'PanguBot', 'Scrapy', 'FirecrawlAgent',
  'Brightbot', 'iaskspider', 'ISSCyberRiskCrawler', 'Sidetrade', 'VelenPublicWebCrawler',
  'webzio-extended', 'Webzio', 'TikTokSpider', 'Novellum', 'QualifiedBot', 'Crawl4AI',
];

// Programas de "copiar site inteiro" e de raspagem automática.
export const COPIADORES = [
  'HTTrack', 'Wget', 'WebCopier', 'WebZIP', 'Offline Explorer', 'SiteSucker', 'WebReaper',
  'Teleport', 'Website Downloader', 'SiteSnagger', 'webstripper', 'python-requests', 'python-urllib',
  'aiohttp', 'httpx', 'Go-http-client', 'Java/', 'libwww-perl', 'HeadlessChrome', 'PhantomJS',
  'Puppeteer', 'Playwright', 'Selenium', 'node-fetch', 'axios/', 'Jina', 'ScrapingBee', 'Apify',
  'ZenRows', 'Bright Data', 'Zyte',
];

const PADRAO = new RegExp(
  [...ROBOS_IA, ...COPIADORES].map((n) => n.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|'),
  'i',
);

export function ehRoboBloqueado(userAgent: string | null): boolean {
  if (!userAgent) return true; // navegador de verdade sempre se identifica
  return PADRAO.test(userAgent);
}
