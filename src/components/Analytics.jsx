import React, { useState, useEffect } from 'react';
import { useTodo } from '../context/TodoContext';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Clock, Target, Award, Flame } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';

export const Analytics = () => {
  const { tasks } = useTodo();
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    completionRate: 0,
    avgCompletionTime: 0,
    currentStreak: 0,
    productiveHours: [],
  });

  useEffect(() => {
    calculateStats();
  }, [tasks]);

  const calculateStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Calculate streak
    const sortedCompletedTasks = tasks
      .filter(t => t.completed)
      .sort((a, b) => b.createdAt - a.createdAt);

    let streak = 0;
    let lastDate = new Date();
    for (const task of sortedCompletedTasks) {
      const taskDate = new Date(task.createdAt);
      const dayDiff = Math.floor((lastDate - taskDate) / (1000 * 60 * 60 * 24));
      if (dayDiff <= 1) {
        streak++;
        lastDate = taskDate;
      } else {
        break;
      }
    }

    // Calculate productive hours
    const hourCounts = new Array(24).fill(0);
    tasks.filter(t => t.completed).forEach(task => {
      const hour = new Date(task.createdAt).getHours();
      hourCounts[hour]++;
    });

    const maxCount = Math.max(...hourCounts);
    const productiveHours = hourCounts
      .map((count, hour) => ({ hour, count, percentage: maxCount ? (count / maxCount) * 100 : 0 }))
      .filter(h => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setStats({
      totalTasks: total,
      completedTasks: completed,
      completionRate,
      currentStreak: streak,
      productiveHours,
    });
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date()),
  });

  const getTasksForDay = (day) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate.toDateString() === day.toDateString();
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Analytics Dashboard</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="w-6 h-6" />}
          title="Total Tasks"
          value={stats.totalTasks}
          color="bg-blue-500"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          color="bg-green-500"
        />
        <StatCard
          icon={<Flame className="w-6 h-6" />}
          title="Current Streak"
          value={`${stats.currentStreak} days`}
          color="bg-orange-500"
        />
        <StatCard
          icon={<Award className="w-6 h-6" />}
          title="Completed"
          value={stats.completedTasks}
          color="bg-purple-500"
        />
      </div>

      {/* Week Heatmap */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          This Week's Activity
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const dayTasks = getTasksForDay(day);
            const completedCount = dayTasks.filter(t => t.completed).length;
            const intensity = Math.min(completedCount / 5, 1);
            
            return (
              <div key={day.toString()} className="text-center">
                <div className="text-xs text-gray-500 mb-1">{format(day, 'EEE')}</div>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`h-16 rounded-lg flex items-center justify-center ${
                    isToday(day) ? 'ring-2 ring-indigo-600' : ''
                  }`}
                  style={{
                    backgroundColor: `rgba(99, 102, 241, ${0.1 + intensity * 0.9})`,
                  }}
                >
                  <div className="text-sm font-medium text-gray-800 dark:text-white">
                    {completedCount}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Productive Hours */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Most Productive Hours
        </h3>
        <div className="space-y-3">
          {stats.productiveHours.map(({ hour, count, percentage }) => (
            <div key={hour} className="flex items-center gap-4">
              <div className="w-20 text-sm text-gray-600 dark:text-gray-400">
                {hour % 12 || 12}:00 {hour >= 12 ? 'PM' : 'AM'}
              </div>
              <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-indigo-600 flex items-center justify-end pr-2"
                >
                  <span className="text-xs text-white font-medium">{count} tasks</span>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700"
  >
    <div className="flex items-center gap-4">
      <div className={`${color} p-3 rounded-xl text-white`}>
        {icon}
      </div>
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-2xl font-bold text-gray-800 dark:text-white">{value}</div>
      </div>
    </div>
  </motion.div>
);
