import { useState } from 'react'
import {
  Button,
  Dialog,
  Flex,
  Text,
  TextField,
} from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'
import styles from './styles.module.css'

type AddTaskModalProps = {
  open: boolean
  onClose: () => void
  onAdd: (name: string, deadline?: string) => void
}

export function AddTaskModal({ open, onClose, onAdd }: AddTaskModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState('')

  function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t('addTask.nameRequired'))
      return
    }
    onAdd(trimmed, deadline || undefined)
    handleClose()
  }

  function handleClose() {
    setName('')
    setDeadline('')
    setError('')
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Content className={styles.content} maxWidth="420px">
        <Dialog.Title>{t('addTask.title')}</Dialog.Title>
        <Flex direction="column" gap="3" mt="2">
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">
              {t('addTask.nameLabel')}
            </Text>
            <TextField.Root
              placeholder={t('addTask.namePlaceholder')}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            {error && (
              <Text size="1" color="red">
                {error}
              </Text>
            )}
          </Flex>
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">
              {t('addTask.deadlineLabel')}
            </Text>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={styles.dateInput}
            />
          </Flex>
          <Flex gap="2" justify="end" mt="2">
            <Button variant="soft" color="gray" onClick={handleClose}>
              {t('addTask.cancel')}
            </Button>
            <Button onClick={handleAdd}>{t('addTask.add')}</Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
