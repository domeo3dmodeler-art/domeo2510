import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Скачивание файла экспорта прайса');

    // Ищем существующий файл экспорта
    const files = fs.readdirSync(process.cwd()).filter((file: string) => 
      file.startsWith('price_') && file.endsWith('.csv')
    );

    if (files.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Файл экспорта не найден. Сначала запустите скрипт экспорта.' 
      }, { status: 404 });
    }

    // Берем самый новый файл
    const latestFile = files.sort().pop();
    const filePath = path.join(process.cwd(), latestFile!);
    
    console.log('📁 Найден файл:', latestFile);

    // Читаем содержимое файла
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Возвращаем CSV файл
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${latestFile}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('❌ Error downloading file:', error);
    return NextResponse.json(
      { success: false, error: `Failed to download file: ${error.message}` },
      { status: 500 }
    );
  }
}