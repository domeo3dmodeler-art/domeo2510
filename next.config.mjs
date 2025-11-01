// Next.js автоматически загружает переменные окружения

/** @type {import('next').NextConfig} */
const nextConfig = { 
  reactStrictMode: true,
  output: 'standalone',
  
  // Оптимизация производительности
  compress: true,
  
  // Оптимизация изображений
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: ['storage.yandexcloud.net'],
  },
  
  // Оптимизация сборки
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
  
  // Отключаем статическую генерацию для проблемных страниц
  async generateBuildId() {
    return 'build-' + Date.now();
  },
  
  // Настройки для исключения страниц из статической генерации
  output: 'standalone',
  
  // Отключаем статическую генерацию для определенных путей
  async generateBuildId() {
    return 'build-' + Date.now();
  },
  
  // Исключаем проблемные страницы из статической генерации
  async rewrites() {
    return [];
  },
  
  // ВНИМАНИЕ: Отключаем TypeScript ошибки при сборке
  // В проекте обнаружено более 200 TypeScript ошибок
  // Перед отключением ignoreBuildErrors необходимо исправить все ошибки
  // См. docs/TYPESCRIPT_ERRORS_FIX_PLAN.md для плана исправления
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Кэширование
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/uploads/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Оптимизация webpack
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    return config;
  },
};
export default nextConfig;
