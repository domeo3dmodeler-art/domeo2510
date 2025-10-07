\# Import Guide (Doors)



\## Назначение

Пошаговая инструкция импорта каталога дверей (CSV/XLSX) в таблицу `products`.



\## Конечная точка

`POST /api/admin/import/doors` (JWT; `Authorization: Bearer <token>`)



\## Формат запроса (multipart/form-data)

\- `file`: CSV или XLSX с листом каталога.

\- `mapping` (опционально): строка JSON:

&nbsp; ```json

&nbsp; {

&nbsp;   "mapping": {

&nbsp;     "model": "Модель",

&nbsp;     "style": "Стиль",

&nbsp;     "finish": "Покрытие",

&nbsp;     "domeo\_color": "Цвет",

&nbsp;     "type": "Тип",

&nbsp;     "width": "Ширина",

&nbsp;     "height": "Высота",

&nbsp;     "rrc\_price": "РРЦ",

&nbsp;     "photo\_url": "Фото"

&nbsp;   },

&nbsp;   "uniqueBy": \["model","finish","domeo\_color","type","width","height"],

&nbsp;   "sheet": "Каталог",

&nbsp;   "startRow": 2

&nbsp; }

Требования к данным



Лист: Каталог (если XLSX) или соответствующий CSV.



Заголовки колонок соответствуют mapping.



Типы:



width, height → целые числа (мм)



rrc\_price → число (RUB)



Уникальность строки: (model, finish, domeo\_color, type, width, height).



Валидации



Отсутствие обязательных колонок → 400.



Некорректные типы → 400 с перечислением строк.



Конфликты РРЦ (изменение цены на существующем уникальном ключе) → 409 + отчёт.



Ответы



200 OK:

{ "ok": true, "inserted": 10, "updated": 5, "skipped": 0, "report\_csv": "/static/import\_reports/import\_2025-09-17T05-20.csv" }





409 Conflict (РРЦ):



{ "ok": false, "conflicts": \[ { "key": {...}, "old\_rrc": 22900, "new\_rrc": 21280 } ], "conflicts\_report": "/static/import\_reports/conflicts\_2025-09-17.csv" }



Иные ошибки: { "ok": false, "error": "..." } + статус 4xx/5xx.



Примеры

CSV (минимум)



Модель,Стиль,Покрытие,Цвет,Тип,Ширина,Высота,РРЦ,Фото

PO Base 1/1,Современная,Нанотекс,Белый,Распашная,800,2000,22900,

PG Base 1,Современная,Нанотекс,Белый,Распашная,800,2000,21280,



cURL (локально)



CSV="/tmp/doors.csv"

TOKEN="smoke"



curl -sS -H "Authorization: Bearer $TOKEN" \\

&nbsp; -F "file=@${CSV};type=text/csv" \\

&nbsp; --form-string 'mapping={"mapping":{"model":"Модель","style":"Стиль","finish":"Покрытие","domeo\_color":"Цвет","type":"Тип","width":"Ширина","height":"Высота","rrc\_price":"РРЦ","photo\_url":"Фото"},"uniqueBy":\["model","finish","domeo\_color","type","width","height"],"sheet":"Каталог","startRow":2}' \\

&nbsp; http://localhost:3000/api/admin/import/doors

Где смотреть отчёты



Путь: app/public/static/import\_reports/ (отдаётся как /static/import\_reports/...).



В UI /doors → вкладка «Админ» → после импорта отображается статус и ссылка на CSV-отчёт (если есть).







