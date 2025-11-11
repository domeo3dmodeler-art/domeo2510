import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '@/lib/logging/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    let filePath = resolvedParams.path.join('/');
    
    // Исправляем пути вида "uploadsproducts/..." -> "products/..."
    // (так как в fullPath уже добавляется "public/uploads")
    if (filePath.startsWith('uploadsproducts/')) {
      filePath = `products/${filePath.substring(17)}`;
    } else if (filePath.startsWith('uploadsproducts')) {
      filePath = `products/${filePath.substring(16)}`;
    }
    
    // Проверяем безопасность пути
    if (filePath.includes('..') || filePath.includes('~')) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Путь к файлу в папке public/uploads
    let fullPath = join(process.cwd(), 'public', 'uploads', filePath);
    
    logger.debug('Ищем файл', 'uploads/[...path]', { filePath, fullPath });
    
    // Проверяем существование файла в новом месте (public/uploads)
    if (!existsSync(fullPath)) {
      // Если файл не найден в новом месте, проверяем старое место (uploads без public)
      const oldPath = join(process.cwd(), 'uploads', filePath);
      logger.debug('Файл не найден в новом месте, проверяем старое', 'uploads/[...path]', { filePath, oldPath });
      
      if (existsSync(oldPath)) {
        // Используем старый путь
        fullPath = oldPath;
        logger.debug('Файл найден в старом месте', 'uploads/[...path]', { filePath, fullPath });
      } else {
        logger.warn('Файл не найден ни в новом, ни в старом месте', 'uploads/[...path]', { filePath, newPath: fullPath, oldPath });
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }
    }

    // Читаем файл
    const fileBuffer = await readFile(fullPath);
    
    // Определяем MIME тип по расширению
    const ext = filePath.split('.').pop()?.toLowerCase();
    let mimeType = 'application/octet-stream';
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        mimeType = 'image/jpeg';
        break;
      case 'png':
        mimeType = 'image/png';
        break;
      case 'gif':
        mimeType = 'image/gif';
        break;
      case 'webp':
        mimeType = 'image/webp';
        break;
      case 'svg':
        mimeType = 'image/svg+xml';
        break;
      case 'pdf':
        mimeType = 'application/pdf';
        break;
      case 'dwg':
        mimeType = 'application/acad';
        break;
      case 'dxf':
        mimeType = 'application/x-dxf';
        break;
    }

    // Определяем имя файла для заголовка Content-Disposition
    const fileName = filePath.split('/').pop() || 'file';
    
    // Возвращаем файл с правильными заголовками
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    logger.error('Ошибка загрузки файла', 'uploads/[...path]', error instanceof Error ? { error: error.message, stack: error.stack, filePath } : { error: String(error), filePath });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}