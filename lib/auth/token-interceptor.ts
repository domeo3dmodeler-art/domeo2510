// Клиентский интерцептор для добавления токена к запросам
export function addAuthTokenToRequest() {
  const token = localStorage.getItem('authToken');
  if (token) {
    return {
      'x-auth-token': token,
      'Authorization': `Bearer ${token}`
    };
  }
  return {};
}

// Функция для проверки авторизации на клиенте
export function isAuthenticated(): boolean {
  const token = localStorage.getItem('authToken');
  return !!token;
}

// Функция для получения данных пользователя
export function getCurrentUser() {
  const userData = {
    id: localStorage.getItem('userId'),
    email: localStorage.getItem('userEmail'),
    role: localStorage.getItem('userRole'),
    firstName: localStorage.getItem('userFirstName'),
    lastName: localStorage.getItem('userLastName'),
    middleName: localStorage.getItem('userMiddleName')
  };
  
  // Проверяем, что все основные поля заполнены
  return userData.id && userData.email && userData.role ? userData : null;
}



