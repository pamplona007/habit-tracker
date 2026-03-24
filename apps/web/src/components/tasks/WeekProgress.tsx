import { Box, Flex, Text } from '@radix-ui/themes'
import { CircularProgress } from './CircularProgress'
import styles from './WeekProgress.module.css'

type WeekProgressProps = {
  dailyCompleted: number
  dailyTotal: number
  weeklyCompleted: number
  weeklyTotal: number
  monthlyCompleted: number
  monthlyTotal: number
}

export function WeekProgress({
  dailyCompleted,
  dailyTotal,
  weeklyCompleted,
  weeklyTotal,
  monthlyCompleted,
  monthlyTotal,
}: WeekProgressProps) {
  return (
    <Box className={styles.card}>
      <Text size="2" weight="semibold" className={styles.title}>
        Sua semana
      </Text>
      <Flex gap="6" justify="center" className={styles.progressList}>
        <Flex direction="column" align="center" gap="2">
          <CircularProgress
            progress={dailyTotal > 0 ? dailyCompleted / dailyTotal : 0}
            size={64}
            strokeWidth={5}
          >
            <Text size="2" weight="bold" className={styles.progressNumber}>
              {dailyCompleted}
            </Text>
          </CircularProgress>
          <Text size="1" className={styles.progressLabel}>Diárias</Text>
        </Flex>

        <Flex direction="column" align="center" gap="2">
          <CircularProgress
            progress={weeklyTotal > 0 ? weeklyCompleted / weeklyTotal : 0}
            size={64}
            strokeWidth={5}
          >
            <Text size="2" weight="bold" className={styles.progressNumber}>
              {weeklyCompleted}
            </Text>
          </CircularProgress>
          <Text size="1" className={styles.progressLabel}>Semanais</Text>
        </Flex>

        <Flex direction="column" align="center" gap="2">
          <CircularProgress
            progress={monthlyTotal > 0 ? monthlyCompleted / monthlyTotal : 0}
            size={64}
            strokeWidth={5}
          >
            <Text size="2" weight="bold" className={styles.progressNumber}>
              {monthlyCompleted}
            </Text>
          </CircularProgress>
          <Text size="1" className={styles.progressLabel}>Mensais</Text>
        </Flex>
      </Flex>
    </Box>
  )
}
