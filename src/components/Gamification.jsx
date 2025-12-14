import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Star, Award, Target, Flame } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { cn } from '../utils/cn';

// Achievement definitions
const ACHIEVEMENTS = [
  { id: 'first_task', name: 'Getting Started', description: 'Complete your first task', icon: Star, requirement: 1 },
  { id: 'streak_3', name: '3-Day Streak', description: 'Complete tasks for 3 days in a row', icon: Flame, requirement: 3 },
  { id: 'streak_7', name: 'Week Warrior', description: 'Complete tasks for 7 days in a row', icon: Flame, requirement: 7 },
  { id: 'streak_30', name: 'Monthly Master', description: 'Complete tasks for 30 days in a row', icon: Flame, requirement: 30 },
  { id: 'tasks_10', name: 'Productivity Novice', description: 'Complete 10 tasks total', icon: Target, requirement: 10 },
  { id: 'tasks_50', name: 'Task Crusher', description: 'Complete 50 tasks total', icon: Target, requirement: 50 },
  { id: 'tasks_100', name: 'Century Club', description: 'Complete 100 tasks total', icon: Trophy, requirement: 100 },
  { id: 'tasks_500', name: 'Legendary', description: 'Complete 500 tasks total', icon: Award, requirement: 500 },
];

// XP and level calculations
const getLevel = (xp) => Math.floor(Math.sqrt(xp / 100)) + 1;
const getXpForLevel = (level) => Math.pow(level - 1, 2) * 100;
const getXpForNextLevel = (level) => Math.pow(level, 2) * 100;

export const Gamification = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    
    // Subscribe to stats changes
    const subscription = supabase
      .channel('user_stats_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_stats' 
      }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching stats:', error);
        return;
      }

      setStats(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 rounded-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const currentLevel = getLevel(stats.total_xp);
  const xpForCurrentLevel = getXpForLevel(currentLevel);
  const xpForNext = getXpForNextLevel(currentLevel);
  const xpProgress = stats.total_xp - xpForCurrentLevel;
  const xpNeeded = xpForNext - xpForCurrentLevel;
  const progressPercent = (xpProgress / xpNeeded) * 100;

  const unlockedAchievements = stats.achievements || [];

  return (
    <div className="space-y-3">
      {/* Level and XP Section - Compact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Level {currentLevel}</h3>
              <p className="text-xs text-white/80">{stats.total_xp} XP</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-white/80">Streak</div>
            <div className="flex items-center gap-1 text-base font-bold">
              <Flame className="w-4 h-4" />
              {stats.current_streak}
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{xpProgress} / {xpNeeded} XP</span>
            <span>Lvl {currentLevel + 1}</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-yellow-300 to-orange-400 rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {/* Achievements Grid - Only 4 achievements, compact */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
          <Trophy className="w-3 h-3" />
          Achievements ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
        </h4>
        
        <div className="grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.slice(0, 4).map((achievement) => {
            const isUnlocked = unlockedAchievements.includes(achievement.id);
            const Icon = achievement.icon;
            
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                className={cn(
                  "p-2 rounded-lg border transition-all",
                  isUnlocked
                    ? "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-700"
                    : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center mb-1",
                  isUnlocked
                    ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
                    : "bg-gray-300 dark:bg-gray-700 text-gray-500"
                )}>
                  <Icon className="w-3 h-3" />
                </div>
                <h5 className={cn(
                  "text-xs font-semibold truncate",
                  isUnlocked ? "text-gray-900 dark:text-gray-100" : "text-gray-500"
                )}>
                  {achievement.name}
                </h5>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Quick Stats - Compact */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {stats.tasks_completed}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Tasks</div>
        </div>
        
        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {stats.longest_streak}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Best</div>
        </div>
        
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {currentLevel}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Level</div>
        </div>
      </div>
    </div>
  );
};
