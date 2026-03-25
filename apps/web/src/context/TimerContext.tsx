import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Task } from '../types';

interface TimerState {
  isActive: boolean;
  isMinimized: boolean;
  task: Task | null;
  duration: number;
  timeLeft: number;
  isRunning: boolean;
  isCompleted: boolean;
  showStopConfirm: boolean;
}

interface TimerContextValue extends TimerState {
  startTimer: (task: Task, duration: number) => void;
  minimizeTimer: () => void;
  expandTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  requestReset: () => void;
  confirmReset: () => void;
  cancelReset: () => void;
  completeTimer: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>({
    isActive: false,
    isMinimized: false,
    task: null,
    duration: 0,
    timeLeft: 0,
    isRunning: false,
    isCompleted: false,
    showStopConfirm: false,
  });

  const startTimer = useCallback((task: Task, duration: number) => {
    setState({
      isActive: true,
      isMinimized: false,
      task,
      duration,
      timeLeft: duration * 60,
      isRunning: true,
      isCompleted: false,
      showStopConfirm: false,
    });
  }, []);

  const minimizeTimer = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: true }));
  }, []);

  const expandTimer = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: false }));
  }, []);

  const pauseTimer = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: false }));
  }, []);

  const resumeTimer = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: true }));
  }, []);

  const resetTimer = useCallback(() => {
    setState({
      isActive: false,
      isMinimized: false,
      task: null,
      duration: 0,
      timeLeft: 0,
      isRunning: false,
      isCompleted: false,
      showStopConfirm: false,
    });
  }, []);

  const requestReset = useCallback(() => {
    setState((prev) => ({ ...prev, showStopConfirm: true }));
  }, []);

  const confirmReset = useCallback(() => {
    setState({
      isActive: false,
      isMinimized: false,
      task: null,
      duration: 0,
      timeLeft: 0,
      isRunning: false,
      isCompleted: false,
      showStopConfirm: false,
    });
  }, []);

  const cancelReset = useCallback(() => {
    setState((prev) => ({ ...prev, showStopConfirm: false }));
  }, []);

  const completeTimer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
      isCompleted: true,
      showStopConfirm: false,
    }));
  }, []);

  useEffect(() => {
    if (!state.isActive || !state.isRunning || state.timeLeft <= 0) return;

    const interval = setInterval(() => {
      setState((prev) => {
        if (prev.timeLeft <= 1) {
          return { ...prev, timeLeft: 0, isRunning: false, isCompleted: true };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isActive, state.isRunning, state.timeLeft]);

  return (
    <TimerContext.Provider
      value={{
        ...state,
        startTimer,
        minimizeTimer,
        expandTimer,
        pauseTimer,
        resumeTimer,
        resetTimer,
        requestReset,
        confirmReset,
        cancelReset,
        completeTimer,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider');
  }
  return context;
}
