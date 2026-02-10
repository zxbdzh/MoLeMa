import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { getProxy } from '../../database';
import https from 'https';
import http from 'http';
import { URL } from 'url';

/**
 * 统一网络服务，处理代理、请求头等
 */
export const networkService = {
    /**
     * 获取当前代理配置
     * @param protocol 目标协议 'http:' | 'https:'
     */
    getProxyAgent(protocol: string): HttpsProxyAgent<string> | HttpProxyAgent<string> | undefined {
        const proxy = getProxy();
        if (proxy && proxy.enabled && proxy.url) {
            // 根据协议选择不同的 Agent
            if (protocol === 'https:') {
                return new HttpsProxyAgent(proxy.url);
            } else {
                return new HttpProxyAgent(proxy.url);
            }
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
     * 带代理支持的 Fetch 模拟 (自动选择 http 或 https 模块)
     */
    async proxyFetch(urlStr: string, options: any = {}): Promise<{ ok: boolean, status: number, text: () => Promise<string> }> {
        // 解析 URL 获取协议
        let urlObj: URL;
        try {
            urlObj = new URL(urlStr);
        } catch (e) {
            return Promise.reject(new Error(`Invalid URL: ${urlStr}`));
        }

        const protocol = urlObj.protocol; // 'http:' or 'https:'
        const agent = this.getProxyAgent(protocol);
        const headers = { ...this.getStandardHeaders(), ...options.headers };
        const timeout = options.timeout || 10000;

        // 根据协议选择请求模块
        const requestModule = protocol === 'https:' ? https : http;

        return new Promise((resolve, reject) => {
            try {
                const reqOptions = {
                    method: options.method || 'GET',
                    headers,
                    agent,
                    timeout
                };

                const req = requestModule.request(urlStr, reqOptions, (res) => {
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
