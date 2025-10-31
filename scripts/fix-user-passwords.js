const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updatePasswords() {
  const users = [
    { email: 'admin@domeo.ru', password: 'admin123' },
    { email: 'complectator@domeo.ru', password: 'complectator123' },
    { email: 'executor@domeo.ru', password: 'executor123' }
  ];

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    const updated = await prisma.user.update({
      where: { email: user.email },
      data: { password_hash: hash }
    });
    console.log(`Updated password for ${user.email}`);
  }
}

updatePasswords()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

