-- Обновление паролей пользователей
-- Пароли: admin123, complectator123, executor123
-- Хеши получены с помощью bcrypt с salt rounds = 10

-- Админ
UPDATE users SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE email = 'admin@domeo.ru';

-- Комплектатор  
UPDATE users SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE email = 'complectator@domeo.ru';

-- Исполнитель
UPDATE users SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE email = 'executor@domeo.ru';

-- Проверяем результат
SELECT email, password_hash FROM users;
