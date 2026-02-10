import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, FileText, Calendar, Clock } from 'lucide-react';
import { Card3D } from '../../../components/ui/3DCard';
import { Note } from '../../../hooks/useNotes';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: number | null;
  onSelect: (note: Note) => void;
  onAdd: () => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes, selectedNoteId, onSelect, onAdd }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <Card3D className="p-4 space-y-4">
      {/* 新建笔记按钮 */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onAdd}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-colors"
      >
        <Plus className="w-5 h-5" />
        新建笔记
      </motion.button>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索笔记..."
          className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 placeholder-slate-500 dark:placeholder-slate-400 transition-colors"
        />
      </div>

      {/* 笔记列表 */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-500">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>还没有笔记</p>
            <p className="text-sm mt-2">点击"新建笔记"开始吧！</p>
          </div>
        ) : (
          filteredNotes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => onSelect(note)}
              className={`p-4 rounded-lg cursor-pointer transition-all border ${
                selectedNoteId === note.id
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
              }`}
            >
              <h3 className="font-bold mb-1 truncate">{note.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                {note.content.replace(/[#*`]/g, '').substring(0, 50)}...
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(note.updated_at)}</span>
                <Clock className="w-3 h-3 ml-auto" />
                <span>{formatTime(note.updated_at)}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </Card3D>
  );
};

export default NoteList;
