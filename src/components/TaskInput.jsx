import React, { useState, useEffect } from 'react';
import { useTodo } from '../context/TodoContext';
import { Plus, Calendar, Flag, Tag, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { suggestAIPriority, suggestAITags, estimateTaskTime } from '../utils/geminiAI';

export const TaskInput = () => {
  const [input, setInput] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const { addTask } = useTodo();

  // Debounced AI suggestions
  useEffect(() => {
    if (input.trim().length > 10) {
      const timer = setTimeout(() => {
        fetchAISuggestions();
      }, 1500); // Wait 1.5s after user stops typing

      return () => clearTimeout(timer);
    } else {
      setAiSuggestions(null);
    }
  }, [input]);

  const fetchAISuggestions = async () => {
    setLoadingAI(true);
    try {
      const [priority, tags, timeEstimate] = await Promise.all([
        suggestAIPriority(input),
        suggestAITags(input),
        estimateTaskTime(input)
      ]);

      setAiSuggestions({
        priority,
        tags,
        timeEstimate
      });
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    addTask(input);
    setInput('');
    setAiSuggestions(null);
  };

  const applyAISuggestions = () => {
    if (!aiSuggestions) return;
    
    let enhancedInput = input;
    
    // Add priority if not already present
    if (!input.includes('!') && aiSuggestions.priority && aiSuggestions.priority !== 'medium') {
      enhancedInput += ` !${aiSuggestions.priority}`;
    }
    
    // Add tags if not already present
    if (aiSuggestions.tags && aiSuggestions.tags.length > 0) {
      const existingTags = (input.match(/#\w+/g) || []).map(t => t.slice(1).toLowerCase());
      const newTags = aiSuggestions.tags.filter(tag => !existingTags.includes(tag));
      if (newTags.length > 0) {
        enhancedInput += ' ' + newTags.map(tag => `#${tag}`).join(' ');
      }
    }
    
    setInput(enhancedInput);
    setAiSuggestions(null);
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a task... (e.g., 'Submit report tomorrow at 5pm #work')"
            className="w-full p-4 pl-12 pr-24 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-base"
          />
          <Plus className="absolute left-4 text-gray-400 w-5 h-5" />
          <div className="absolute right-3 flex items-center gap-2">
            {loadingAI && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 opacity-0 group-focus-within:opacity-100 transition-opacity px-1">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Natural dates</span>
          <span className="flex items-center gap-1"><Flag className="w-3 h-3" /> Priority</span>
          <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> #tags</span>
          <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI</span>
        </div>
      </form>

      {/* AI Suggestions */}
      <AnimatePresence>
        {aiSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300">
                  <Sparkles className="w-4 h-4" />
                  AI Suggestions
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {aiSuggestions.priority && aiSuggestions.priority !== 'medium' && (
                    <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-md font-medium">
                      Priority: {aiSuggestions.priority}
                    </span>
                  )}
                  {aiSuggestions.tags && aiSuggestions.tags.length > 0 && (
                    <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-md font-medium">
                      Tags: {aiSuggestions.tags.join(', ')}
                    </span>
                  )}
                  {aiSuggestions.timeEstimate && (
                    <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-md font-medium">
                      ~{aiSuggestions.timeEstimate} min
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={applyAISuggestions}
                className="text-xs px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium whitespace-nowrap"
              >
                Apply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
