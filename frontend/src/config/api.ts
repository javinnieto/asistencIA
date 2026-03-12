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

export const getConflictos = async () => {
  return apiRequest('/conflictos/?resuelto=false');
};

export const ignorarConflicto = async (id: number) => {
  return apiRequest(`/conflictos/${id}/ignorar/`, { method: 'POST' });
};

export const aceptarConflicto = async (id: number) => {
  return apiRequest(`/conflictos/${id}/aceptar_cambio/`, { method: 'POST' });
};

export const actualizarNombreConflicto = async (id: number, data: { nombre?: string; apellido?: string }) => {
  return apiRequest(`/conflictos/${id}/actualizar_nombre/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const eliminarPersona = async (id: number | string) => {
  return apiRequest(`/personas/${id}/`, { method: 'DELETE' });
};

export const eliminarDuplicado = async (idConflicto: number, idPersonaNueva: number) => {
  return apiRequest(`/conflictos/${idConflicto}/eliminar_duplicado/`, {
    method: 'POST',
    body: JSON.stringify({ id_persona_nueva: idPersonaNueva }),
  });
};

export { API_BASE_URL };
