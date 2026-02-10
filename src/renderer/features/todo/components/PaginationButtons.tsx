import React from 'react';

interface PaginationButtonsProps {
  currentPage: number;
  totalPages: number;
  maxVisible: number;
  onPageChange: (page: number) => void;
}

export function PaginationButtons({
  currentPage,
  totalPages,
  maxVisible,
  onPageChange
}: PaginationButtonsProps) {
  const pages = [];

  // 如果总页数小于等于最大显示数，显示所有页码
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
            currentPage === i
              ? 'bg-blue-500 text-white'
              : 'bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 text-slate-600 dark:text-slate-400 hover:bg-slate-700/50 dark:hover:bg-slate-700/50'
          }`}
        >
          {i}
        </button>
      );
    }
  } else {
    // 总页数超过最大显示数，使用省略号
    let startPage = Math.max(2, currentPage - Math.floor((maxVisible - 2) / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisible - 3);

    // 调整起始页，确保显示足够的页码
    if (endPage - startPage + 1 < maxVisible - 2) {
      startPage = Math.max(2, endPage - (maxVisible - 3));
    }

    // 第一页
    pages.push(
      <button
        key={1}
        onClick={() => onPageChange(1)}
        className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
          currentPage === 1
            ? 'bg-blue-500 text-white'
            : 'bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 text-slate-600 dark:text-slate-400 hover:bg-slate-700/50 dark:hover:bg-slate-700/50'
        }`}
      >
        1
      </button>
    );

    // 起始省略号
    if (startPage > 2) {
      pages.push(<span key="start-ellipsis" className="text-slate-400">...</span>);
    }

    // 中间页码
    for (let i = startPage; i <= endPage; i++) {
      if (i > 1 && i < totalPages) {
        pages.push(
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
              currentPage === i
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 text-slate-600 dark:text-slate-400 hover:bg-slate-700/50 dark:hover:bg-slate-700/50'
            }`}
          >
            {i}
          </button>
        );
      }
    }

    // 结束省略号
    if (endPage < totalPages - 1) {
      pages.push(<span key="end-ellipsis" className="text-slate-400">...</span>);
    }

    // 最后一页
    pages.push(
      <button
        key={totalPages}
        onClick={() => onPageChange(totalPages)}
        className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
          currentPage === totalPages
            ? 'bg-blue-500 text-white'
            : 'bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 text-slate-600 dark:text-slate-400 hover:bg-slate-700/50 dark:hover:bg-slate-700/50'
        }`}
      >
        {totalPages}
      </button>
    );
  }

  return <>{pages}</>;
}
