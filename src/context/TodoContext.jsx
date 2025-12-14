import React, { createContext, useContext, useState, useEffect } from 'react';
import { parseTaskInput } from '../utils/taskParser';
import { supabase } from '../utils/supabase';

const TodoContext = createContext();

export const useTodo = () => useContext(TodoContext);

export const TodoProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, completed
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTasks = data.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        completed: t.is_completed,
        createdAt: new Date(t.created_at),
        dueDate: t.due_date ? new Date(t.due_date) : null,
        priority: t.priority,
        tags: t.tags || [],
        subtasks: t.subtasks || [],
        estimatedTime: t.estimated_time,
        actualTime: t.actual_time,
        status: t.status
      }));

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (input) => {
    const { text, dueDate, priority, tags } = parseTaskInput(input);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newTask = {
      user_id: user.id,
      title: text,
      is_completed: false,
      created_at: new Date().toISOString(),
      due_date: dueDate ? dueDate.toISOString() : null,
      priority,
      tags,
      subtasks: []
    };

    // Optimistic update
    const tempId = Date.now().toString();
    const optimisticTask = {
      id: tempId,
      title: text,
      completed: false,
      createdAt: new Date(),
      dueDate,
      priority,
      tags,
      subtasks: []
    };
    setTasks(prev => [optimisticTask, ...prev]);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic task with real one
      setTasks(prev => prev.map(t => t.id === tempId ? {
        ...t,
        id: data.id,
        createdAt: new Date(data.created_at),
        dueDate: data.due_date ? new Date(data.due_date) : null
      } : t));

    } catch (error) {
      console.error('Error adding task:', error);
      // Rollback
      setTasks(prev => prev.filter(t => t.id !== tempId));
    }
  };

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const wasCompleted = task.completed;
    const isNowCompleted = !task.completed;

    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: isNowCompleted } : t
    ));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: isNowCompleted })
        .eq('id', id);

      if (error) throw error;

      // Award XP when completing a task
      if (!wasCompleted && isNowCompleted) {
        await awardXP(task);
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      // Rollback
      setTasks(prev => prev.map(t => 
        t.id === id ? { ...t, completed: task.completed } : t
      ));
    }
  };

  // Award XP and update achievements
  const awardXP = async (task) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate XP based on task priority
      const xpMap = { urgent: 50, high: 30, medium: 20, low: 10 };
      const xp = xpMap[task.priority] || 10;

      // Award XP
      const { error } = await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_xp: xp
      });

      if (error) {
        // If RPC doesn't exist, manually update
        const { data: stats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (stats) {
          const newTotalXp = stats.total_xp + xp;
          const newTasksCompleted = stats.tasks_completed + 1;
          const today = new Date().toISOString().split('T')[0];
          const lastActivity = stats.last_activity ? stats.last_activity.split('T')[0] : null;
          
          // Calculate streak
          let newStreak = stats.current_streak;
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (lastActivity === yesterdayStr) {
            newStreak += 1;
          } else if (lastActivity !== today) {
            newStreak = 1;
          }

          const newLongestStreak = Math.max(stats.longest_streak, newStreak);

          // Check for achievements
          const newAchievements = [...(stats.achievements || [])];
          
          if (newTasksCompleted === 1 && !newAchievements.includes('first_task')) {
            newAchievements.push('first_task');
          }
          if (newTasksCompleted === 10 && !newAchievements.includes('tasks_10')) {
            newAchievements.push('tasks_10');
          }
          if (newTasksCompleted === 50 && !newAchievements.includes('tasks_50')) {
            newAchievements.push('tasks_50');
          }
          if (newTasksCompleted === 100 && !newAchievements.includes('tasks_100')) {
            newAchievements.push('tasks_100');
          }
          if (newTasksCompleted === 500 && !newAchievements.includes('tasks_500')) {
            newAchievements.push('tasks_500');
          }
          
          if (newStreak === 3 && !newAchievements.includes('streak_3')) {
            newAchievements.push('streak_3');
          }
          if (newStreak === 7 && !newAchievements.includes('streak_7')) {
            newAchievements.push('streak_7');
          }
          if (newStreak === 30 && !newAchievements.includes('streak_30')) {
            newAchievements.push('streak_30');
          }

          await supabase
            .from('user_stats')
            .update({
              total_xp: newTotalXp,
              tasks_completed: newTasksCompleted,
              current_streak: newStreak,
              longest_streak: newLongestStreak,
              last_activity: new Date().toISOString(),
              achievements: newAchievements,
            })
            .eq('user_id', user.id);
        }
      }
    } catch (error) {
      console.error('Error awarding XP:', error);
    }
  };

  const deleteTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    
    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== id));

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting task:', error);
      // Rollback
      if (task) setTasks(prev => [...prev, task]);
    }
  };

  const updateTask = async (id, updates) => {
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));

    try {
      // Map frontend keys to DB keys if necessary
      const dbUpdates = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.completed !== undefined) dbUpdates.is_completed = updates.completed;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;

      const { error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating task:', error);
      // We might need a more complex rollback here, but for now we'll just log
      fetchTasks(); // Re-sync with server
    }
  };

  const getFilteredTasks = () => {
    return tasks.filter(task => {
      const matchesFilter = 
        filter === 'all' ? true :
        filter === 'active' ? !task.completed :
        filter === 'completed' ? task.completed : true;
      
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesFilter && matchesSearch;
    });
  };

  const getStats = () => {
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
      return { total, completed, completionRate };
  };

  return (
    <TodoContext.Provider value={{
      tasks,
      loading,
      addTask,
      toggleTask,
      deleteTask,
      updateTask,
      filter,
      setFilter,
      searchQuery,
      setSearchQuery,
      filteredTasks: getFilteredTasks(),
      stats: getStats()
    }}>
      {children}
    </TodoContext.Provider>
  );
};
