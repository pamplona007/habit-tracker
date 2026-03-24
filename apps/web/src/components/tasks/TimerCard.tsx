import { Box, Button, Flex, Text } from '@radix-ui/themes'
import type { Task } from '../../api'
import { CircularProgress, TimerDisplay } from './CircularProgress'
import styles from './TimerCard.module.css'

type TimerCardProps = {
  task: Task | null
  isRunning: boolean
  progress: number // 0 to 1
  timeRemaining: string
  onStart: () => void
  onPause: () => void
  onSkip: () => void
  onComplete: () => void
}

export function TimerCard({
  task,
  isRunning,
  progress,
  timeRemaining,
  onStart,
  onPause,
  onSkip,
  onComplete,
}: TimerCardProps) {
  if (!task) {
    return (
      <Box className={styles.emptyCard}>
        <Text size="3" weight="medium" className={styles.emptyTitle}>
          Nenhuma tarefa em foco
        </Text>
        <Text size="2" color="gray" className={styles.emptySubtitle}>
          Selecione uma tarefa para começar
        </Text>
      </Box>
    )
  }

  return (
    <Box className={styles.card}>
      <Flex direction="column" align="center" gap="4" className={styles.content}>
        <Text size="1" weight="medium" className={styles.label}>
          FOCO ATUAL
        </Text>

        <Text size="5" weight="bold" className={styles.taskName}>
          {task.name}
        </Text>

        {task.description && (
          <Text size="2" color="gray" className={styles.taskDescription}>
            {task.description}
          </Text>
        )}

        <Box className={styles.timerWrapper}>
          <CircularProgress progress={progress} size={180} strokeWidth={10}>
            <TimerDisplay
              time={timeRemaining}
              label={isRunning ? 'Restante' : 'Pausado'}
            />
          </CircularProgress>
        </Box>

        <Flex gap="3" className={styles.controls}>
          <Button
            size="3"
            variant="soft"
            className={styles.controlButton}
            onClick={() => {}}
          >
            ↺
          </Button>
          <Button
            size="3"
            className={styles.playButton}
            onClick={isRunning ? onPause : onStart}
          >
            {isRunning ? '⏸' : '▶'}
          </Button>
          <Button
            size="3"
            variant="soft"
            className={styles.controlButton}
            onClick={onSkip}
          >
            ⏭
          </Button>
        </Flex>

        <Button size="2" variant="soft" className={styles.completeButton} onClick={onComplete}>
          Marcar como concluída
        </Button>
      </Flex>
    </Box>
  )
}
