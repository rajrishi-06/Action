import React, { useState } from 'react';
import { useTodo } from '../context/TodoContext';
import { generateTaskSuggestions } from '../utils/geminiAI';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, Loader2, X } from 'lucide-react';

export const AISuggestions = () => {
  const { tasks, addTask } = useTodo();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const recentTasks = tasks
        .filter(t => t.completed)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 10);

      if (recentTasks.length < 3) {
        setSuggestions(['Get started by adding more tasks!']);
        return;
      }

      const aiSuggestions = await generateTaskSuggestions(recentTasks);
      setSuggestions(aiSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestion = (suggestion) => {
    addTask(suggestion);
    setSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  return (
    <div className="mb-6">
      {!showSuggestions ? (
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {loading ? 'Getting AI suggestions...' : 'Get AI task suggestions'}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              AI Suggested Tasks
            </div>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence>
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 group hover:shadow-md transition-all"
              >
                <button
                  onClick={() => handleAddSuggestion(suggestion)}
                  className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                  {suggestion}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {suggestions.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No more suggestions. Keep completing tasks!
            </p>
          )}
        </div>
      )}
    </div>
  );
};
