import { useEffect, useState } from 'react'
import { Badge, Button, Dialog, Flex, Text } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'
import type { Task } from '../../types'
import { formatDeadline, today } from '../../utils/dates'
import styles from './styles.module.css'

type RandomTaskModalProps = {
  open: boolean
  onClose: () => void
  tasks: Task[]
  onStart: (task: Task) => void
}

function getPendingTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.completedAt)
}

function pickRandom(tasks: Task[]): Task | null {
  if (tasks.length === 0) return null
  return tasks[Math.floor(Math.random() * tasks.length)]
}

function isOverdue(deadline: string): boolean {
  return deadline < today()
}

export function RandomTaskModal({
  open,
  onClose,
  tasks,
  onStart,
}: RandomTaskModalProps) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Task | null>(null)

  useEffect(() => {
    if (open) {
      setSelected(pickRandom(getPendingTasks(tasks)))
    }
  }, [open, tasks])

  const pending = getPendingTasks(tasks)

  function handlePickAnother() {
    const others = pending.filter((t) => t.id !== selected?.id)
    setSelected(pickRandom(others.length > 0 ? others : pending))
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Content className={styles.content} maxWidth="420px">
        <Dialog.Title>{t('randomTask.title')}</Dialog.Title>
        {pending.length === 0 ? (
          <Flex direction="column" align="center" gap="3" py="4">
            <Text size="4">🎉</Text>
            <Text size="3" color="gray" align="center">
              {t('randomTask.allDone')}
            </Text>
            <Button variant="soft" color="gray" onClick={onClose}>
              {t('randomTask.close')}
            </Button>
          </Flex>
        ) : selected ? (
          <Flex direction="column" gap="4" mt="2">
            <Flex
              direction="column"
              align="center"
              gap="2"
              className={styles.taskBox}
              py="4"
              px="3"
            >
              <Text size="5" weight="bold" align="center">
                {selected.name}
              </Text>
              {selected.deadline && (
                <Badge
                  color={isOverdue(selected.deadline) ? 'red' : 'gray'}
                  size="1"
                >
                  {t('randomTask.due', { date: formatDeadline(selected.deadline) })}
                </Badge>
              )}
            </Flex>
            <Flex gap="2" justify="center">
              <Button
                variant="soft"
                color="gray"
                onClick={handlePickAnother}
                disabled={pending.length <= 1}
              >
                {t('randomTask.pickAnother')}
              </Button>
              <Button onClick={() => onStart(selected)}>
                {t('randomTask.letsDoIt')}
              </Button>
            </Flex>
          </Flex>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  )
}
