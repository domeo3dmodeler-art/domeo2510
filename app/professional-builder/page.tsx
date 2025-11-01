'use client';

import React from 'react';
import { PageBuilder } from '../../components/page-builder/PageBuilder';

// Отключаем prerendering для этой страницы (динамический контент)
export const dynamic = 'force-dynamic';

export default function ProfessionalBuilderPage() {
  return (
    <div className="h-screen w-full">
      <PageBuilder />
    </div>
  );
}

