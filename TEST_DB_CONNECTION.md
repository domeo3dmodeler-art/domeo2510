# Проверка подключения к БД

Создайте простой тестовый endpoint для проверки подключения:

```typescript
// app/api/test-db/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Простой тест подключения
    await prisma.$connect();
    const count = await prisma.product.count();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connected',
      productCount: count 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message,
      code: error.code,
      meta: error.meta
    }, { status: 500 });
  }
}
```

Затем откройте в браузере: `http://localhost:3000/api/test-db`

