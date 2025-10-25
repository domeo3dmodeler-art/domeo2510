const bcrypt = require('bcryptjs');

async function updatePasswords() {
  const passwords = {
    'admin@domeo.ru': 'admin123',
    'complectator@domeo.ru': 'complectator123', 
    'executor@domeo.ru': 'executor123'
  };

  console.log('🔐 Обновляем пароли пользователей...');
  
  for (const [email, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = '${email}';`);
  }
}

updatePasswords().catch(console.error);
