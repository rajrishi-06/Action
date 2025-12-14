import React, { useState } from 'react';
import { useTodo } from '../context/TodoContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, Calendar, Flag, Tag, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../utils/cn';

export const TaskItem = ({ task }) => {
  const { toggleTask, deleteTask, updateTask } = useTodo();
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');

  const priorityColors = {
    urgent: 'text-red-600 bg-red-50 border-red-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    medium: 'text-blue-600 bg-blue-50 border-blue-200',
    low: 'text-gray-600 bg-gray-50 border-gray-200',
  };

  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    
    const updatedSubtasks = [
      ...(task.subtasks || []),
      { id: Date.now().toString(), title: newSubtask, completed: false }
    ];
    
    updateTask(task.id, { subtasks: updatedSubtasks });
    setNewSubtask('');
  };

  const toggleSubtask = (subtaskId) => {
    const updatedSubtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    updateTask(task.id, { subtasks: updatedSubtasks });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        "group bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden",
        task.completed && "opacity-60 bg-gray-50"
      )}
    >
      <div className="flex items-center gap-4 p-4">
        <button
          onClick={() => toggleTask(task.id)}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
            task.completed
              ? "bg-indigo-600 border-indigo-600"
              : "border-gray-300 hover:border-indigo-600"
          )}
        >
          {task.completed && <Check className="w-4 h-4 text-white" />}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn(
              "text-lg font-medium truncate transition-all",
              task.completed && "line-through text-gray-500"
            )}>
              {task.title}
            </span>
            {task.priority !== 'medium' && (
              <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium capitalize", priorityColors[task.priority])}>
                {task.priority}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            {task.dueDate && (
              <span className={cn("flex items-center gap-1", task.dueDate < new Date() && !task.completed && "text-red-500")}>
                <Calendar className="w-3 h-3" />
                {format(task.dueDate, 'MMM d, h:mm a')}
              </span>
            )}
            {task.tags && task.tags.length > 0 && (
              <div className="flex gap-2">
                {task.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-indigo-600">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {task.subtasks && task.subtasks.length > 0 && (
              <span className="text-gray-400">
                {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} subtasks
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <button
            onClick={() => deleteTask(task.id)}
            className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 px-4 py-3"
          >
            <div className="space-y-2 mb-3">
              {task.subtasks && task.subtasks.map(subtask => (
                <div key={subtask.id} className="flex items-center gap-3 pl-2">
                  <button
                    onClick={() => toggleSubtask(subtask.id)}
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      subtask.completed ? "bg-indigo-500 border-indigo-500" : "border-gray-300 hover:border-indigo-500"
                    )}
                  >
                    {subtask.completed && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className={cn("text-sm", subtask.completed && "line-through text-gray-500")}>
                    {subtask.title}
                  </span>
                </div>
              ))}
            </div>
            
            <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Add a subtask..."
                className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
