import { Button, Dialog, Flex, Text } from '@radix-ui/themes'
import type { Task } from '../../api'
import styles from './styles.module.css'

type CompletionModalProps = {
  open: boolean
  task: Task | null
  onComplete: (type: 'FULL' | 'PARTIAL') => void
  onClose: () => void
}

export function CompletionModal({ open, task, onComplete, onClose }: CompletionModalProps) {
  if (!task) return null

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Content className={styles.content} maxWidth="380px">
        <Dialog.Title className={styles.title}>Como foi?</Dialog.Title>
        <Text size="2" color="gray" mb="4" className={styles.taskName}>
          "{task.name}"
        </Text>
        <Flex direction="column" gap="3" mt="2">
          <Button
            size="3"
            className={styles.fullButton}
            onClick={() => onComplete('FULL')}
          >
            ✅ Totalmente concluída
          </Button>
          <Button
            size="3"
            variant="soft"
            className={styles.partialButton}
            onClick={() => onComplete('PARTIAL')}
          >
            🟡 Parcialmente concluída
          </Button>
          <Button size="2" variant="ghost" color="gray" onClick={onClose}>
            Cancelar
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
