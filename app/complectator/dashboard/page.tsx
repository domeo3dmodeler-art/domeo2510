'use client';

// Отключаем статическую генерацию (динамический контент) - должно быть до импортов
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import React from 'react';
import dynamicImport from 'next/dynamic';

// Динамический импорт основного компонента dashboard с отключением SSR
const ComplectatorDashboardComponent = dynamicImport(
  () => import('./ComplectatorDashboardComponent').then(mod => ({ default: mod.ComplectatorDashboardComponent })),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-64"><div className="text-gray-500">Загрузка...</div></div>
  }
);

export default function ComplectatorDashboard() {
  return <ComplectatorDashboardComponent />;
}