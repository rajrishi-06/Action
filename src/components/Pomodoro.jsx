import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react';
import { cn } from '../utils/cn';

export const Pomodoro = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('focus'); // focus, short, long

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Play sound or notify
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    if (mode === 'focus') setTimeLeft(25 * 60);
    else if (mode === 'short') setTimeLeft(5 * 60);
    else setTimeLeft(15 * 60);
  };

  const setTimerMode = (newMode) => {
    setMode(newMode);
    setIsActive(false);
    if (newMode === 'focus') setTimeLeft(25 * 60);
    else if (newMode === 'short') setTimeLeft(5 * 60);
    else setTimeLeft(15 * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" />
          Focus Timer
        </h3>
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setTimerMode('focus')}
            className={cn("px-3 py-1 rounded-md text-sm font-medium transition-all", mode === 'focus' ? "bg-white dark:bg-gray-600 shadow-sm text-indigo-600" : "text-gray-500")}
          >
            Focus
          </button>
          <button
            onClick={() => setTimerMode('short')}
            className={cn("px-3 py-1 rounded-md text-sm font-medium transition-all", mode === 'short' ? "bg-white dark:bg-gray-600 shadow-sm text-indigo-600" : "text-gray-500")}
          >
            Short Break
          </button>
        </div>
      </div>

      <div className="text-center mb-8">
        <div className="text-6xl font-mono font-bold text-gray-800 dark:text-white tracking-wider mb-2">
          {formatTime(timeLeft)}
        </div>
        <p className="text-gray-500 text-sm">
          {isActive ? 'Stay focused!' : 'Ready to start?'}
        </p>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={toggleTimer}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all",
            isActive ? "bg-orange-500 hover:bg-orange-600" : "bg-indigo-600 hover:bg-indigo-700"
          )}
        >
          {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {isActive ? 'Pause' : 'Start Focus'}
        </button>
        <button
          onClick={resetTimer}
          className="p-3 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
