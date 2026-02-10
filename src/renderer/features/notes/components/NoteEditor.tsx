import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Eye, EyeOff, Edit2, Trash2, FileText } from 'lucide-react';
import { Card3D } from '../../../components/ui/3DCard';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { Note } from '../../../hooks/useNotes';

interface NoteEditorProps {
  note: Note | null;
  onSave: (id: number, title: string, content: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Update local state when selected note changes
  useEffect(() => {
    if (note) {
      setEditTitle(note.title);
      setEditContent(note.content);
      setIsEditing(false); // Reset edit mode on note switch
    }
  }, [note]);

  const handleSave = async () => {
    if (note && editTitle.trim()) {
      await onSave(note.id, editTitle, editContent);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (note) {
      setEditTitle(note.title);
      setEditContent(note.content);
      setIsEditing(false);
    }
  };

  if (!note) {
    return (
      <Card3D className="p-8">
        <div className="text-center py-12 text-slate-500 dark:text-slate-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>选择一个笔记开始编辑</p>
        </div>
      </Card3D>
    );
  }

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('zh-CN');
  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <Card3D className="p-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                保存
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCancel}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium text-white transition-colors cursor-pointer"
              >
                取消
              </motion.button>
            </>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
              编辑
            </motion.button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium text-white flex items-center gap-2 transition-colors cursor-pointer"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? '隐藏预览' : '显示预览'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onDelete(note.id)}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg font-medium text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </motion.button>
        </div>
      </div>

      {/* 编辑器和预览区域 */}
      <div className={`grid gap-4 ${showPreview ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {/* 编辑器 */}
        <div className={`flex flex-col space-y-3 ${!showPreview ? 'min-h-[calc(100vh-300px)]' : ''}`}>
          <input
            type="text"
            value={isEditing ? editTitle : note.title}
            onChange={(e) => isEditing && setEditTitle(e.target.value)}
            disabled={!isEditing}
            placeholder="笔记标题"
            className={`bg-transparent text-xl font-bold dark:text-white text-slate-900 focus:outline-none placeholder-slate-500 dark:placeholder-slate-400 ${
              !isEditing ? 'disabled:opacity-70' : 'border-b border-blue-500/50'
            }`}
          />
          <textarea
            value={isEditing ? editContent : note.content}
            onChange={(e) => isEditing && setEditContent(e.target.value)}
            disabled={!isEditing}
            placeholder="开始书写... 支持 Markdown 语法"
            className={`flex-1 ${showPreview ? 'min-h-[400px]' : 'min-h-[calc(100vh-350px)]'} bg-slate-100 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700/50 rounded-lg p-4 dark:text-slate-200 text-slate-700 resize-none focus:outline-none focus:border-blue-500/50 custom-scrollbar font-mono text-sm transition-colors ${
              !isEditing ? 'disabled:opacity-70' : ''
            }`}
          />
        </div>

        {/* 预览区域 */}
        {showPreview && (
          <div className="flex flex-col min-h-[400px] bg-slate-100 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700/50 rounded-lg overflow-hidden">
            <div className="sticky top-0 bg-slate-200 dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-300 dark:border-slate-700/50 p-4 z-10">
              <h3 className="text-lg font-bold dark:text-white text-slate-900">
                {note.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                最后更新：{formatDate(note.updated_at)} {formatTime(note.updated_at)}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <MarkdownRenderer 
                content={isEditing ? editContent : note.content}
                className="dark:text-slate-200 text-slate-700"
              />
            </div>
          </div>
        )}
      </div>
    </Card3D>
  );
};

export default NoteEditor;
