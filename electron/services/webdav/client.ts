import { createClient, WebDAVClient as DAVClient, FileStat } from 'webdav';
import { WebDAVConfig } from '@shared/types/electron';

export class WebDAVClient {
  private client: DAVClient | null = null;
  private config: WebDAVConfig | null = null;

  initialize(config: WebDAVConfig) {
    this.config = config;
    this.client = createClient(config.serverUrl, {
      username: config.username,
      password: config.password,
    });
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.getDirectoryContents('/');
      return true;
    } catch (error) {
      console.error('[WebDAV Client] Connection test failed:', error);
      return false;
    }
  }

  async exists(remotePath: string): Promise<boolean> {
    if (!this.client) return false;
    return await this.client.exists(remotePath);
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
