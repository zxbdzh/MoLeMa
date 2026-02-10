/**
 * 同步相关的常量定义
 */

export const SYNC_CONSTANTS = {
    // 支持的录音扩展名
    AUDIO_EXTENSIONS: ['.wav', '.mp3', '.m4a', '.webm', '.ogg'],
    
    // 本地关键文件名
    FILE_NAMES: {
        CONFIG: 'moyu-data.json',
        DATABASE: 'moyu.db'
    },
    
    // 默认远端路径
    DEFAULT_REMOTE: {
        CONFIG_DIR: '/MoLeMa-config/',
        RECORDING_DIR: '/MoLeMa-recordings/'
    }
};
