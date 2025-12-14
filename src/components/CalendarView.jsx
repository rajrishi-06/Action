import React, { useState } from 'react';
import { useTodo } from '../context/TodoContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

export const CalendarView = () => {
  const { tasks } = useTodo();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad with previous month days
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(daysInMonth);

  const getTasksForDay = (day) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      return isSameDay(new Date(task.dueDate), day);
    });
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={prevMonth}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden max-h-[calc(100vh-16rem)]">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {paddedDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="min-h-20 h-20 border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />;
            }

            const dayTasks = getTasksForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <motion.div
                key={day.toString()}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  "min-h-20 h-20 border border-gray-100 dark:border-gray-700 p-2 transition-colors",
                  isCurrentDay && "bg-indigo-50 dark:bg-indigo-900/20"
                )}
              >
                <div className={cn(
                  "text-sm font-medium mb-2",
                  isCurrentDay
                    ? "w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center"
                    : "text-gray-700 dark:text-gray-300"
                )}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1 overflow-y-auto max-h-20">
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      className={cn(
                        "text-xs p-1 rounded truncate",
                        task.priority === 'urgent' ? "bg-red-100 text-red-700" :
                        task.priority === 'high' ? "bg-orange-100 text-orange-700" :
                        "bg-blue-100 text-blue-700"
                      )}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
