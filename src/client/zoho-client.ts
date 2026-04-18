import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ZohoDeskConfig,
  ZohoTokenResponse,
  ZohoDeskAPIResponse,
  ZohoDeskListResponse,
} from '../types/index.js';
import { saveRefreshToken, saveOrgId } from '../utils/secure-storage.js';

// OAuth helpers disponibles para tools
export { executeOAuthFlow, updateEnvFile, generateAuthUrl } from '../utils/oauth-helpers.js';
export { saveRefreshToken, saveOrgId } from '../utils/secure-storage.js';

// Rate limit: Zoho Desk tiene límites basados en créditos
const RATE_LIMIT_DELAY_MS = 500;

export class ZohoDeskClient {
  private config: ZohoDeskConfig;
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private lastRequestTime: number = 0;
  // Cola de peticiones para serializar requests simultáneas
  private requestQueue: Promise<any> = Promise.resolve();
  // Mutex para evitar múltiples refresh de token simultáneos
  private refreshPromise: Promise<void> | null = null;

  constructor(config: ZohoDeskConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: this.getApiBaseUrl(),
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      // Zoho Desk devuelve algunos IDs numericos largos que pierden precision con
      // JSON.parse default. Envolvemos enteros >=16 digitos como string antes de parsear.
      transformResponse: [
        (data: string) => {
          if (typeof data !== 'string' || data.length === 0) return data;
          try {
            const safe = data.replace(
              /([:\[,]\s*)(-?\d{16,})(\s*[,\]}])/g,
              '$1"$2"$3',
            );
            return JSON.parse(safe);
          } catch {
            try { return JSON.parse(data); } catch { return data; }
          }
        },
      ],
    });

    this.setupInterceptors();
  }

  /**
   * Encola una petición para ejecutarla secuencialmente.
   * Esto evita que peticiones simultáneas violen el rate limit de Zoho.
   */
  private async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const queuePosition = Date.now();
    console.error(`[ZohoDeskClient] Request queued (${queuePosition})`);

    // Crear una promesa que se resolverá cuando esta petición termine
    let resolveQueue: () => void;
    const queuePromise = new Promise<void>((resolve) => {
      resolveQueue = resolve;
    });

    // Esperar a que terminen las peticiones anteriores
    const previousQueue = this.requestQueue;
    this.requestQueue = queuePromise;

    try {
      // Esperar a la cola anterior (ignorando errores)
      await previousQueue.catch(() => {});

      // Aplicar rate limit
      await this.waitForRateLimit();

      console.error(`[ZohoDeskClient] Executing queued request (${queuePosition})`);

      // Ejecutar la petición
      const result = await fn();
      return result;
    } finally {
      // Liberar la cola para la siguiente petición
      resolveQueue!();
    }
  }

  private getApiBaseUrl(): string {
    return `https://desk.zoho.${this.config.region}/api/v1`;
  }

  private getAuthUrl(): string {
    return `https://accounts.zoho.${this.config.region}/oauth/v2/token`;
  }

  /**
   * Espera si es necesario para respetar el rate limit
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < RATE_LIMIT_DELAY_MS) {
      const waitTime = RATE_LIMIT_DELAY_MS - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      async config => {
        // Usar el access token en memoria si existe
        if (this.accessToken) {
          config.headers.Authorization = `Zoho-oauthtoken ${this.accessToken}`;
        }
        // Agregar orgId header requerido por Zoho Desk
        if (this.config.orgId) {
          config.headers.orgId = this.config.orgId;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        const httpStatus = error.response?.status;
        const data = error.response?.data as any;
        const errorCode = data?.errorCode;
        const url = error.config?.url || 'unknown';

        console.error(`[ZohoDeskClient] Request failed: ${error.config?.method?.toUpperCase()} ${url} - HTTP: ${httpStatus || 'network error'}, Code: ${errorCode || 'none'}`);

        // Errores de autenticación que requieren refresh token
        const authHttpErrors = [401, 403];

        if (authHttpErrors.includes(httpStatus!)) {
          console.error(`[ZohoDeskClient] Authentication error - Attempting token refresh...`);
          this.accessToken = null;
          this.tokenExpiresAt = 0;

          try {
            await this.refreshAccessToken();
            if (error.config) {
              console.error('[ZohoDeskClient] Retrying request with new token...');
              error.config.headers.Authorization = `Zoho-oauthtoken ${this.accessToken}`;
              return this.axiosInstance.request(error.config);
            }
          } catch (refreshError) {
            console.error('[ZohoDeskClient] Token refresh failed, cannot retry request');
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  private async refreshAccessToken(): Promise<void> {
    // Si ya hay un refresh en progreso, esperar a que termine
    if (this.refreshPromise) {
      console.error('[ZohoDeskClient] Waiting for existing refresh to complete...');
      await this.refreshPromise;
      return;
    }

    // Crear promesa de refresh
    this.refreshPromise = this._doRefreshToken();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _doRefreshToken(): Promise<void> {
    console.error('[ZohoDeskClient] Refreshing access token...');

    // Verificar que hay refresh token configurado
    if (!this.config.refreshToken || this.config.refreshToken.length === 0) {
      throw new Error('No refresh token configured. Please provide refresh_token parameter.');
    }

    try {
      const response = await axios.post<ZohoTokenResponse>(this.getAuthUrl(), null, {
        params: {
          refresh_token: this.config.refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'refresh_token',
        },
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
      const expiresInMin = Math.round(response.data.expires_in / 60);
      console.error(`[ZohoDeskClient] Access token refreshed successfully (expires in ${expiresInMin} min)`);
    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error);
      console.error(`[ZohoDeskClient] Failed to refresh token: ${errorMessage}`);
      throw new Error(`Failed to refresh Zoho access token: ${errorMessage}`);
    }
  }

  private formatError(error: AxiosError): Error {
    const message = this.getErrorMessage(error);
    return new Error(`Zoho Desk API Error: ${message}`);
  }

  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as any;
      return data?.message || data?.errorCode || data?.error || error.message;
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }

  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    return this.enqueue(async () => {
      const response = await this.axiosInstance.get<any>(path, { params });

      // Zoho Desk API puede devolver errores en el body
      if (response.data.errorCode) {
        throw new Error(response.data.message || response.data.errorCode);
      }

      return response.data as T;
    });
  }

  async getList<T>(path: string, params?: Record<string, any>): Promise<ZohoDeskListResponse<T>> {
    return this.enqueue(async () => {
      const response = await this.axiosInstance.get<any>(path, { params });

      // Si la respuesta es un array, envolverla
      if (Array.isArray(response.data)) {
        return { data: response.data } as ZohoDeskListResponse<T>;
      }

      return response.data;
    });
  }

  async post<T>(path: string, data?: any): Promise<T> {
    return this.enqueue(async () => {
      const response = await this.axiosInstance.post<any>(path, data);

      // Check for error responses
      if (response.data.errorCode) {
        throw new Error(response.data.message || response.data.errorCode);
      }

      return response.data as T;
    });
  }

  async put<T>(path: string, data?: any): Promise<T> {
    return this.enqueue(async () => {
      const response = await this.axiosInstance.put<any>(path, data);

      if (response.data.errorCode) {
        throw new Error(response.data.message || response.data.errorCode);
      }

      return response.data as T;
    });
  }

  async patch<T>(path: string, data?: any): Promise<T> {
    return this.enqueue(async () => {
      const response = await this.axiosInstance.patch<any>(path, data);

      if (response.data.errorCode) {
        throw new Error(response.data.message || response.data.errorCode);
      }

      return response.data as T;
    });
  }

  async delete(path: string): Promise<void> {
    return this.enqueue(async () => {
      const response = await this.axiosInstance.delete<any>(path);
      if (response.data?.errorCode) {
        throw new Error(response.data.message || response.data.errorCode);
      }
    });
  }

  getOrgId(): string {
    return this.config.orgId;
  }

  getDefaultDepartmentId(): string | undefined {
    return this.config.defaultDepartmentId;
  }

  setRefreshToken(refreshToken: string): void {
    const tokenLength = refreshToken?.length || 0;
    console.error(`[ZohoDeskClient] setRefreshToken called - length: ${tokenLength} chars`);

    if (tokenLength < 60) {
      console.error(`[ZohoDeskClient] WARNING: Token appears TRUNCATED (expected ~69 chars, got ${tokenLength})`);
    } else {
      console.error(`[ZohoDeskClient] Token format OK - preview: ${refreshToken.substring(0, 20)}...`);
    }

    if (this.config.refreshToken !== refreshToken) {
      this.config.refreshToken = refreshToken;
      this.accessToken = null;
      this.tokenExpiresAt = 0;
      console.error(`[ZohoDeskClient] Token updated in memory, access token invalidated`);

      saveRefreshToken(refreshToken).catch(err => {
        console.error(`[ZohoDeskClient] Failed to persist refresh token: ${err.message}`);
      });
    } else {
      console.error(`[ZohoDeskClient] Token unchanged, skipping update`);
    }
  }

  setOrgId(orgId: string): void {
    if (orgId && orgId.length > 0 && this.config.orgId !== orgId) {
      this.config.orgId = orgId;
      console.error(`[ZohoDeskClient] Org ID updated: ${orgId}`);

      saveOrgId(orgId).catch(err => {
        console.error(`[ZohoDeskClient] Failed to persist orgId: ${err.message}`);
      });
    }
  }

  getDefaultOrgId(): string | undefined {
    return this.config.defaultOrgId;
  }

  setDefaultOrgId(orgId: string): void {
    this.config.defaultOrgId = orgId;
    this.config.orgId = orgId;
    console.error(`[ZohoDeskClient] Default org ID set: ${orgId}`);

    saveOrgId(orgId).catch(err => {
      console.error(`[ZohoDeskClient] Failed to persist defaultOrgId: ${err.message}`);
    });
  }

  /**
   * Obtiene el refresh token actual
   */
  getRefreshToken(): string {
    return this.config.refreshToken;
  }
}
