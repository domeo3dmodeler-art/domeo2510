# Domeo No-Code Calculators — Admin Guide (Doors)

Owner: @Admin + @TechLead  
Last updated: 2025-09-20  
Related: [Master Spec](./master_spec.md), [Data Import Guide Doors](./data_import_guide_doors.md), [Spec КП Formulas](./spec_kp_formulas.md), [Roadmap](./roadmap.md), [State](./state.md), [Sync Guide](./sync_guide.md)

---

## Вкладка «Админ»

### Загрузка медиа
- **UI**: форма «Загрузить медиафайл».
- POST `/api/admin/media/upload`  
- Поведение:
  - Файл кладётся в `public/assets/doors/encodeURIComponent(model).ext`.
  - Доступен через `/assets/doors/...`.

### Импорт каталога
- **UI**: кнопка «Импорт прайса».  
- POST `/api/admin/import/doors`  
- Подробности см. [Data Import Guide Doors](./data_import_guide_doors.md).  
- После импорта UI показывает отчёт (успех/ошибка).

---

## Экспорты (Doors) — v1
Формируются на стороне API по `spec_kp_formulas.md` и возвращают готовый контент для открытия/скачивания.

### Smoke-проверки (локально)

#### КП (PDF)
```bash
cart='{"cart":{"items":[{"model":"PO Base 1/1","width":800,"height":2000,"color":"Белый","qty":1}]}}'

curl -fsSI -X POST -H 'Content-Type: application/json' \
  -d "$cart" "$BASE_URL/api/cart/export/doors/kp?format=pdf" | grep -i 'application/pdf'

Счёт (PDF)
curl -fsSI -X POST -H 'Content-Type: application/json' \
  -d "$cart" "$BASE_URL/api/cart/export/doors/invoice?format=pdf" | grep -i 'application/pdf'

  Заказ на фабрику (XLSX)
  curl -fsSI -X POST -H 'Content-Type: application/json' \
    -d "$cart" "$BASE_URL/api/cart/export/doors/factory?format=xlsx" | grep -i 'spreadsheetml'

    Версионирование

    v1.3 (2025-09-20): убран HTML-экспорт (оставлен только PDF/XLSX).

    v1.2 (2025-09-18): добавлен Invoice.

    v1.1 (2025-09-15): Factory CSV.

    v1.0 (2025-09-10): базовый импорт и медиа.