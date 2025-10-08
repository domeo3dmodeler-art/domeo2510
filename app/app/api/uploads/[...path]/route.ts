import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/');
    
    // Безопасность: проверяем, что путь не содержит опасные символы
    if (filePath.includes('..') || filePath.includes('\\')) {
      return NextResponse.json(
        { error: 'Небезопасный путь к файлу' },
        { status: 400 }
      );
    }

    // Полный путь к файлу в public директории
    const fullPath = path.join(process.cwd(), 'public', filePath);
    
    console.log('🔍 Запрос файла:', filePath);
    console.log('📁 Полный путь:', fullPath);

    // Проверяем существование файла
    if (!existsSync(fullPath)) {
      console.log('❌ Файл не найден:', fullPath);
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 404 }
      );
    }

    // Читаем файл
    const fileBuffer = await readFile(fullPath);
    
    // Определяем MIME тип по расширению
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
    }

    console.log('✅ Файл найден и отправлен:', filePath, 'размер:', fileBuffer.length, 'тип:', contentType);

    // Возвращаем файл с правильными заголовками
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Кэшируем на год
      },
    });

  } catch (error) {
    console.error('❌ Ошибка при чтении файла:', error);
    return NextResponse.json(
      { error: 'Ошибка при чтении файла' },
      { status: 500 }
    );
  }
}
