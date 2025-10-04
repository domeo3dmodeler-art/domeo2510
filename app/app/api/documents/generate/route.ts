import { NextRequest, NextResponse } from 'next/server';
import { PDFGenerator } from '../../../../lib/documents/pdf-generator';
import { ExcelGenerator } from '../../../../lib/documents/excel-generator';

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Тип документа и данные обязательны' },
        { status: 400 }
      );
    }

    let buffer: Buffer;
    let filename: string;
    let mimeType: string;

    switch (type) {
      case 'commercial-proposal':
        buffer = await PDFGenerator.getInstance().generateCommercialProposal(data);
        filename = `КП_${data.documentNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
        mimeType = 'application/pdf';
        break;

      case 'invoice':
        buffer = await PDFGenerator.getInstance().generateInvoice(data);
        filename = `Счет_${data.documentNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
        mimeType = 'application/pdf';
        break;

      case 'supplier-order-pdf':
        buffer = await PDFGenerator.getInstance().generateSupplierOrder(data);
        filename = `Заказ_${data.documentNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
        mimeType = 'application/pdf';
        break;

      case 'supplier-order-excel':
        buffer = await ExcelGenerator.getInstance().generateSupplierOrder(data);
        filename = `Заказ_${data.documentNumber}_${new Date().toISOString().split('T')[0]}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;

      default:
        return NextResponse.json(
          { error: 'Неподдерживаемый тип документа' },
          { status: 400 }
        );
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Ошибка генерации документа:', error);
    return NextResponse.json(
      { error: 'Ошибка генерации документа' },
      { status: 500 }
    );
  }
}



