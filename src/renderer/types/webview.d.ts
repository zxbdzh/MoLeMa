// webview 元素的类型定义
declare global {
  interface HTMLWebViewElement extends HTMLElement {
    src: string;
    executeJavaScript(code: string): Promise<any>;
    reload(): void;
    goBack(): void;
    goForward(): void;
    canGoBack(): boolean;
    canGoForward(): boolean;
    addEventListener(event: string, callback: (e: any) => void): void;
    removeEventListener(event: string, callback: (e: any) => void): void;
  }

  interface Window {
    electronAPI?: any;
  }
}

export {};
