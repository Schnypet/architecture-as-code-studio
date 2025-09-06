import { environment } from '../../environments/environment';

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  enableLogging: boolean;
  endpoints: {
    architectures: string;
    validation: string;
    reload: string;
  };
}

export const API_CONFIG: ApiConfig = {
  baseUrl: environment.apiBaseUrl,
  timeout: environment.apiTimeout,
  enableLogging: environment.enableApiLogging,
  endpoints: {
    architectures: '/api/v1/architectures',
    validation: '/api/v1/architectures/{id}/validate',
    reload: '/api/v1/architectures/reload'
  }
};

// Environment-aware configuration getter
export const getApiConfig = (): ApiConfig => {
  return API_CONFIG;
};