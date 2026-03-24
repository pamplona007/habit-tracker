import { Button, Dialog, Flex, Text } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'
import type { Task } from '../../types'
import styles from './styles.module.css'

type CompletionModalProps = {
  open: boolean
  task: Task | null
  onComplete: (taskId: string, partial: boolean) => void
  onClose: () => void
}

export function CompletionModal({
  open,
  task,
  onComplete,
  onClose,
}: CompletionModalProps) {
  const { t } = useTranslation()

  if (!task) return null

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Content className={styles.content} maxWidth="420px">
        <Dialog.Title>{t('completion.title')}</Dialog.Title>
        <Text size="2" color="gray" mb="4" as="p">
          "{task.name}"
        </Text>
        <Flex direction="column" gap="3" mt="2">
          <Button
            size="3"
            className={styles.fullButton}
            onClick={() => onComplete(task.id, false)}
          >
            {t('completion.fullyCompleted')}
          </Button>
          <Button
            size="3"
            variant="soft"
            className={styles.partialButton}
            onClick={() => onComplete(task.id, true)}
          >
            {t('completion.partiallyCompleted')}
          </Button>
          <Button size="2" variant="ghost" color="gray" onClick={onClose}>
            {t('completion.cancel')}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
