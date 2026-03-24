export type Task = {
  id: string
  name: string
  deadline?: string
  completedAt?: string
  partiallyCompleted?: boolean
  createdAt: string
}

export type DayRecord = {
  date: string
  didProcrastinate: boolean
  completedTaskIds: string[]
}

export type Goals = {
  weeklyMinDays: number
  monthlyMinDays: number
}

export type AppState = {
  tasks: Task[]
  dayRecords: DayRecord[]
  goals: Goals
}
