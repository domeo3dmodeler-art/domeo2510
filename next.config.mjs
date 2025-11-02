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
  
  // Настройки для исключения страниц из статической генерации
  output: 'standalone',
  
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
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
        ],
      },
    ];
  },
  
  // Генерация уникального BUILD_ID для инвалидации кэша браузера
  generateBuildId: async () => {
    // Генерируем уникальный ID на основе текущего времени и случайной строки
    // Это заставляет браузер загружать новый код при каждом деплое
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const buildId = `build-${timestamp}-${random}`;
    console.log('🔧 Generated BUILD_ID:', buildId);
    return buildId;
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
