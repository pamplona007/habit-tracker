import { Card, Flex, Text } from '@radix-ui/themes'
import type { Task } from '../../api'
import styles from './styles.module.css'

type StreakCardProps = {
  tasks: Task[]
}

function calculateStreak(tasks: Task[]): number {
  if (tasks.length === 0) return 0

  // Get all completion dates (user completions, today first)
  const completionDates = new Set<string>()

  tasks.forEach((task) => {
    task.completions.forEach((c) => {
      const date = new Date(c.completedAt).toISOString().split('T')[0]
      completionDates.add(date)
    })
  })

  if (completionDates.size === 0) return 0

  // Sort dates descending
  const sorted = [...completionDates].sort((a, b) => b.localeCompare(a))
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // Streak must include today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0

  let streak = 0
  let current = new Date(sorted[0])

  for (const dateStr of sorted) {
    const expected = current.toISOString().split('T')[0]
    if (dateStr === expected) {
      streak++
      current = new Date(current.getTime() - 86400000)
    } else {
      break
    }
  }

  return streak
}

export function StreakCard({ tasks }: StreakCardProps) {
  const streak = calculateStreak(tasks)
  const totalCompletions = tasks.reduce((acc, t) => acc + t.completions.length, 0)

  return (
    <Card className={styles.card}>
      <Flex direction="column" align="center" gap="2" py="3">
        <Text size="6" className={styles.fireEmoji}>🔥</Text>
        {streak > 0 ? (
          <>
            <Text size="7" weight="bold" className={styles.streakNumber}>{streak}</Text>
            <Text size="2" color="gray" weight="medium">
              {streak === 1 ? 'dia seguido' : 'dias seguidos'}
            </Text>
          </>
        ) : (
          <>
            <Text size="4" weight="bold" color="gray">0</Text>
            <Text size="2" color="gray" align="center">
              Complete uma tarefa hoje para começar sua sequência!
            </Text>
          </>
        )}
        {totalCompletions > 0 && (
          <Text size="1" color="gray" mt="1">
            {totalCompletions} tarefa(s) completada(s) no total
          </Text>
        )}
      </Flex>
    </Card>
  )
}
