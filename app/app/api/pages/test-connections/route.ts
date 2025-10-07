import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Загружаем тестовую страницу из файла
    const fs = require('fs');
    const path = require('path');
    
    const testPagePath = path.join(process.cwd(), 'app', 'test-connections-page.json');
    const testPageData = JSON.parse(fs.readFileSync(testPagePath, 'utf8'));
    
    return NextResponse.json({
      success: true,
      page: testPageData
    });
  } catch (error) {
    console.error('Error loading test page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load test page' },
      { status: 500 }
    );
  }
}

