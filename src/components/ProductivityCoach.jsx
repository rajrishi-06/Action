import React, { useEffect, useState } from 'react';
import { useTodo } from '../context/TodoContext';
import { detectProcrastination, generateSubtasks } from '../utils/aiHelpers';
import { generateAISubtasks, getProductivityCoaching } from '../utils/geminiAI';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, AlertTriangle, Lightbulb, X, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export const ProductivityCoach = () => {
  const { tasks, updateTask } = useTodo();
  const [insights, setInsights] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const [aiCoaching, setAiCoaching] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    const warnings = detectProcrastination(tasks);
    
    // Add task breakdown suggestions
    const largeTaskSuggestions = tasks
      .filter(t => !t.completed && (!t.subtasks || t.subtasks.length === 0))
      .slice(0, 3) // Limit to 3 to avoid too many AI calls
      .map(task => {
        const subtasks = generateSubtasks(task.title);
        if (subtasks) {
          return {
            type: 'breakdown',
            message: `"${task.title}" looks like a big task. Want to break it down?`,
            severity: 'low',
            task,
            subtasks,
          };
        }
        return null;
      })
      .filter(Boolean);

    setInsights([...warnings, ...largeTaskSuggestions].filter(i => !dismissed.has(i.message)));

    // Get AI coaching (once per mount or when tasks change significantly)
    if (tasks.length > 0 && !aiCoaching) {
      fetchAICoaching();
    }
  }, [tasks, dismissed]);

  const fetchAICoaching = async () => {
    setLoadingAI(true);
    try {
      const coaching = await getProductivityCoaching(tasks);
      if (coaching) {
        setAiCoaching(coaching);
      }
    } catch (error) {
      console.error('Error fetching AI coaching:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleDismiss = (message) => {
    setDismissed(new Set([...dismissed, message]));
  };

  const handleApplyBreakdown = (task, subtasks) => {
    const formattedSubtasks = subtasks.map((title, index) => ({
      id: `${task.id}-sub-${index}`,
      title,
      completed: false,
    }));
    
    updateTask(task.id, { subtasks: formattedSubtasks });
    handleDismiss(insights.find(i => i.task?.id === task.id)?.message);
  };

  const handleAIBreakdown = async (task) => {
    setLoadingAI(true);
    try {
      const aiSubtasks = await generateAISubtasks(task.title);
      if (aiSubtasks && aiSubtasks.length > 0) {
        handleApplyBreakdown(task, aiSubtasks);
      }
    } catch (error) {
      console.error('Error generating AI subtasks:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  if (insights.length === 0 && !aiCoaching) return null;

  return (
    <div className="mb-8 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Brain className="w-4 h-4 text-indigo-600" />
        <span>AI Coach</span>
        {loadingAI && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
      </div>

      {/* AI Productivity Coaching */}
      {aiCoaching && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 border-indigo-200 dark:border-indigo-800"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Brain className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                💡 {aiCoaching}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {insights.map((insight, index) => (
          <motion.div
            key={insight.message}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "p-4 rounded-xl border flex items-start gap-3",
              insight.severity === 'high' ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800" :
              insight.severity === 'medium' ? "bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800" :
              "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800"
            )}
          >
            <div className={cn(
              "p-2 rounded-lg",
              insight.severity === 'high' ? "bg-red-100 text-red-600" :
              insight.severity === 'medium' ? "bg-orange-100 text-orange-600" :
              "bg-blue-100 text-blue-600"
            )}>
              {insight.type === 'breakdown' ? <Sparkles className="w-4 h-4" /> :
               insight.severity === 'high' ? <AlertTriangle className="w-4 h-4" /> :
               <Lightbulb className="w-4 h-4" />}
            </div>

            <div className="flex-1">
              <p className={cn(
                "text-sm font-medium",
                insight.severity === 'high' ? "text-red-800 dark:text-red-200" :
                insight.severity === 'medium' ? "text-orange-800 dark:text-orange-200" :
                "text-blue-800 dark:text-blue-200"
              )}>
                {insight.message}
              </p>

              {insight.type === 'breakdown' && insight.subtasks && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleApplyBreakdown(insight.task, insight.subtasks)}
                    className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Use suggested subtasks ({insight.subtasks.length})
                  </button>
                  <button
                    onClick={() => handleAIBreakdown(insight.task)}
                    disabled={loadingAI}
                    className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    AI Breakdown
                  </button>
                </div>
              )}

              {insight.type === 'overdue' && insight.tasks && (
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  {insight.tasks.slice(0, 3).map(t => (
                    <div key={t.id}>• {t.title}</div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => handleDismiss(insight.message)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
