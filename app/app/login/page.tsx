'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('complectator@domeo.ru');
  const [password, setPassword] = useState('complectator123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 Начинаем процесс входа...', { email, password: '***' });
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('📊 Ответ сервера:', response.status, data);

      if (data.success) {
        console.log('✅ Логин успешен, сохраняем данные...');
        // Сохраняем токен и данные пользователя в localStorage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('userName', data.user.name);
        localStorage.setItem('userFirstName', data.user.firstName);
        localStorage.setItem('userLastName', data.user.lastName);
        localStorage.setItem('userMiddleName', data.user.middleName);
        
        // Устанавливаем cookie для совместимости
        document.cookie = `auth-token=${data.token}; path=/; max-age=86400; samesite=lax`;
        console.log('🍪 Cookie установлен для совместимости');
        
        // Перенаправляем на нужную страницу
        console.log('🚀 Перенаправляем на:', redirectTo);
        console.log('🍪 Cookie установлен:', document.cookie.includes('auth-token'));
        
        // Используем window.location для принудительного обновления страницы
        window.location.href = redirectTo;
      } else {
        setError(data.error || 'Ошибка входа');
      }
    } catch (error) {
      console.error('❌ Ошибка логина:', error);
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-black">
            Domeo
          </Link>
          <span className="text-black text-lg font-bold mx-2">•</span>
          <span className="text-lg font-semibold text-black">Вход</span>
          <p className="mt-2 text-sm text-gray-600">
            Войдите в систему для доступа к конфигураторам
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-black">
                Пароль
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded text-white bg-black hover:bg-yellow-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-black transition-colors duration-200"
            >
              ← Вернуться на главную
            </Link>
          </div>
        </form>

        {/* Demo Credentials */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded">
          <h3 className="text-sm font-medium text-black mb-2">Демо-доступы:</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <div><strong>Админ:</strong> admin@domeo.ru / admin123</div>
            <div><strong>Комплектатор:</strong> complectator@domeo.ru / complectator123</div>
            <div><strong>Исполнитель:</strong> executor@domeo.ru / executor123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
