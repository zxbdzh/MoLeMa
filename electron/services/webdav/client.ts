import { createClient, WebDAVClient as DAVClient, FileStat } from 'webdav';
import { WebDAVConfig } from '@shared/types/electron';

export class WebDAVClient {
  private client: DAVClient | null = null;
  private config: WebDAVConfig | null = null;

  initialize(config: WebDAVConfig) {
    this.config = config;
    let url = config.serverUrl.trim();
    if (url && !url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    try {
      this.client = createClient(url, {
        username: config.username,
        password: config.password,
        authType: 'password'
      });
      console.log(`[WebDAV Client] Initialized with URL: ${url}`);
    } catch (error) {
      console.error('[WebDAV Client] Initialization failed:', error);
      this.client = null;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;
    try {
      // 优先尝试获取根目录内容
      await this.client.getDirectoryContents('/');
      return true;
    } catch (error: any) {
      console.error('[WebDAV Client] Connection test failed (Root):', error.message);
      
      // 如果根目录无法获取，尝试获取具体路径（如果已配置）
      try {
        if (this.config?.remoteConfigPath) {
            await this.client.exists(this.config.remoteConfigPath);
            return true;
        }
      } catch (innerError) {
        console.error('[WebDAV Client] Connection test failed (Config Path):', innerError);
      }
      
      return false;
    }
  }

  async exists(remotePath: string): Promise<boolean> {
    if (!this.client) return false;
    try {
        return await this.client.exists(remotePath);
    } catch (error) {
        console.error(`[WebDAV Client] Exists check failed for ${remotePath}:`, error);
        return false;
    }
  }

  async stat(remotePath: string): Promise<FileStat | null> {
    if (!this.client) return null;
    try {
      return (await this.client.stat(remotePath)) as FileStat;
    } catch {
      return null;
    }
  }

  async getDirectoryContents(remotePath: string): Promise<FileStat[]> {
    if (!this.client) return [];
    try {
      const contents = await this.client.getDirectoryContents(remotePath);
      return Array.isArray(contents) ? contents : [];
    } catch (error) {
      console.error(`[WebDAV Client] Failed to get directory contents: ${remotePath}`, error);
      return [];
    }
  }

  async putFileContents(remotePath: string, data: Buffer | string, options: { overwrite?: boolean } = {}): Promise<void> {
    if (!this.client) throw new Error('WebDAV client not initialized');
    
    // Ensure parent directory exists
    const parentDir = remotePath.split('/').slice(0, -1).join('/');
    if (parentDir && parentDir !== '/') {
      await this.ensureDirectory(parentDir);
    }

    await this.client.putFileContents(remotePath, data, { overwrite: options.overwrite !== false });
  }

  async getFileContents(remotePath: string): Promise<Buffer> {
    if (!this.client) throw new Error('WebDAV client not initialized');
    const content = await this.client.getFileContents(remotePath, { format: 'binary' });
    return content as Buffer;
  }

  async deleteFile(remotePath: string): Promise<void> {
    if (!this.client) return;
    if (await this.exists(remotePath)) {
      await this.client.deleteFile(remotePath);
    }
  }

  async ensureDirectory(remoteDirPath: string): Promise<void> {
    if (!this.client) return;
    const parts = remoteDirPath.split('/').filter(p => p);
    let currentPath = '';
    
    for (const part of parts) {
      currentPath += '/' + part;
      if (!(await this.client.exists(currentPath))) {
        await this.client.createDirectory(currentPath);
      }
    }
  }
}

export const webdavClient = new WebDAVClient();
