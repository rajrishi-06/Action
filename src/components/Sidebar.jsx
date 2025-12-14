import React from 'react';
import { useTodo } from '../context/TodoContext';
import { Layout, CheckCircle, Clock, LogOut, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { supabase } from '../utils/supabase';
import { Gamification } from './Gamification';

export const Sidebar = ({ currentView, setView, isOpen, onClose }) => {
  const { filter, setFilter, stats } = useTodo();

  const filters = [
    { id: 'all', label: 'All Tasks', icon: Layout },
    { id: 'active', label: 'Active', icon: Clock },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`w-64 bg-white dark:bg-gray-800 h-screen p-6 border-r border-gray-100 dark:border-gray-700 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
      {/* Close button for mobile */}
      <button
        onClick={onClose}
        className="md:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-3 mb-10">
        <img src="/logo.png" alt="Action Logo" className="w-10 h-10 object-contain rounded-full" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Action
        </h1>
      </div>

      <nav className="space-y-2 flex-1">
        {filters.map(item => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              filter === item.id
                ? "bg-indigo-50 text-indigo-600 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700 space-y-6 max-h-[50vh] overflow-y-auto">
        <Gamification />
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
    </>
  );
};
