import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, SkipForward, RotateCcw, Download, X } from 'lucide-react';

interface ConflictItem {
  localPath: string;
  remotePath: string;
  localMtime: number;
  remoteMtime: number;
  size: number;
  type: 'config' | 'database' | 'recording';
}

interface ConflictDialogProps {
  isOpen: boolean;
  conflicts: ConflictItem[];
  fileActions: Map<string, 'overwrite' | 'skip' | 'rename'>;
  onSetFileAction: (remotePath: string, action: 'overwrite' | 'skip' | 'rename') => void;
  onSelectAll: (action: 'overwrite' | 'skip' | 'rename') => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getFileTypeIcon = (type: 'config' | 'database' | 'recording') => {
  switch (type) {
    case 'config':
      return <AlertTriangle className="w-4 h-4 text-blue-500" />;
    case 'database':
      return <AlertTriangle className="w-4 h-4 text-green-500" />;
    case 'recording':
      return <AlertTriangle className="w-4 h-4 text-purple-500" />;
  }
};

const ConflictDialog: React.FC<ConflictDialogProps> = ({
  isOpen,
  conflicts,
  fileActions,
  onSetFileAction,
  onSelectAll,
  onConfirm,
  onCancel
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4"
            onClick={onCancel}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4 p-5 border-b border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-bold dark:text-white text-slate-900">文件冲突处理</h3>
                <button
                  onClick={onCancel}
                  className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  发现 {conflicts.length} 个文件冲突，请选择处理方式：
                </p>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => onSelectAll('overwrite')}
                    className="flex-1 px-3 py-2 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-200 rounded-lg text-sm flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-3 h-3" />
                    全部覆盖
                  </button>
                  <button
                    onClick={() => onSelectAll('skip')}
                    className="flex-1 px-3 py-2 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-lg text-sm flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <SkipForward className="w-3 h-3" />
                    全部跳过
                  </button>
                  <button
                    onClick={() => onSelectAll('rename')}
                    className="flex-1 px-3 py-2 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-200 rounded-lg text-sm flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    全部重命名
                  </button>
                </div>

                <div className="space-y-3 mb-6">
                  {conflicts.map((conflict, index) => {
                    const action = fileActions.get(conflict.remotePath) || 'overwrite';
                    return (
                      <div
                        key={index}
                        className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          {getFileTypeIcon(conflict.type)}
                          <div className="flex-1">
                            <div className="text-sm font-medium dark:text-white text-slate-900">
                              {conflict.remotePath.split('/').pop()}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              大小: {formatFileSize(conflict.size)}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => onSetFileAction(conflict.remotePath, 'overwrite')}
                            className={`flex-1 px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                              action === 'overwrite'
                                ? 'bg-red-500 text-white'
                                : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800'
                            }`}
                          >
                            <ArrowRight className="w-3 h-3" />
                            覆盖本地
                          </button>
                          <button
                            onClick={() => onSetFileAction(conflict.remotePath, 'skip')}
                            className={`flex-1 px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                              action === 'skip'
                                ? 'bg-blue-500 text-white'
                                : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
                            }`}
                          >
                            <SkipForward className="w-3 h-3" />
                            跳过
                          </button>
                          <button
                            onClick={() => onSetFileAction(conflict.remotePath, 'rename')}
                            className={`flex-1 px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                              action === 'rename'
                                ? 'bg-green-500 text-white'
                                : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                            }`}
                          >
                            <RotateCcw className="w-3 h-3" />
                            重命名下载
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-5 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 dark:text-white text-slate-700 font-medium text-sm transition-all duration-200 cursor-pointer rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    onClick={onConfirm}
                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm transition-all duration-200 cursor-pointer rounded-lg shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    确认下载
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConflictDialog;
