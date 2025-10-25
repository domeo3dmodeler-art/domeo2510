const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function checkDatabaseDirectly() {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, 'prisma', 'database', 'dev.db');
    const db = new sqlite3.Database(dbPath);
    
    console.log('=== ПРОВЕРКА БАЗЫ ДАННЫХ НАПРЯМУЮ ===');
    console.log('Путь к базе:', dbPath);
    
    db.get(
      "SELECT required_fields FROM import_template WHERE catalog_category_id = ?",
      ['cmg50xcgs001cv7mn0tdyk1wo'],
      (err, row) => {
        if (err) {
          console.error('Ошибка SQLite:', err);
          reject(err);
          return;
        }
        
        if (row) {
          console.log('Данные из SQLite:');
          console.log('required_fields:', row.required_fields);
          
          try {
            const fields = JSON.parse(row.required_fields);
            console.log('\nПарсированные поля:');
            fields.forEach((field, i) => {
              console.log(`  ${i + 1}: "${field}"`);
            });
            
            // Проверяем кодировку
            const hasCorrupted = fields.some(field => field.includes('?'));
            console.log(`\nСодержит поврежденные символы: ${hasCorrupted}`);
            
            if (hasCorrupted) {
              const corruptedFields = fields.filter(field => field.includes('?'));
              console.log('Поврежденные поля:');
              corruptedFields.forEach(field => {
                console.log(`  - "${field}"`);
              });
            }
            
          } catch (parseErr) {
            console.error('Ошибка парсинга JSON:', parseErr);
          }
        } else {
          console.log('Запись не найдена');
        }
        
        db.close();
        resolve();
      }
    );
  });
}

checkDatabaseDirectly().catch(console.error);
