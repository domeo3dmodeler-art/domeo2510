import { NextRequest, NextResponse } from 'next/server';
import { catalogService } from '@/lib/services/catalog.service';
import { UpdatePropertyAssignmentDto } from '@/lib/types/catalog';

// PUT /api/catalog/assignments/[id] - Обновить назначение свойства
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data: UpdatePropertyAssignmentDto = await request.json();

    const assignment = await catalogService.updatePropertyAssignment(params.id, data);
    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error updating property assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update property assignment' },
      { status: 500 }
    );
  }
}

// DELETE /api/catalog/assignments/[id] - Удалить назначение свойства
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await catalogService.removePropertyAssignment(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting property assignment:', error);
    return NextResponse.json(
      { error: 'Failed to delete property assignment' },
      { status: 500 }
    );
  }
}
