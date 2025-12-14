import React from 'react';
import { useTodo } from '../context/TodoContext';
import { TaskItem } from './TaskItem';
import { AnimatePresence, motion } from 'framer-motion';

export const TaskList = () => {
  const { filteredTasks } = useTodo();

  if (filteredTasks.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">No tasks found</p>
        <p className="text-sm">Add a new task to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {filteredTasks.map(task => (
          <TaskItem key={task.id} task={task} />
        ))}
      </AnimatePresence>
    </div>
  );
};
