import { HttpsProxyAgent } from 'https-proxy-agent';
import { getProxy } from '../../database';

/**
 * 统一网络服务，处理代理、请求头等
 */
export const networkService = {
    /**
     * 获取当前代理代理
     */
    getProxyAgent(): HttpsProxyAgent<string> | undefined {
        const proxyUrl = getProxy();
        if (proxyUrl) {
            return new HttpsProxyAgent(proxyUrl);
        }
        return undefined;
    },

    /**
     * 获取标准请求头
     */
    getStandardHeaders(): Record<string, string> {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        };
    },

    /**
     * 带代理支持的 Fetch
     */
    async proxyFetch(url: string, options: any = {}): Promise<Response> {
        const agent = this.getProxyAgent();
        const headers = { ...this.getStandardHeaders(), ...options.headers };
        
        return fetch(url, {
            ...options,
            headers,
            agent: agent // Node-fetch 支持 agent，原生 fetch 在较新版本 Node 中可能需要额外处理
        });
    }
};
