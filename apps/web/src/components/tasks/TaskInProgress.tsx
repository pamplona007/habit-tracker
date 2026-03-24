import { useEffect, useState } from 'react'
import { Button, Flex, Text } from '@radix-ui/themes'
import type { Task } from '../../api'
import styles from './styles.module.css'

type TaskInProgressProps = {
  task: Task
  onComplete: () => void
  onGiveUp: () => void
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TaskInProgress({ task, onComplete, onGiveUp }: TaskInProgressProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    setElapsed(0)
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [task.id])

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      className={styles.container}
      gap="6"
    >
      <Flex direction="column" align="center" gap="3">
        <Text size="1" weight="medium" color="orange" className={styles.label}>
          🔥 EM ANDAMENTO
        </Text>
        <Text size="7" weight="bold" align="center" className={styles.taskName}>
          {task.name}
        </Text>
        {task.description && (
          <Text size="2" color="gray" align="center">
            {task.description}
          </Text>
        )}
      </Flex>

      <Text className={styles.timer} color="gray">
        {formatElapsed(elapsed)}
      </Text>

      <Flex direction="column" gap="3" className={styles.actions}>
        <Button size="3" className={styles.doneButton} onClick={onComplete}>
          ✓ Marcar como concluída
        </Button>
        <Button size="2" variant="ghost" color="gray" onClick={onGiveUp}>
          Desistir
        </Button>
      </Flex>
    </Flex>
  )
}
