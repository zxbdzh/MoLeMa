import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { useNotes, Note } from '../../hooks/useNotes';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';

export default function Notes() {
  const { notes, loading, addNote, updateNote, deleteNote } = useNotes();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Auto-select first note on load if none selected
  useEffect(() => {
    if (!selectedNote && notes.length > 0) {
      setSelectedNote(notes[0]);
    }
  }, [notes, selectedNote]);

  // Update selectedNote if the note in the list changes (e.g. after edit)
  useEffect(() => {
    if (selectedNote) {
      const updated = notes.find(n => n.id === selectedNote.id);
      if (updated && updated.updated_at !== selectedNote.updated_at) {
        setSelectedNote(updated);
      }
    }
  }, [notes]);

  const handleAddNote = async () => {
    const newNote = await addNote();
    if (newNote) {
      setSelectedNote(newNote as unknown as Note); // Type assertion if hook returns partial or different structure, but here it matches interface
    }
  };

  const handleDeleteNote = async (id: number) => {
    const success = await deleteNote(id);
    if (success && selectedNote?.id === id) {
      setSelectedNote(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-3xl font-bold dark:text-white text-slate-900 mb-2 flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-400" />
          笔记记事本
        </h2>
        <p className="text-slate-500 dark:text-slate-400">记录灵感，支持 Markdown</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <NoteList 
            notes={notes} 
            selectedNoteId={selectedNote?.id || null} 
            onSelect={setSelectedNote} 
            onAdd={handleAddNote} 
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <NoteEditor 
            note={selectedNote} 
            onSave={updateNote} 
            onDelete={handleDeleteNote} 
          />
        </motion.div>
      </div>
    </div>
  );
}