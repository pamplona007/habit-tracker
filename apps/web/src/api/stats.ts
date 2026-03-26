import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface PlatformStats {
  households: number
  tasksCompleted: number
  bestStreak: number
}

export const statsApi = {
  get: async (): Promise<PlatformStats> => {
    const { data } = await axios.get<{ households: number; tasksCompleted: number; bestStreak: number }>(
      `${API_URL}/stats`,
    )
    return data
  },
}
