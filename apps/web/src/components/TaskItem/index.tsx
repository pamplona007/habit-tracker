import { Badge, Flex, IconButton, Text } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'
import type { Task } from '../../types'
import { formatDeadline, today } from '../../utils/dates'
import styles from './styles.module.css'

type TaskItemProps = {
  task: Task
  onSelect: () => void
  onRemove: () => void
}

function isOverdue(deadline: string): boolean {
  return deadline < today()
}

export function TaskItem({ task, onSelect, onRemove }: TaskItemProps) {
  const { t } = useTranslation()
  const completed = Boolean(task.completedAt)

  return (
    <Flex
      className={`${styles.row} ${completed ? styles.completed : ''}`}
      align="center"
      justify="between"
      px="3"
      py="3"
      gap="3"
      onClick={completed ? undefined : onSelect}
    >
      <Flex align="center" gap="2" className={styles.taskInfo}>
        {completed && (
          <Text size="2" className={styles.checkmark}>
            {task.partiallyCompleted ? '🟡' : '✅'}
          </Text>
        )}
        <Text
          size="3"
          weight="medium"
          className={completed ? styles.completedText : ''}
        >
          {task.name}
        </Text>
        {task.deadline && (
          <Badge
            color={isOverdue(task.deadline) && !completed ? 'red' : 'gray'}
            size="1"
          >
            {formatDeadline(task.deadline)}
          </Badge>
        )}
      </Flex>
      <IconButton
        variant="ghost"
        size="1"
        color="gray"
        aria-label={t('goals.back')}
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className={styles.deleteButton}
      >
        ✕
      </IconButton>
    </Flex>
  )
}
