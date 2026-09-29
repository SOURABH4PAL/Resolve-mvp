export const TOKEN_STORAGE_KEY = 'resolvehub_access_token';

export interface ApiErrorResponse {
  detail?: string | Array<{ msg: string; loc?: string[] }>;
  message?: string;
}

export class ApiError extends Error {
  status: number;
  data?: ApiErrorResponse | unknown;

  constructor(status: number, message: string, data?: ApiErrorResponse | unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  isFormData?: boolean;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let body: BodyInit | undefined = undefined;

  if (options.isFormData) {
    // When using FormData, do not set Content-Type header so the browser sets the boundary
    body = options.body as FormData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = normalizedEndpoint.startsWith('/api') ? normalizedEndpoint : `/api${normalizedEndpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body,
    });

    if (response.status === 204) {
      return {} as T;
    }

    let responseData: unknown = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;
      if (typeof responseData === 'object' && responseData !== null) {
        const errorObj = responseData as ApiErrorResponse;
        if (typeof errorObj.detail === 'string') {
          errorMessage = errorObj.detail;
        } else if (Array.isArray(errorObj.detail)) {
          errorMessage = errorObj.detail.map(d => d.msg).join(', ');
        } else if (errorObj.message) {
          errorMessage = errorObj.message;
        }
      } else if (typeof responseData === 'string' && responseData.length > 0) {
        errorMessage = responseData;
      }

      if (response.status === 401) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.dispatchEvent(new Event('resolvehub:unauthorized'));
      }

      throw new ApiError(response.status, errorMessage, responseData);
    }

    return responseData as T;
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Network error or backend is unreachable.';
    throw new ApiError(0, message);
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'PUT', body }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),

  upload: <T>(endpoint: string, formData: FormData, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'POST', body: formData, isFormData: true }),
};
