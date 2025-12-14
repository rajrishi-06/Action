import React, { useState, useEffect } from 'react';
import { useTodo } from '../context/TodoContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskItem } from './TaskItem';
import { cn } from '../utils/cn';

const SortableTask = ({ task }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3">
      <TaskItem task={task} />
    </div>
  );
};

const KanbanColumn = ({ id, title, tasks }) => {
  const { setNodeRef } = useSortable({ id });

  return (
    <div ref={setNodeRef} className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-xl min-w-[300px] flex-1">
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center justify-between">
        {title}
        <span className="bg-gray-200 dark:bg-gray-700 text-xs px-2 py-1 rounded-full">{tasks.length}</span>
      </h3>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tasks.map(task => (
            <SortableTask key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export const KanbanBoard = () => {
  const { tasks, updateTask } = useTodo();
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columns = {
    todo: tasks.filter(t => !t.completed && t.priority !== 'urgent'),
    urgent: tasks.filter(t => !t.completed && t.priority === 'urgent'),
    done: tasks.filter(t => t.completed),
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find which column the task is in and which it's moving to
    // This is a simplified implementation - for a full Kanban, we'd need to track column state more explicitly
    // For now, let's just handle reordering within the list or simple status updates if we had column droppables
    
    // Since we're using a single list in the context, reordering is tricky without a 'status' field beyond 'completed'
    // For this demo, we'll just allow visual dragging but not persist complex column moves yet
    // To fully implement, we'd need to update the 'status' or 'priority' based on the drop target
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <KanbanColumn id="urgent" title="Urgent 🔥" tasks={columns.urgent} />
        <KanbanColumn id="todo" title="To Do" tasks={columns.todo} />
        <KanbanColumn id="done" title="Completed ✅" tasks={columns.done} />
      </DndContext>
    </div>
  );
};
