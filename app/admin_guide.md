## Загрузка фото (Doors)
- Эндпоинт: `POST /api/admin/media/upload` (JWT).
- Форма: `multipart/form-data` с `model` (string) и `file` (array of binary).
- Имя файла на диске: `encodeURIComponent(model).ext` (jpg/png).
- Путь: `public/assets/doors/`.

Пример:
curl -sS -H "Authorization: Bearer smoke" \
  -F "model=PO Base 1/1" \
  -F "file=@/path/pic.jpg;type=image/jpeg" \
  http://localhost:3000/api/admin/media/upload
