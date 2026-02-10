import { useState, useEffect, useCallback } from 'react';
import { useWindowVisibility } from './useWindowVisibility';

export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electronAPI.notes.getAll();
      if (result?.success && result.notes) {
        setNotes(result.notes as Note[]);
      } else {
        setError('Failed to load notes');
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
      setError('An error occurred while loading notes');
    } finally {
      setLoading(false);
    }
  }, []);

  // Window focus auto-refresh
  useWindowVisibility(loadNotes);

  // Initial load
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const addNote = async (title = '新笔记', content = '# 新笔记\n\n开始书写...') => {
    try {
      const result = await window.electronAPI.notes.create({ title, content });
      if (result?.success) {
        // Immediately load notes to refresh the list
        await loadNotes();
        
        // Construct and return the new note object based on result ID and input
        // This is safer than finding in state which might be stale
        return {
            id: result.id,
            title,
            content,
            created_at: Date.now(),
            updated_at: Date.now()
        } as Note;
      }
      return null;
    } catch (err) {
      console.error('Failed to add note:', err);
      return null;
    }
  };

  const updateNote = async (id: number, title: string, content: string) => {
    try {
      const result = await window.electronAPI.notes.update(id, { title, content });
      if (result?.success) {
        // Optimistic update
        setNotes(prev => prev.map(n => 
          n.id === id ? { ...n, title, content, updated_at: Date.now() } : n
        ));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update note:', err);
      return false;
    }
  };

  const deleteNote = async (id: number) => {
    try {
      const result = await window.electronAPI.notes.delete(id);
      if (result?.success) {
        setNotes(prev => prev.filter(n => n.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete note:', err);
      return false;
    }
  };

  return {
    notes,
    loading,
    error,
    loadNotes,
    addNote,
    updateNote,
    deleteNote
  };
};