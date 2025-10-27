const fetch = require('node-fetch');

async function testApi() {
  try {
    const response = await fetch('http://130.193.40.35:3001/api/catalog/doors/photos-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ models: ['DomeoDoors_Ruby_1'] })
    });
    
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

testApi().catch(console.error);

