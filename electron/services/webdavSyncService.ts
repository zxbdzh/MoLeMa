import { createClient, WebDAVClient } from 'webdav';
import { app, BrowserWindow } from 'electron';
import { existsSync, readFileSync, writeFileSync, statSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname, basename } from 'path';
import Store from 'electron-store';

let mainWindow: BrowserWindow | null = null;

export function setMainWindow(window: BrowserWindow | null) {
  mainWindow = window;
}

const packageJsonPath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const appName = packageJson.name.replace(/-app$/, '');

const webdavStore = new Store({ name: "moyu-data" });

export interface WebDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
  remoteConfigPath: string;
  remoteRecordingPath: string;
  enableSyncConfig: boolean;
  enableSyncDatabase: boolean;
  enableSyncRecordings: boolean;
  syncMode: 'manual' | 'scheduled';
  enableScheduledSync: boolean;
  scheduledSyncInterval: number;
  scheduledSyncType: 'all' | 'config' | 'database' | 'recordings';
  debounceTime: number;
  lastSyncTime: number;
  nextSyncTime: number;
}

export interface ConflictItem {
  localPath: string;
  remotePath: string;
  localMtime: number;
  remoteMtime: number;
  size: number;
  type: 'config' | 'database' | 'recording';
}

export interface DownloadOptions {
  overwrite: string[];
  skip: string[];
  rename: string[];
}

export interface RemoteFile {
  path: string;
  name: string;
  size: number;
  mtime: number;
  type: 'config' | 'database' | 'recording';
}

let client: WebDAVClient | null = null;
let config: WebDAVConfig | null = null;
let isSyncing = false;
let syncLogs: string[] = [];

function addLog(message: string): void {
  const timestamp = new Date().toLocaleString();
  const logEntry = `[${timestamp}] ${message}`;
  syncLogs.push(logEntry);
  if (syncLogs.length > 100) {
    syncLogs = syncLogs.slice(-100);
  }
  console.log(`[WebDAV] ${logEntry}`);

  // 通知渲染进程更新日志
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('webdav:logUpdate', {
      logs: syncLogs.slice(-20),
      newLog: logEntry
    });
  }
}

export async function initializeWebDAV(webdavConfig: WebDAVConfig): Promise<boolean> {
  try {
    const defaultConfig = {
      serverUrl: '',
      username: '',
      password: '',
      remoteConfigPath: `/${appName}-config/`,
      remoteRecordingPath: `/${appName}-recordings/`,
      enableSyncConfig: true,
      enableSyncDatabase: true,
      enableSyncRecordings: true,
      syncMode: 'manual' as 'manual' | 'scheduled',
      enableScheduledSync: false,
      scheduledSyncInterval: 30,
      scheduledSyncType: 'all' as 'all' | 'config' | 'database' | 'recordings',
      debounceTime: 5,
      lastSyncTime: 0,
      nextSyncTime: 0,
    };

    config = { ...defaultConfig, ...webdavConfig };
    client = createClient(config.serverUrl, {
      username: config.username,
      password: config.password,
    });
    addLog('WebDAV 客户端初始化成功');
    return true;
  } catch (error) {
    addLog(`WebDAV 客户端初始化失败: ${error}`);
    return false;
  }
}

export async function testConnection(): Promise<boolean> {
  if (!client) {
    addLog('WebDAV 客户端未初始化');
    return false;
  }

  try {
    addLog('正在测试连接...');
    await client.getDirectoryContents('/');
    addLog('连接测试成功');
    return true;
  } catch (error) {
    addLog(`连接测试失败: ${error}`);
    return false;
  }
}

export function getConfig(): WebDAVConfig | null {
  return config;
}

export function getSyncLogs(): string[] {
  return [...syncLogs];
}

async function deleteRemoteFile(remotePath: string): Promise<boolean> {
  if (!client) {
    return false;
  }

  try {
    const exists = await client.exists(remotePath);
    if (exists) {
      await client.deleteFile(remotePath);
      addLog(`删除远程文件: ${remotePath}`);
    }
    return true;
  } catch (error) {
    addLog(`删除远程文件失败: ${remotePath} - ${error}`);
    return false;
  }
}

async function getRemoteFileMtime(remotePath: string): Promise<number> {
  if (!client) {
    return 0;
  }

  try {
    const exists = await client.exists(remotePath);
    if (!exists) {
      return 0;
    }

    const remoteStat = await client.stat(remotePath);
    const remoteStatData = remoteStat as any;
    return remoteStatData.lastmod ? new Date(remoteStatData.lastmod).getTime() : 0;
  } catch (error) {
    return 0;
  }
}

async function compareAndSyncFile(localPath: string, remotePath: string): Promise<boolean> {
  if (!client) {
    return false;
  }

  try {
    const localExists = existsSync(localPath);
    const remoteExists = await client.exists(remotePath);

    addLog(`[对比] ${basename(localPath || remotePath)} - 本地存在:${localExists}, 远程存在:${remoteExists}`);

    // 本地和远程都不存在
    if (!localExists && !remoteExists) {
      return true;
    }

    // 只有本地存在 → 直接上传
    if (localExists && !remoteExists) {
      addLog(`文件仅本地存在，上传: ${basename(localPath)}`);
      return await uploadFile(localPath, remotePath);
    }

    // 只有远程存在 → 删除远程
    if (!localExists && remoteExists) {
      addLog(`文件仅远程存在，删除: ${basename(remotePath)}`);
      return await deleteRemoteFile(remotePath);
    }

    // 两边都存在 → 对比 mtime
    const localStat = statSync(localPath);
    const localMtime = localStat.mtimeMs;
    const remoteMtime = await getRemoteFileMtime(remotePath);

    if (localMtime > remoteMtime) {
      addLog(`本地文件较新，上传: ${basename(localPath)}`);
      return await uploadFile(localPath, remotePath);
    } else if (remoteMtime > localMtime) {
      addLog(`远端文件较新，但以本地为主，上传: ${basename(localPath)}`);
      return await uploadFile(localPath, remotePath);
    } else {
      addLog(`文件已是最新，跳过: ${basename(localPath)}`);
      return true;
    }
  } catch (error) {
    addLog(`文件同步失败: ${localPath} - ${error}`);
    return false;
  }
}

async function uploadFile(localPath: string, remotePath: string): Promise<boolean> {
  if (!client) {
    return false;
  }

  try {
    addLog(`上传文件: ${localPath} -> ${remotePath}`);
    const content = readFileSync(localPath);
    await client.putFileContents(remotePath, content, { overwrite: true });
    addLog(`上传成功: ${basename(localPath)}`);
    return true;
  } catch (error) {
    addLog(`上传失败: ${localPath} - ${error}`);
    return false;
  }
}

export async function syncConfig(): Promise<boolean> {
  if (!config || !client) {
    return false;
  }

  if (config.enableSyncConfig === false) {
    addLog('配置上传已禁用，跳过');
    return true;
  }

  try {
    addLog('开始智能同步配置文件...');
    const userDataPath = app.getPath('userData');

    const localConfigPath = join(userDataPath, 'moyu-data.json');
    const localDbPath = join(userDataPath, 'moyu.db');

    const remoteConfigPath = config.remoteConfigPath + 'moyu-data.json';
    const remoteDbPath = config.remoteConfigPath + 'moyu.db';

    addLog(`远程配置目录: ${config.remoteConfigPath}`);

    let success = true;

    if (existsSync(localConfigPath)) {
      success = success && await compareAndSyncFile(localConfigPath, remoteConfigPath);
    } else {
      // 本地没有，删除远程
      await deleteRemoteFile(remoteConfigPath);
    }

    if (existsSync(localDbPath)) {
      success = success && await compareAndSyncFile(localDbPath, remoteDbPath);
    } else {
      // 本地没有，删除远程
      await deleteRemoteFile(remoteDbPath);
    }

    addLog('配置文件智能同步完成');
    return success;
  } catch (error) {
    addLog(`配置文件同步失败: ${error}`);
    return false;
  }
}

export async function syncDatabase(): Promise<boolean> {
  if (!config || !client) {
    return false;
  }

  if (config.enableSyncDatabase === false) {
    addLog('数据库上传已禁用，跳过');
    return true;
  }

  try {
    addLog('开始智能同步数据库...');
    const userDataPath = app.getPath('userData');
    const localDbPath = join(userDataPath, 'moyu.db');
    const remoteDbPath = config.remoteConfigPath + 'moyu.db';

    if (existsSync(localDbPath)) {
      await compareAndSyncFile(localDbPath, remoteDbPath);
    } else {
      // 本地没有，删除远程
      await deleteRemoteFile(remoteDbPath);
    }

    addLog('数据库智能同步完成');
    return true;
  } catch (error) {
    addLog(`数据库同步失败: ${error}`);
    return false;
  }
}

export async function syncRecordings(): Promise<boolean> {
  if (!config || !client) {
    return false;
  }

  if (config.enableSyncRecordings === false) {
    addLog('录音上传已禁用，跳过');
    return true;
  }

  try {
    addLog('开始智能同步录音文件...');

    const recordingsPath = webdavStore.get("recordings.savePath") as string || app.getPath('documents');
    addLog(`录音本地目录: ${recordingsPath}`);

    if (!existsSync(recordingsPath)) {
      addLog('录音目录不存在，检查远程目录...');
      // 尝试删除远程所有文件
      try {
        const remoteContents = await client.getDirectoryContents(config.remoteRecordingPath);
        const contents = Array.isArray(remoteContents) ? remoteContents : (remoteContents as any).data || [];
        const audioExtensions = ['.wav', '.mp3', '.m4a', '.webm', '.ogg'];
        const remoteFiles = contents.map((item: any) => basename(item.filename)).filter((file: string) =>
          audioExtensions.some(ext => file.toLowerCase().endsWith(ext))
        );

        if (remoteFiles.length > 0) {
          addLog(`远程发现 ${remoteFiles.length} 个文件，将全部删除`);
          for (const file of remoteFiles) {
            const remotePath = config.remoteRecordingPath + file;
            await deleteRemoteFile(remotePath);
          }
        } else {
          addLog('远程目录也是空的');
        }
      } catch (error) {
        addLog(`远程目录不存在或无法访问: ${error}`);
      }
      return true;
    }

    // 获取本地音频文件
    const files = readdirSync(recordingsPath);
    const audioExtensions = ['.wav', '.mp3', '.m4a', '.webm', '.ogg'];
    const localFiles = files.filter(file =>
      audioExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );

    addLog(`本地发现 ${localFiles.length} 个音频文件`);

    // 获取远程目录内容
    let remoteFiles: string[] = [];
    try {
      const remoteContents = await client.getDirectoryContents(config.remoteRecordingPath);
      // 处理不同的返回类型
      const contents = Array.isArray(remoteContents) ? remoteContents : (remoteContents as any).data || [];
      remoteFiles = contents.map((item: any) => basename(item.filename)).filter((file: string) =>
        audioExtensions.some(ext => file.toLowerCase().endsWith(ext))
      );
      addLog(`远程发现 ${remoteFiles.length} 个音频文件`);
    } catch (error) {
      addLog(`远程目录不存在或无法访问: ${error}`);
    }

    // 合并所有需要处理的文件
    const allFiles = Array.from(new Set([...localFiles, ...remoteFiles]));
    addLog(`共需处理 ${allFiles.length} 个文件`);

    let success = true;

    for (const file of allFiles) {
      const localPath = join(recordingsPath, file);
      const remotePath = config.remoteRecordingPath + file;
      const result = await compareAndSyncFile(localPath, remotePath);
      success = success && result;
    }

    addLog('录音文件智能同步完成');
    return success;
  } catch (error) {
    addLog(`录音文件同步失败: ${error}`);
    return false;
  }
}

export async function syncAll(): Promise<boolean> {
  if (isSyncing) {
    addLog('已有同步任务在进行中，跳过');
    return false;
  }

  if (!config) {
    addLog('config 为 null，从 store 读取配置');
    const store = new Store({ name: "moyu-data" });
    const storedConfig = store.get("webdav.config") as WebDAVConfig;
    if (storedConfig) {
      config = storedConfig;
      addLog(`从 store 加载配置: serverUrl=${config.serverUrl}, username=${config.username}`);
    } else {
      addLog('store 中没有 WebDAV 配置');
      return false;
    }
  }

  if (!client && config) {
    addLog('WebDAV 客户端未初始化，正在初始化...');
    addLog(`配置信息: serverUrl=${config.serverUrl}, username=${config.username}`);
    const result = await initializeWebDAV(config);
    if (!result) {
      addLog('WebDAV 客户端初始化失败');
    } else {
      addLog('WebDAV 客户端初始化成功');
    }
  }

  if (!client) {
    addLog('WebDAV 客户端初始化失败，无法上传');
    return false;
  }

  isSyncing = true;

  try {
    let success = true;

    const shouldSyncConfig = config?.enableSyncConfig !== false;
    const shouldSyncDatabase = config?.enableSyncDatabase !== false;
    const shouldSyncRecordings = config?.enableSyncRecordings !== false;

    if (shouldSyncConfig) {
      addLog('同步配置文件中...');
      const result = await syncConfig();
      success = success && result;
      addLog(`配置文件同步${result ? '成功' : '失败'}`);
    }

    if (shouldSyncDatabase) {
      addLog('同步数据库中...');
      const result = await syncDatabase();
      success = success && result;
      addLog(`数据库同步${result ? '成功' : '失败'}`);
    }

    if (shouldSyncRecordings) {
      addLog('同步录音文件中...');
      const result = await syncRecordings();
      success = success && result;
      addLog(`录音文件同步${result ? '成功' : '失败'}`);
    }

    if (success && config) {
      config.lastSyncTime = Date.now();
      const store = new Store({ name: "moyu-data" });
      store.set("webdav.config", config);
      const syncTime = new Date(config.lastSyncTime).toLocaleString();
      addLog(`同步完成，时间: ${syncTime}`);
    } else {
      addLog('同步完成（部分失败）');
    }

    return success;
  } catch (error) {
    addLog(`上传失败: ${error}`);
    return false;
  } finally {
    isSyncing = false;
  }
}

function ensureDirectoryExistence(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    try {
      require('fs').mkdirSync(dir, { recursive: true });
    } catch (error) {
      // 忽略已存在的错误
    }
  }
}

async function downloadFile(remotePath: string, localPath: string): Promise<boolean> {
  if (!client) {
    addLog('WebDAV 客户端未初始化');
    return false;
  }

  try {
    addLog(`下载文件: ${remotePath} -> ${localPath}`);
    ensureDirectoryExistence(localPath);
    const content = await client.getFileContents(remotePath, { format: 'binary' });
    writeFileSync(localPath, content as Buffer);
    addLog(`下载成功: ${basename(remotePath)}`);
    return true;
  } catch (error) {
    addLog(`下载失败: ${remotePath} - ${error}`);
    return false;
  }
}

export async function listRemoteFiles(): Promise<RemoteFile[]> {
  if (!client) {
    addLog('WebDAV 客户端未初始化');
    return [];
  }

  try {
    addLog('开始列出远程文件...');
    const files: RemoteFile[] = [];

    if (!config) {
      addLog('配置为空');
      return [];
    }

    const audioExtensions = ['.wav', '.mp3', '.m4a', '.webm', '.ogg'];

    if (config.enableSyncConfig) {
      try {
        const remoteConfigPath = config.remoteConfigPath + 'moyu-data.json';
        const exists = await client.exists(remoteConfigPath);
        if (exists) {
          const stat = await client.stat(remoteConfigPath);
          const statData = stat as any;
          files.push({
            path: remoteConfigPath,
            name: 'moyu-data.json',
            size: statData.size || 0,
            mtime: statData.lastmod ? new Date(statData.lastmod).getTime() : 0,
            type: 'config',
          });
        }
      } catch (error) {
        addLog(`获取配置文件信息失败: ${error}`);
      }

      try {
        const remoteDbPath = config.remoteConfigPath + 'moyu.db';
        const exists = await client.exists(remoteDbPath);
        if (exists) {
          const stat = await client.stat(remoteDbPath);
          const statData = stat as any;
          files.push({
            path: remoteDbPath,
            name: 'moyu.db',
            size: statData.size || 0,
            mtime: statData.lastmod ? new Date(statData.lastmod).getTime() : 0,
            type: 'database',
          });
        }
      } catch (error) {
        addLog(`获取数据库文件信息失败: ${error}`);
      }
    }

    if (config.enableSyncRecordings) {
      try {
        const remoteContents = await client.getDirectoryContents(config.remoteRecordingPath);
        const contents = Array.isArray(remoteContents) ? remoteContents : (remoteContents as any).data || [];
        for (const item of contents) {
          if (audioExtensions.some(ext => item.basename.toLowerCase().endsWith(ext))) {
            const stat = item as any;
            files.push({
              path: item.filename,
              name: item.basename,
              size: stat.size || 0,
              mtime: stat.lastmod ? new Date(stat.lastmod).getTime() : 0,
              type: 'recording',
            });
          }
        }
      } catch (error) {
        addLog(`获取录音文件列表失败: ${error}`);
      }
    }

    addLog(`找到 ${files.length} 个远程文件`);
    return files;
  } catch (error) {
    addLog(`列出远程文件失败: ${error}`);
    return [];
  }
}

export async function checkConflicts(): Promise<ConflictItem[]> {
  if (!client || !config) {
    addLog('WebDAV 客户端未初始化或配置为空');
    return [];
  }

  try {
    addLog('开始检查文件冲突...');
    const conflicts: ConflictItem[] = [];
    const remoteFiles = await listRemoteFiles();

    const userDataPath = app.getPath('userData');
    const recordingsPath = webdavStore.get("recordings.savePath") as string || app.getPath('documents');

    for (const remoteFile of remoteFiles) {
      let localPath: string;

      if (remoteFile.type === 'config') {
        localPath = join(userDataPath, remoteFile.name);
      } else if (remoteFile.type === 'database') {
        localPath = join(userDataPath, remoteFile.name);
      } else {
        localPath = join(recordingsPath, remoteFile.name);
      }

      if (existsSync(localPath)) {
        const localStat = statSync(localPath);
        const localMtime = localStat.mtimeMs;

        if (Math.abs(localMtime - remoteFile.mtime) > 1000) {
          conflicts.push({
            localPath,
            remotePath: remoteFile.path,
            localMtime,
            remoteMtime: remoteFile.mtime,
            size: remoteFile.size,
            type: remoteFile.type,
          });
        }
      }
    }

    addLog(`发现 ${conflicts.length} 个冲突文件`);
    return conflicts;
  } catch (error) {
    addLog(`检查冲突失败: ${error}`);
    return [];
  }
}

export async function downloadAll(options: DownloadOptions): Promise<boolean> {
  if (isSyncing) {
    addLog('已有同步任务在进行中，跳过');
    return false;
  }

  if (!config) {
    addLog('config 为 null，从 store 读取配置');
    const store = new Store({ name: "moyu-data" });
    const storedConfig = store.get("webdav.config") as WebDAVConfig;
    if (storedConfig) {
      config = storedConfig;
      addLog(`从 store 加载配置: serverUrl=${config.serverUrl}, username=${config.username}`);
    } else {
      addLog('store 中没有 WebDAV 配置');
      return false;
    }
  }

  if (!client && config) {
    addLog('WebDAV 客户端未初始化，正在初始化...');
    addLog(`配置信息: serverUrl=${config.serverUrl}, username=${config.username}`);
    const result = await initializeWebDAV(config);
    if (!result) {
      addLog('WebDAV 客户端初始化失败');
      return false;
    }
  }

  if (!client) {
    addLog('WebDAV 客户端初始化失败，无法下载');
    return false;
  }

  isSyncing = true;

  try {
    addLog('开始从远程下载数据...');
    const remoteFiles = await listRemoteFiles();

    if (remoteFiles.length === 0) {
      addLog('远程没有文件可下载');
      return true;
    }

    let success = true;
    let downloadCount = 0;
    let skipCount = 0;
    let overwriteCount = 0;
    let renameCount = 0;

    const userDataPath = app.getPath('userData');
    const recordingsPath = webdavStore.get("recordings.savePath") as string || app.getPath('documents');

    for (const remoteFile of remoteFiles) {
      let localPath: string;

      if (remoteFile.type === 'config') {
        localPath = join(userDataPath, remoteFile.name);
      } else if (remoteFile.type === 'database') {
        localPath = join(userDataPath, remoteFile.name);
      } else {
        localPath = join(recordingsPath, remoteFile.name);
      }

      const localExists = existsSync(localPath);

      if (!localExists) {
        addLog(`下载新文件: ${remoteFile.name}`);
        const result = await downloadFile(remoteFile.path, localPath);
        success = success && result;
        if (result) {
          downloadCount++;
        }
      } else {
        if (options.skip.includes(remoteFile.path)) {
          addLog(`跳过文件: ${remoteFile.name}`);
          skipCount++;
          continue;
        }

        if (options.overwrite.includes(remoteFile.path)) {
          addLog(`覆盖本地文件: ${remoteFile.name}`);
          const result = await downloadFile(remoteFile.path, localPath);
          success = success && result;
          if (result) {
            overwriteCount++;
          }
          continue;
        }

        if (options.rename.includes(remoteFile.path)) {
          const ext = remoteFile.name.includes('.') ? remoteFile.name.substring(remoteFile.name.lastIndexOf('.')) : '';
          const newName = remoteFile.name.replace(ext, `_远程${ext}`);
          const newPath = join(dirname(localPath), newName);
          addLog(`重命名下载: ${remoteFile.name} -> ${newName}`);
          const result = await downloadFile(remoteFile.path, newPath);
          success = success && result;
          if (result) {
            renameCount++;
          }
          continue;
        }

        addLog(`文件已存在且未指定操作，跳过: ${remoteFile.name}`);
        skipCount++;
      }
    }

    addLog(`下载完成: 新下载 ${downloadCount} 个, 覆盖 ${overwriteCount} 个, 重命名 ${renameCount} 个, 跳过 ${skipCount} 个`);

    if (success) {
      addLog('所有文件下载成功，请重启应用以应用更改');
    }

    return success;
  } catch (error) {
    addLog(`下载失败: ${error}`);
    return false;
  } finally {
    isSyncing = false;
  }
}
