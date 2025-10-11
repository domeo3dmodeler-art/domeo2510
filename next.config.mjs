import { config } from 'dotenv';

// Загружаем переменные окружения
config();

/** @type {import('next').NextConfig} */
const nextConfig = { 
  reactStrictMode: true,
  
  // Настройки кодировки UTF-8
  env: {
    NODE_ENV: process.env.NODE_ENV,
  },
  
  // Настройки для правильной обработки UTF-8
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  
  // Оптимизация производительности
  swcMinify: true,
  compress: true,
  
  // Оптимизация изображений
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  
  // Кэширование и кодировка
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=60',
          },
          {
            key: 'Content-Type',
            value: 'application/json; charset=utf-8',
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
