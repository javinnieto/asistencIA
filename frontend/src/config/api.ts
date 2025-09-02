// Configuración centralizada de la API
// En desarrollo, usar el proxy del package.json
// En producción, usar la variable de entorno o localhost
const API_BASE_URL = '/api';

// Función para hacer peticiones autenticadas
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('accessToken');
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  return fetch(url, config);
};

// Función específica para login (sin token)
export const loginRequest = async (username: string, password: string) => {
  return fetch(`${API_BASE_URL}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
};

export { API_BASE_URL };
