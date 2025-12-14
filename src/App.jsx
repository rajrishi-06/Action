import React, { useState, useEffect } from 'react';
import { TodoProvider } from './context/TodoContext';
import { Sidebar } from './components/Sidebar';
import { TaskInput } from './components/TaskInput';
import { TaskList } from './components/TaskList';
import { KanbanBoard } from './components/KanbanBoard';
import { Pomodoro } from './components/Pomodoro';
import { Analytics } from './components/Analytics';
import { CalendarView } from './components/CalendarView';
import { CommandPalette } from './components/CommandPalette';
import { ProductivityCoach } from './components/ProductivityCoach';
import { AISuggestions } from './components/AISuggestions';
import { Auth } from './components/Auth';
import { supabase } from './utils/supabase';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

function Dashboard() {
  const [view, setView] = useState('list'); // list, kanban, focus, calendar, analytics
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      } else if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex">
      <Sidebar currentView={view} setView={setView} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 p-4 md:p-8 w-full max-w-6xl mx-auto">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-30 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pt-12 md:pt-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-2">Hello! 👋</h2>
            <p className="text-sm md:text-base text-gray-500">Here's what's on your plate today.</p>
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto">
            <button 
              onClick={() => setView('list')}
              className={`px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all whitespace-nowrap ${view === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-500'}`}
            >
              List
            </button>
            <button 
              onClick={() => setView('kanban')}
              className={`px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all whitespace-nowrap ${view === 'kanban' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-500'}`}
            >
              Kanban
            </button>
            <button 
              onClick={() => setView('calendar')}
              className={`px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all whitespace-nowrap ${view === 'calendar' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-500'}`}
            >
              Calendar
            </button>
            <button 
              onClick={() => setView('analytics')}
              className={`px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all whitespace-nowrap ${view === 'analytics' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-500'}`}
            >
              Analytics
            </button>
            <button 
              onClick={() => setView('focus')}
              className={`px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all whitespace-nowrap ${view === 'focus' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-500'}`}
            >
              Focus
            </button>
          </div>
        </header>
        
        {view === 'focus' && <Pomodoro />}
        
        {!['kanban', 'calendar', 'analytics'].includes(view) && (
          <div>
            <ProductivityCoach />
            <AISuggestions />
            <TaskInput />
          </div>
        )}
        
        {view === 'list' && <TaskList />}
        {view === 'kanban' && <KanbanBoard />}
        {view === 'calendar' && <CalendarView />}
        {view === 'analytics' && <Analytics />}
        {view === 'focus' && <TaskList />}
      </main>

      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={setView}
      />
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">Loading...</div>;
  }

  return (
    <TodoProvider>
      <Router>
        <Routes>
          <Route path="/login" element={!session ? <Auth /> : <Navigate to="/" />} />
          <Route path="/" element={session ? <Dashboard /> : <Navigate to="/login" />} />
        </Routes>
      </Router>
    </TodoProvider>
  );
}

export default App;
