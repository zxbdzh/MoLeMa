import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '../styles/markdown.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = ''
}) => {
  // 检测当前主题
  const isDark = document.documentElement.classList.contains('dark');
  const codeTheme = isDark ? vscDarkPlus : oneLight;

  return (
    <div className={`markdown-preview ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 代码块处理
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            // 如果没有 language 类，说明是行内代码
            if (!match) {
              return <code {...props} className={className}>{children}</code>;
            }
            
            return (
              <SyntaxHighlighter
                style={codeTheme}
                language={language}
                PreTag="div"
                customStyle={{
                  borderRadius: '0.5rem',
                  margin: '1rem 0',
                  backgroundColor: isDark ? '#1e1e1e' : '#f1f5f9',
                  border: isDark ? '1px solid #3f3f46' : '1px solid #e2e8f0',
                }}
                codeTagProps={{
                  style: {
                    color: isDark ? '#d4d4d4' : '#334155',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  }
                }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          },

          // 标题处理
          h1: ({ children }) => <h1>{children}</h1>,
          h2: ({ children }) => <h2>{children}</h2>,
          h3: ({ children }) => <h3>{children}</h3>,
          h4: ({ children }) => <h4>{children}</h4>,
          h5: ({ children }) => <h5>{children}</h5>,
          h6: ({ children }) => <h6>{children}</h6>,

          // 段落处理
          p: ({ children }) => <p>{children}</p>,

          // 列表处理
          ul: ({ children }) => <ul>{children}</ul>,
          ol: ({ children }) => <ol>{children}</ol>,
          li: ({ children }) => <li>{children}</li>,

          // 引用处理
          blockquote: ({ children }) => <blockquote>{children}</blockquote>,

          // 链接处理
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),

          // 图片处理
          img: ({ src, alt }) => <img src={src} alt={alt} />,

          // 分隔线处理
          hr: () => <hr />,

          // 表格处理
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => <th>{children}</th>,
          td: ({ children }) => <td>{children}</td>,

          // 任务列表处理
          input: ({ checked, type, ...props }) => (
            <input type="checkbox" checked={checked} readOnly {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
