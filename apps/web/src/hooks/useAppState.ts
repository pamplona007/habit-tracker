import { useState, useCallback } from 'react'
import type { AppState, DayRecord, Goals, Task } from '../types'
import { today } from '../utils/dates'

const STORAGE_KEY = 'habit-tracker-state'

const DEFAULT_STATE: AppState = {
  tasks: [],
  dayRecords: [],
  goals: { weeklyMinDays: 3, monthlyMinDays: 15 },
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    return JSON.parse(raw) as AppState
  } catch {
    return DEFAULT_STATE
  }
}

function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState)

  const update = useCallback((updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev)
      saveState(next)
      return next
    })
  }, [])

  const addTask = useCallback(
    (name: string, deadline?: string) => {
      const task: Task = {
        id: generateId(),
        name,
        deadline,
        createdAt: new Date().toISOString(),
      }
      update((prev) => ({ ...prev, tasks: [...prev.tasks, task] }))
    },
    [update]
  )

  const completeTask = useCallback(
    (taskId: string, partial: boolean) => {
      const todayStr = today()
      update((prev) => {
        const tasks = prev.tasks.map((t) => {
          if (t.id !== taskId) return t
          return {
            ...t,
            completedAt: new Date().toISOString(),
            partiallyCompleted: partial,
          }
        })

        const existingRecord = prev.dayRecords.find((r) => r.date === todayStr)
        let dayRecords: DayRecord[]

        if (existingRecord) {
          dayRecords = prev.dayRecords.map((r) => {
            if (r.date !== todayStr) return r
            const completedTaskIds = r.completedTaskIds.includes(taskId)
              ? r.completedTaskIds
              : [...r.completedTaskIds, taskId]
            return { ...r, completedTaskIds }
          })
        } else {
          dayRecords = [
            ...prev.dayRecords,
            {
              date: todayStr,
              didProcrastinate: false,
              completedTaskIds: [taskId],
            },
          ]
        }

        return { ...prev, tasks, dayRecords }
      })
    },
    [update]
  )

  const removeTask = useCallback(
    (taskId: string) => {
      update((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== taskId),
      }))
    },
    [update]
  )

  const updateGoals = useCallback(
    (goals: Goals) => {
      update((prev) => ({ ...prev, goals }))
    },
    [update]
  )

  const getTodayRecord = useCallback((): DayRecord | undefined => {
    const todayStr = today()
    return state.dayRecords.find((r) => r.date === todayStr)
  }, [state.dayRecords])

  return {
    tasks: state.tasks,
    dayRecords: state.dayRecords,
    goals: state.goals,
    addTask,
    completeTask,
    removeTask,
    updateGoals,
    getTodayRecord,
  }
}
