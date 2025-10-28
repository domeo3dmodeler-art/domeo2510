// Тест запроса к API photos-batch
const BASE_URL = 'http://130.193.40.35:3001';

async function testPhotosBatch() {
  try {
    // Пример моделей для теста
    const testModels = [
      'DomeoDoors_Soane_1',
      'DomeoDoors_Base_1', 
      'DomeoDoors_Alberti_4'
    ];
    
    console.log('Тестируем запрос к photos-batch API...');
    console.log('Модели:', testModels);
    
    const response = await fetch(`${BASE_URL}/api/catalog/doors/photos-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ models: testModels })
    });
    
    const data = await response.json();
    
    console.log('\n=== РЕЗУЛЬТАТ ===');
    console.log('Status:', response.status);
    console.log('OK:', data.ok);
    console.log('\nФото для моделей:');
    
    testModels.forEach(model => {
      const photoData = data.photos[model];
      console.log(`\n${model}:`);
      if (photoData) {
        console.log('  Photo:', photoData.photo);
        console.log('  Photos:', JSON.stringify(photoData.photos, null, 2));
        console.log('  Has Gallery:', photoData.hasGallery);
      } else {
        console.log('  ❌ Фото не найдено');
      }
    });
    
    console.log('\n=== ПОЛНЫЙ ОТВЕТ ===');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

testPhotosBatch();

