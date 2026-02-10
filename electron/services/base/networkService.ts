import { HttpsProxyAgent } from 'https-proxy-agent';
import { getProxy } from '../../database';
import https from 'https';

/**
 * 统一网络服务，处理代理、请求头等
 */
export const networkService = {
    /**
     * 获取当前代理配置
     */
    getProxyAgent(): HttpsProxyAgent<string> | undefined {
        const proxy = getProxy();
        if (proxy && proxy.enabled && proxy.url) {
            return new HttpsProxyAgent(proxy.url);
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
     * 带代理支持的 Fetch 模拟 (使用 https.request)
     */
    async proxyFetch(url: string, options: any = {}): Promise<{ ok: boolean, status: number, text: () => Promise<string> }> {
        const agent = this.getProxyAgent();
        const headers = { ...this.getStandardHeaders(), ...options.headers };
        const timeout = options.timeout || 10000;

        return new Promise((resolve, reject) => {
            try {
                const reqOptions = {
                    method: options.method || 'GET',
                    headers,
                    agent,
                    timeout
                };

                const req = https.request(url, reqOptions, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        resolve({
                            ok: res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false,
                            status: res.statusCode || 0,
                            text: async () => data
                        });
                    });
                });

                req.on('error', reject);
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Request timeout'));
                });
                req.end();
            } catch (e) {
                reject(e);
            }
        });
    }
};
