import { Flex, Text } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'
import type { Task } from '../../types'
import { TaskItem } from '../TaskItem'
import styles from './styles.module.css'

type TaskListProps = {
  tasks: Task[]
  onSelectTask: (task: Task) => void
  onRemoveTask: (id: string) => void
}

export function TaskList({ tasks, onSelectTask, onRemoveTask }: TaskListProps) {
  const { t } = useTranslation()

  if (tasks.length === 0) {
    return (
      <Flex
        className={styles.emptyState}
        direction="column"
        align="center"
        justify="center"
        py="6"
        gap="2"
      >
        <Text size="4">📋</Text>
        <Text size="3" color="gray" align="center">
          {t('taskList.empty')}
        </Text>
      </Flex>
    )
  }

  return (
    <Flex direction="column" gap="2" className={styles.list}>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onSelect={() => onSelectTask(task)}
          onRemove={() => onRemoveTask(task.id)}
        />
      ))}
    </Flex>
  )
}
