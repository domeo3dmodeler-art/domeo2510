import { config } from 'dotenv';

// Загружаем переменные окружения
config();

/** @type {import('next').NextConfig} */
const nextConfig = { 
  reactStrictMode: true,
  async headers() {
    return [
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
};
export default nextConfig;
