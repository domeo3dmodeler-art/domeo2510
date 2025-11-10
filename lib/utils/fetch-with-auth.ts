/**
 * Утилита для выполнения fetch запросов с автоматической передачей токенов авторизации
 */

/**
 * Выполняет fetch запрос с автоматической передачей токенов авторизации
 * @param url - URL для запроса
 * @param options - Опции для fetch (headers будут дополнены токенами)
 * @returns Promise<Response>
 */
export async function fetchWithAuth(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers as HeadersInit),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-auth-token'] = token;
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

/**
 * Выполняет fetch запрос с автоматической передачей токенов и парсингом JSON
 * @param url - URL для запроса
 * @param options - Опции для fetch
 * @returns Promise с распарсенными данными
 */
export async function fetchWithAuthJson<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetchWithAuth(url, options);
  return response.json() as Promise<T>;
}

