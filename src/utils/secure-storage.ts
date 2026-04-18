import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const APP_NAME = 'mcp_desk_docs';

// Serializa escrituras de saveConfig para evitar perdidas por read-modify-write
// concurrente (ej. setRefreshToken + setOrgId disparados casi en paralelo).
let writeQueue: Promise<void> = Promise.resolve();

export interface SecureConfig {
  clientId: string;
  clientSecret: string;
  region: string;
  oauthScopes?: string[];
  refreshToken?: string;
  orgId?: string;
  defaultDepartmentId?: string;
  configuredAt: string;
  lastTokenRefresh?: string;
}

/**
 * Directorio de configuracion seguro segun OS.
 * - Windows: %APPDATA%/mcp_desk_docs/
 * - macOS: ~/Library/Application Support/mcp_desk_docs/
 * - Linux: ~/.config/mcp_desk_docs/ (o $XDG_CONFIG_HOME)
 */
export function getConfigDir(): string {
  const platform = process.platform;

  if (platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, APP_NAME);
  }

  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', APP_NAME);
  }

  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(xdgConfig, APP_NAME);
}

function getConfigFilePath(): string {
  return path.join(getConfigDir(), 'config.json');
}

async function ensureConfigDir(): Promise<void> {
  const dir = getConfigDir();
  await fs.mkdir(dir, { recursive: true });
}

export async function saveConfig(data: Partial<SecureConfig>): Promise<void> {
  const previous = writeQueue;
  let release!: () => void;
  writeQueue = new Promise<void>((resolve) => { release = resolve; });

  try {
    await previous.catch(() => {}); // No bloquear por fallos previos

    await ensureConfigDir();
    const configPath = getConfigFilePath();

    const existing = await loadConfig();
    const merged: SecureConfig = {
      clientId: data.clientId || existing?.clientId || '',
      clientSecret: data.clientSecret || existing?.clientSecret || '',
      region: data.region || existing?.region || 'com',
      oauthScopes: data.oauthScopes || existing?.oauthScopes,
      refreshToken: data.refreshToken !== undefined ? data.refreshToken : existing?.refreshToken,
      orgId: data.orgId !== undefined ? data.orgId : existing?.orgId,
      defaultDepartmentId: data.defaultDepartmentId !== undefined ? data.defaultDepartmentId : existing?.defaultDepartmentId,
      configuredAt: existing?.configuredAt || new Date().toISOString(),
      lastTokenRefresh: data.refreshToken ? new Date().toISOString() : existing?.lastTokenRefresh,
    };

    const jsonContent = JSON.stringify(merged, null, 2);
    await fs.writeFile(configPath, jsonContent, 'utf-8');

    if (process.platform !== 'win32') {
      try {
        await fs.chmod(configPath, 0o600);
      } catch (err: any) {
        // Filesystems sin soporte de permisos POSIX (NTFS, FAT, redes) lanzan
        // EPERM/ENOTSUP. Otros errores indican un problema real (disco lleno,
        // permisos del directorio, etc) y deben ser visibles.
        if (err?.code !== 'EPERM' && err?.code !== 'ENOTSUP' && err?.code !== 'EINVAL') {
          console.error(`[SecureStorage] WARNING: chmod failed: ${err.message}`);
        }
      }
    }

    console.error(`[SecureStorage] Config saved to: ${configPath}`);
  } finally {
    release();
  }
}

export async function loadConfig(): Promise<SecureConfig | null> {
  const configPath = getConfigFilePath();

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as SecureConfig;
  } catch (error: any) {
    if (error.code === 'ENOENT') return null;
    console.error(`[SecureStorage] Error loading config: ${error.message}`);
    return null;
  }
}

export async function clearConfig(): Promise<void> {
  const configPath = getConfigFilePath();

  try {
    await fs.unlink(configPath);
    console.error(`[SecureStorage] Config deleted: ${configPath}`);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`[SecureStorage] Error deleting config: ${error.message}`);
    }
  }
}

export async function isConfigured(): Promise<boolean> {
  const config = await loadConfig();
  return !!(config?.clientId && config?.clientSecret);
}

export async function hasStoredToken(): Promise<boolean> {
  const config = await loadConfig();
  return !!(config?.refreshToken && config.refreshToken.length > 0);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  const config = await loadConfig();
  return config?.refreshToken || null;
}

export async function saveRefreshToken(refreshToken: string): Promise<void> {
  await saveConfig({ refreshToken });
}

export async function saveOrgId(orgId: string): Promise<void> {
  await saveConfig({ orgId });
}

export async function getStoredOrgId(): Promise<string | null> {
  const config = await loadConfig();
  return config?.orgId || null;
}
