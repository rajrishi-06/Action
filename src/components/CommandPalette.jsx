import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Calendar, TrendingUp, LogOut, Download } from 'lucide-react';
import { useTodo } from '../context/TodoContext';
import { supabase } from '../utils/supabase';

export const CommandPalette = ({ isOpen, onClose, onNavigate }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { addTask, tasks, setFilter } = useTodo();
  const inputRef = useRef(null);

  const commands = [
    {
      id: 'add-task',
      label: 'Add New Task',
      icon: <Plus className="w-4 h-4" />,
      action: () => {
        if (search.trim()) {
          addTask(search);
          onClose();
        }
      },
      keywords: ['new', 'create', 'add', 'task'],
    },
    {
      id: 'view-analytics',
      label: 'View Analytics',
      icon: <TrendingUp className="w-4 h-4" />,
      action: () => {
        onNavigate('analytics');
        onClose();
      },
      keywords: ['analytics', 'stats', 'dashboard'],
    },
    {
      id: 'show-all',
      label: 'Show All Tasks',
      icon: <Calendar className="w-4 h-4" />,
      action: () => {
        setFilter('all');
        onNavigate('list');
        onClose();
      },
      keywords: ['all', 'tasks', 'list'],
    },
    {
      id: 'show-active',
      label: 'Show Active Tasks',
      icon: <Calendar className="w-4 h-4" />,
      action: () => {
        setFilter('active');
        onNavigate('list');
        onClose();
      },
      keywords: ['active', 'pending', 'todo'],
    },
    {
      id: 'export-json',
      label: 'Export as JSON',
      icon: <Download className="w-4 h-4" />,
      action: () => {
        exportData('json');
        onClose();
      },
      keywords: ['export', 'download', 'json'],
    },
    {
      id: 'export-csv',
      label: 'Export as CSV',
      icon: <Download className="w-4 h-4" />,
      action: () => {
        exportData('csv');
        onClose();
      },
      keywords: ['export', 'download', 'csv'],
    },
    {
      id: 'export-markdown',
      label: 'Export as Markdown',
      icon: <Download className="w-4 h-4" />,
      action: () => {
        exportData('markdown');
        onClose();
      },
      keywords: ['export', 'download', 'markdown', 'md'],
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: <LogOut className="w-4 h-4" />,
      action: async () => {
        await supabase.auth.signOut();
        onClose();
      },
      keywords: ['logout', 'signout', 'exit'],
    },
  ];

  const exportData = (format) => {
    if (format === 'json') {
      const dataStr = JSON.stringify(tasks, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `tasks-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else if (format === 'csv') {
      const headers = ['Title', 'Completed', 'Priority', 'Due Date', 'Tags'];
      const rows = tasks.map(t => [
        t.title,
        t.completed ? 'Yes' : 'No',
        t.priority,
        t.dueDate ? new Date(t.dueDate).toISOString() : '',
        (t.tags || []).join(';'),
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');
      
      const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const exportFileDefaultName = `tasks-${new Date().toISOString().split('T')[0]}.csv`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else if (format === 'markdown') {
      // Generate Markdown format
      const completedTasks = tasks.filter(t => t.completed);
      const activeTasks = tasks.filter(t => !t.completed);
      
      const mdContent = `# Task List Export
**Generated:** ${new Date().toLocaleString()}
**Total Tasks:** ${tasks.length}
**Completed:** ${completedTasks.length}
**Active:** ${activeTasks.length}

---

## 📋 Active Tasks

${activeTasks.length > 0 ? activeTasks.map(t => {
  const priority = t.priority ? `**[${t.priority.toUpperCase()}]**` : '';
  const tags = t.tags && t.tags.length > 0 ? t.tags.map(tag => `\`${tag}\``).join(' ') : '';
  const dueDate = t.dueDate ? `\n  - Due: ${new Date(t.dueDate).toLocaleDateString()}` : '';
  const subtasks = t.subtasks && t.subtasks.length > 0 
    ? '\n' + t.subtasks.map(st => `  - [${st.completed ? 'x' : ' '}] ${st.title}`).join('\n')
    : '';
  
  return `### [ ] ${t.title}\n${priority ? `  ${priority}` : ''}${tags ? `  ${tags}` : ''}${dueDate}${subtasks}`;
}).join('\n\n') : '_No active tasks_'}

---

## ✅ Completed Tasks

${completedTasks.length > 0 ? completedTasks.map(t => {
  const tags = t.tags && t.tags.length > 0 ? t.tags.map(tag => `\`${tag}\``).join(' ') : '';
  return `### [x] ${t.title}${tags ? `\n  ${tags}` : ''}`;
}).join('\n\n') : '_No completed tasks_'}

---

*Exported from TaskMaster*`;

      const dataUri = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(mdContent);
      const exportFileDefaultName = `tasks-${new Date().toISOString().split('T')[0]}.md`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.keywords.some(kw => kw.includes(search.toLowerCase()))
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-32"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: -20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Type a command or search tasks..."
              className="flex-1 bg-transparent outline-none text-gray-800 dark:text-white placeholder-gray-400"
            />
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
              ESC
            </kbd>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No commands found
              </div>
            ) : (
              <div className="py-2">
                {filteredCommands.map((cmd, index) => (
                  <button
                    key={cmd.id}
                    onClick={() => cmd.action()}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                      index === selectedIndex
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {cmd.icon}
                    <span>{cmd.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 flex items-center justify-between">
            <div className="flex gap-4">
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd> Select</span>
            </div>
            <span>Cmd+K to open</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
