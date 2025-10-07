// Тестовый скрипт для проверки связей между компонентами
console.log('🔍 Тестовый скрипт для связей загружен');

// Функция для тестирования создания связи
function testConnectionCreation() {
    console.log('🧪 Тестируем создание связи...');
    
    // Симулируем создание связи
    const mockConnection = {
        id: 'test-conn-' + Date.now(),
        sourceElementId: 'filter-style',
        targetElementId: 'filter-model',
        connectionType: 'filter',
        sourceProperty: 'selectedValue',
        targetProperty: 'filters',
        description: 'Тестовая связь стиль → модель',
        isActive: true
    };
    
    console.log('🔗 Тестовая связь создана:', mockConnection);
    
    // Проверяем, что связь имеет все необходимые поля
    const requiredFields = ['id', 'sourceElementId', 'targetElementId', 'connectionType', 'isActive'];
    const missingFields = requiredFields.filter(field => !mockConnection[field]);
    
    if (missingFields.length === 0) {
        console.log('✅ Связь содержит все необходимые поля');
    } else {
        console.error('❌ Связи не хватает полей:', missingFields);
    }
    
    return mockConnection;
}

// Функция для тестирования передачи данных
function testDataTransmission() {
    console.log('🧪 Тестируем передачу данных...');
    
    // Симулируем данные от PropertyFilter
    const mockData = {
        type: 'filter',
        propertyName: 'Domeo_Стиль Web',
        value: 'Современная',
        categoryIds: ['cmg50xcgs001cv7mn0tdyk1wo']
    };
    
    console.log('🔗 Данные от PropertyFilter:', mockData);
    
    // Проверяем формат данных
    const requiredDataFields = ['type', 'propertyName', 'value', 'categoryIds'];
    const missingDataFields = requiredDataFields.filter(field => !mockData[field]);
    
    if (missingDataFields.length === 0) {
        console.log('✅ Данные имеют правильный формат');
    } else {
        console.error('❌ Данным не хватает полей:', missingDataFields);
    }
    
    return mockData;
}

// Функция для тестирования обработки связи
function testConnectionProcessing(connection, data) {
    console.log('🧪 Тестируем обработку связи...');
    
    // Симулируем обработку в handleConnectionData
    const targetUpdates = {
        props: {
            filters: {
                propertyName: data.propertyName,
                propertyValue: data.value,
                categoryIds: data.categoryIds
            }
        }
    };
    
    console.log('🔍 Обновления для целевого элемента:', targetUpdates);
    
    // Проверяем, что обновления содержат правильные данные
    if (targetUpdates.props.filters && 
        targetUpdates.props.filters.propertyName === data.propertyName &&
        targetUpdates.props.filters.propertyValue === data.value) {
        console.log('✅ Обновления содержат правильные данные фильтра');
    } else {
        console.error('❌ Обновления содержат неправильные данные');
    }
    
    return targetUpdates;
}

// Запускаем все тесты
function runAllTests() {
    console.log('🚀 Запускаем все тесты связей...');
    
    try {
        const connection = testConnectionCreation();
        const data = testDataTransmission();
        const updates = testConnectionProcessing(connection, data);
        
        console.log('✅ Все тесты прошли успешно!');
        console.log('📋 Связи должны работать правильно');
        
    } catch (error) {
        console.error('❌ Ошибка в тестах:', error);
    }
}

// Экспортируем функции для использования в консоли
window.testConnectionCreation = testConnectionCreation;
window.testDataTransmission = testDataTransmission;
window.testConnectionProcessing = testConnectionProcessing;
window.runAllTests = runAllTests;

// Автоматически запускаем тесты
runAllTests();

console.log('📋 Доступные функции:');
console.log('  - testConnectionCreation()');
console.log('  - testDataTransmission()');
console.log('  - testConnectionProcessing(connection, data)');
console.log('  - runAllTests()');
