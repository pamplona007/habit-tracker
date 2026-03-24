import { useMemo } from 'react'
import { calculateStreak } from '../utils/streak'
import { today } from '../utils/dates'
import { useAppState } from './useAppState'

export function useStreak(): number {
  const { dayRecords, goals } = useAppState()
  return useMemo(
    () => calculateStreak(dayRecords, goals, today()),
    [dayRecords, goals]
  )
}
