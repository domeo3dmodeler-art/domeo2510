import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const limit = parseInt(searchParams.get("limit") || "50");

    // В реальном приложении здесь был бы запрос к базе данных
    // Пока что возвращаем информацию о том, что это демо-версия
    const products = []; // Реальные данные будут здесь

    if (format === "csv") {
      // Возвращаем пустой CSV с заголовками
      const headers = [
        "Артикул поставщика",
        "Модель", 
        "Стиль",
        "Покрытие",
        "Цвет",
        "Ширина",
        "Высота", 
        "РРЦ",
        "Фото",
        "Дата импорта",
        "Файл импорта"
      ];
      
      const csvRows = [headers.join(",")];
      
      return new Response(csvRows.join("\n"), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="imported_products.csv"',
        },
      });
    }

    // Возвращаем JSON формат с информацией о демо-режиме
    return NextResponse.json({
      total: 0,
      shown: 0,
      products: [],
      demo_mode: true,
      message: "Это демо-версия. Реальные данные будут доступны после настройки базы данных и парсера файлов.",
      summary: {
        by_style: {},
        by_price_range: {},
        total_value: 0
      },
      requirements: [
        "Установить библиотеку xlsx для парсинга Excel файлов",
        "Настроить подключение к базе данных",
        "Создать таблицы для хранения товаров",
        "Реализовать валидацию данных"
      ]
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Ошибка получения данных" },
      { status: 500 }
    );
  }
}