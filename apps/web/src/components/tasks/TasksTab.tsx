import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Flex,
  Text,
  IconButton,
  Dialog,
  Select,
  TextField,
  TextArea,
  Badge,
  Checkbox,
} from '@radix-ui/themes'
import { useAuth } from '../../context'
import {
  useTasks,
  useCreateTask,
  useCompleteTask,
  useToggleTask,
  useDeleteTask,
} from '../../hooks'
import type { Task, TaskType } from '../../api'
import { TimerCard } from './TimerCard'
import { WeekProgress } from './WeekProgress'
import { CompletionModal } from './CompletionModal'
import styles from './TasksTab.module.css'

const TYPE_COLORS: Record<TaskType, 'gray' | 'blue' | 'green' | 'orange' | 'purple'> = {
  DAILY: 'blue',
  WEEKLY: 'green',
  MONTHLY: 'orange',
  ONE_TIME: 'purple',
}

const TYPE_LABELS: Record<TaskType, string> = {
  DAILY: 'Diária',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  ONE_TIME: 'Pontual',
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

type FilterType = 'ALL' | TaskType

const FOCUS_DURATION = 25 * 60 // 25 minutes in seconds

export function TasksTab() {
  const { user } = useAuth()
  const householdId = user?.currentHouseholdId ?? null
  const { data: tasks = [], isLoading } = useTasks(householdId)
  const createTask = useCreateTask()
  const completeTask = useCompleteTask()
  const toggleTask = useToggleTask()
  const deleteTask = useDeleteTask()

  const [filter, setFilter] = useState<FilterType>('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TaskType>('ONE_TIME')
  const [dayOfWeek, setDayOfWeek] = useState('2')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [deadline, setDeadline] = useState('')

  // Timer state
  const [focusTask, setFocusTask] = useState<Task | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [completionModalOpen, setCompletionModalOpen] = useState(false)

  // Timer interval
  useEffect(() => {
    if (!isRunning || !focusTask) return
    const interval = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= FOCUS_DURATION) {
          setIsRunning(false)
          return FOCUS_DURATION
        }
        return prev + 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, focusTask])

  const progress = elapsed / FOCUS_DURATION
  const timeRemaining = formatTime(FOCUS_DURATION - elapsed)

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function handleStartTimer(task: Task) {
    setFocusTask(task)
    setElapsed(0)
    setIsRunning(true)
  }

  function handlePauseTimer() {
    setIsRunning(false)
  }

  function handleResumeTimer() {
    if (focusTask && elapsed < FOCUS_DURATION) {
      setIsRunning(true)
    }
  }

  function handleSkipTimer() {
    setIsRunning(false)
    setElapsed(0)
  }

  function handleComplete(type: 'FULL' | 'PARTIAL') {
    if (!householdId || !focusTask) return
    completeTask.mutate(
      { householdId, taskId: focusTask.id, type },
      { onSuccess: () => { setFocusTask(null); setIsRunning(false); setElapsed(0); setCompletionModalOpen(false) } }
    )
  }

  function handleGiveUpTimer() {
    setFocusTask(null)
    setIsRunning(false)
    setElapsed(0)
  }

  function handleToggle(task: Task) {
    if (!householdId) return
    const isCompleted = task.completions.length > 0
    if (isCompleted) {
      toggleTask.mutate({ householdId, taskId: task.id })
    } else {
      handleStartTimer(task)
    }
  }

  function handleRandomTask() {
    const incomplete = tasks.filter((t) => t.completions.length === 0)
    if (incomplete.length === 0) return
    const random = incomplete[Math.floor(Math.random() * incomplete.length)]
    handleStartTimer(random)
  }

  function handleDelete(taskId: string) {
    if (!householdId) return
    deleteTask.mutate({ householdId, taskId })
  }

  function resetForm() {
    setName(''); setDescription(''); setType('ONE_TIME')
    setDayOfWeek('2'); setDayOfMonth('1'); setDeadline('')
  }

  function handleCreate() {
    if (!name.trim() || !householdId) return
    const data: Partial<Task> = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      dayOfWeek: type === 'WEEKLY' ? Number(dayOfWeek) : undefined,
      dayOfMonth: type === 'MONTHLY' ? Number(dayOfMonth) : undefined,
      deadline: type === 'ONE_TIME' && deadline ? new Date(deadline).toISOString() : undefined,
    }
    createTask.mutate(
      { householdId, data },
      { onSuccess: () => { setCreateOpen(false); resetForm() } }
    )
  }

  const filtered = filter === 'ALL' ? tasks : tasks.filter((t) => t.type === filter)

  // Calculate week progress
  const dailyTasks = tasks.filter((t) => t.type === 'DAILY')
  const weeklyTasks = tasks.filter((t) => t.type === 'WEEKLY')
  const monthlyTasks = tasks.filter((t) => t.type === 'MONTHLY')

  const today = new Date().getDay()
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - today)
  weekStart.setHours(0, 0, 0, 0)

  const weeklyCompleted = weeklyTasks.filter((t) =>
    t.completions.some((c) => new Date(c.completedAt) >= weekStart)
  ).length

  const monthlyCompleted = monthlyTasks.filter((t) =>
    t.completions.some((c) => {
      const d = new Date(c.completedAt)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
  ).length

  const filters: { value: FilterType; label: string }[] = [
    { value: 'ALL', label: 'Todas' },
    { value: 'DAILY', label: 'Diárias' },
    { value: 'WEEKLY', label: 'Semanais' },
    { value: 'MONTHLY', label: 'Mensais' },
    { value: 'ONE_TIME', label: 'Pontuais' },
  ]

  return (
    <Flex direction="column" gap="4" className={styles.container}>
      {/* Timer Card (Hero) */}
      <TimerCard
        task={focusTask}
        isRunning={isRunning}
        progress={progress}
        timeRemaining={timeRemaining}
        onStart={focusTask ? (isRunning ? handlePauseTimer : handleResumeTimer) : () => {}}
        onPause={handlePauseTimer}
        onSkip={handleSkipTimer}
        onComplete={() => setCompletionModalOpen(true)}
      />

      {/* Week Progress */}
      <WeekProgress
        dailyCompleted={dailyTasks.filter((t) => t.completions.length > 0).length}
        dailyTotal={dailyTasks.length}
        weeklyCompleted={weeklyCompleted}
        weeklyTotal={weeklyTasks.length}
        monthlyCompleted={monthlyCompleted}
        monthlyTotal={monthlyTasks.length}
      />

      {/* Tasks Section */}
      <Box className={styles.tasksSection}>
        <Flex justify="between" align="center" mb="3">
          <Text size="3" weight="bold" className={styles.sectionTitle}>
            Suas tarefas
          </Text>
          <Button size="1" variant="soft" onClick={() => setCreateOpen(true)}>
            + Nova
          </Button>
        </Flex>

        {/* Filter Tabs */}
        <Flex gap="2" className={styles.filterTabs}>
          {filters.map((f) => (
            <Box
              key={f.value}
              className={`${styles.filterTab} ${filter === f.value ? styles.filterTabActive : ''}`}
              onClick={() => setFilter(f.value)}
            >
              <Text size="1" weight="medium">{f.label}</Text>
            </Box>
          ))}
        </Flex>

        {/* Random Task Button */}
        {tasks.filter((t) => t.completions.length === 0).length > 0 && (
          <Button
            size="2"
            variant="soft"
            onClick={handleRandomTask}
            className={styles.randomButton}
          >
            🎲 Escolher aleatória
          </Button>
        )}

        {/* Task List */}
        {isLoading && (
          <Text size="2" color="gray" className={styles.loading}>Carregando...</Text>
        )}

        {filtered.length === 0 && !isLoading && (
          <Box className={styles.emptyCard}>
            <Text size="2" color="gray">
              Nenhuma tarefa{filter !== 'ALL' ? ' neste filtro' : ''}.
            </Text>
          </Box>
        )}

        <Flex direction="column" gap="2" mt="3">
          {filtered.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => handleToggle(task)}
              onDelete={() => handleDelete(task.id)}
            />
          ))}
        </Flex>
      </Box>

      {/* Give Up Button (when timer active) */}
      {focusTask && (
        <Button
          size="2"
          variant="ghost"
          color="gray"
          onClick={handleGiveUpTimer}
          className={styles.giveUpButton}
        >
          Desistir do foco
        </Button>
      )}

      {/* Completion Modal */}
      <CompletionModal
        open={completionModalOpen}
        task={focusTask}
        onComplete={handleComplete}
        onClose={() => setCompletionModalOpen(false)}
      />

      {/* Create Task Dialog */}
      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Content className={styles.dialogContent}>
          <Dialog.Title className={styles.dialogTitle}>Nova tarefa</Dialog.Title>
          <Flex direction="column" gap="3" mt="2">
            <Box>
              <Text size="2" mb="1" as="label" className={styles.fieldLabel}>Nome</Text>
              <TextField.Root
                placeholder="Ex: Levar lixo"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                autoFocus
              />
            </Box>
            <Box>
              <Text size="2" mb="1" as="label" className={styles.fieldLabel}>Descrição (opcional)</Text>
              <TextArea
                placeholder="Detalhes..."
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                rows={2}
              />
            </Box>
            <Box>
              <Text size="2" mb="1" as="label" className={styles.fieldLabel}>Tipo</Text>
              <Select.Root value={type} onValueChange={(v: string) => setType(v as TaskType)}>
                <Select.Trigger style={{ width: '100%' }} />
                <Select.Content>
                  {(['DAILY', 'WEEKLY', 'MONTHLY', 'ONE_TIME'] as TaskType[]).map((t) => (
                    <Select.Item key={t} value={t}>{TYPE_LABELS[t]}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Box>
            {type === 'WEEKLY' && (
              <Box>
                <Text size="2" mb="1" as="label" className={styles.fieldLabel}>Dia da semana</Text>
                <Select.Root value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    {DAY_NAMES.map((d, i) => (
                      <Select.Item key={i} value={String(i)}>{d}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Box>
            )}
            {type === 'MONTHLY' && (
              <Box>
                <Text size="2" mb="1" as="label" className={styles.fieldLabel}>Dia do mês</Text>
                <TextField.Root
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDayOfMonth(e.target.value)}
                />
              </Box>
            )}
            {type === 'ONE_TIME' && (
              <Box>
                <Text size="2" mb="1" as="label" className={styles.fieldLabel}>Prazo</Text>
                <TextField.Root
                  type="date"
                  value={deadline}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeadline(e.target.value)}
                />
              </Box>
            )}
            <Flex justify="end" gap="2" mt="2">
              <Dialog.Close>
                <Button variant="soft" color="gray" onClick={resetForm}>Cancelar</Button>
              </Dialog.Close>
              <Button onClick={handleCreate} disabled={!name.trim()}>Criar</Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  )
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const isCompleted = task.completions.length > 0
  const isPartial = task.completions.some((c) => c.type === 'PARTIAL')

  function getScheduleLabel(): string {
    if (task.type === 'WEEKLY' && task.dayOfWeek !== null) return DAY_NAMES[task.dayOfWeek]
    if (task.type === 'MONTHLY' && task.dayOfMonth !== null) return `Dia ${task.dayOfMonth}`
    if (task.type === 'ONE_TIME' && task.deadline) {
      return new Date(task.deadline).toLocaleDateString('pt-BR')
    }
    return TYPE_LABELS[task.type]
  }

  return (
    <Box className={`${styles.taskRow} ${isCompleted ? styles.taskRowCompleted : ''}`}>
      <Flex gap="3" align="center">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={onToggle}
          className={styles.checkbox}
        />
        <Flex direction="column" style={{ flex: 1 }} gap="1">
          <Flex gap="2" align="center">
            <Text
              size="2"
              weight="medium"
              className={isCompleted ? styles.completedText : ''}
            >
              {task.name}
            </Text>
            <Badge color={TYPE_COLORS[task.type]} size="1">{getScheduleLabel()}</Badge>
            {isPartial && <Text size="1">🟡</Text>}
          </Flex>
          {task.description && (
            <Text size="1" className={styles.taskDescription}>{task.description}</Text>
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
    </Box>
  )
}
