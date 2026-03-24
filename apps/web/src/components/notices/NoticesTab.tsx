import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  IconButton,
  Text,
  TextField,
  TextArea,
  Dialog,
  Select,
  Badge,
} from '@radix-ui/themes'
import { useAuth } from '../../context'
import { useNotices, useCreateNotice, useDeleteNotice } from '../../hooks'
import type { Notice, NoticePriority } from '../../api'
import styles from './styles.module.css'

const PRIORITY_COLORS: Record<NoticePriority, 'red' | 'orange' | 'gray' | 'green'> = {
  urgent: 'red',
  high: 'orange',
  normal: 'gray',
  low: 'gray',
}

const PRIORITY_LABELS: Record<NoticePriority, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baixa',
}

export function NoticesTab() {
  const { user } = useAuth()
  const householdId = user?.currentHouseholdId ?? null
  const { data: notices = [], isLoading } = useNotices(householdId)
  const createNotice = useCreateNotice()
  const deleteNotice = useDeleteNotice()

  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<NoticePriority>('normal')

  function handleCreate() {
    if (!title.trim() || !householdId) return
    createNotice.mutate(
      { householdId, data: { title: title.trim(), content: content.trim(), priority } },
      { onSuccess: () => { setCreateOpen(false); setTitle(''); setContent(''); setPriority('normal') } }
    )
  }

  function handleDelete(noticeId: string) {
    if (!householdId) return
    deleteNotice.mutate({ householdId, noticeId })
  }

  const sorted = [...notices].sort((a, b) => {
    const order: Record<NoticePriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 }
    return order[a.priority] - order[b.priority]
  })

  return (
    <Flex direction="column" gap="4" className={styles.container}>
      <Flex justify="between" align="center">
        <Heading size="5">📌 Avisos</Heading>
        <Button size="2" onClick={() => setCreateOpen(true)}>
          + Novo aviso
        </Button>
      </Flex>

      {isLoading && <Text color="gray">Carregando...</Text>}

      {sorted.length === 0 && !isLoading && (
        <Card className={styles.emptyCard}>
          <Text color="gray" size="2">
            Nenhum aviso ainda. Clique em "+ Novo aviso" para criar.
          </Text>
        </Card>
      )}

      <Flex direction="column" gap="2">
        {sorted.map((notice) => (
          <NoticeCard key={notice.id} notice={notice} onDelete={() => handleDelete(notice.id)} />
        ))}
      </Flex>

      {/* Create Dialog */}
      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Content className={styles.dialogContent}>
          <Dialog.Title>Novo aviso</Dialog.Title>
          <Flex direction="column" gap="3" mt="2">
            <Box>
              <Text size="2" mb="1" as="label">Título</Text>
              <TextField.Root
                placeholder="Ex: Reunião domingo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </Box>
            <Box>
              <Text size="2" mb="1" as="label">Conteúdo</Text>
              <TextArea
                placeholder="Detalhes do aviso..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
              />
            </Box>
            <Box>
              <Text size="2" mb="1" as="label">Prioridade</Text>
              <Select.Root value={priority} onValueChange={(v) => setPriority(v as NoticePriority)}>
                <Select.Trigger />
                <Select.Content>
                  {(['urgent', 'high', 'normal', 'low'] as NoticePriority[]).map((p) => (
                    <Select.Item key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Box>
            <Flex justify="end" gap="2" mt="2">
              <Dialog.Close>
                <Button variant="soft" color="gray">Cancelar</Button>
              </Dialog.Close>
              <Button onClick={handleCreate} disabled={!title.trim()}>
                Criar
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  )
}

function NoticeCard({ notice, onDelete }: { notice: Notice; onDelete: () => void }) {
  return (
    <Card className={styles.noticeCard}>
      <Flex justify="between" align="start">
        <Flex direction="column" gap="1" style={{ flex: 1 }}>
          <Flex gap="2" align="center">
            <Text weight="bold" size="3">{notice.title}</Text>
            <Badge color={PRIORITY_COLORS[notice.priority]} size="1">
              {PRIORITY_LABELS[notice.priority]}
            </Badge>
          </Flex>
          {notice.content && (
            <Text size="2" color="gray">{notice.content}</Text>
          )}
        </Flex>
        <IconButton
          variant="ghost"
          size="1"
          color="gray"
          onClick={onDelete}
          className={styles.deleteButton}
        >
          ✕
        </IconButton>
      </Flex>
    </Card>
  )
}
