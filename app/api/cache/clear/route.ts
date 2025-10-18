import { NextRequest, NextResponse } from 'next/server';
import { uniqueValuesCache } from '../../../../lib/cache/unique-values-cache';

export async function POST(request: NextRequest) {
  try {
    console.log('Clearing unique values cache...');
    
    // Очищаем кэш
    uniqueValuesCache.clear();
    
    console.log('Unique values cache cleared successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

