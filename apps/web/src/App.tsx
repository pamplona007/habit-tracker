import { useState } from 'react'
import { Button, Flex, Heading, Text } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'
import type { Task } from './types'
import { useAppState } from './hooks/useAppState'
import { useStreak } from './hooks/useStreak'
import { Header } from './components/Header'
import { StreakCard } from './components/StreakCard'
import { TaskList } from './components/TaskList'
import { AddTaskModal } from './components/AddTaskModal'
import { RandomTaskModal } from './components/RandomTaskModal'
import { TaskInProgress } from './components/TaskInProgress'
import { CompletionModal } from './components/CompletionModal'
import { GoalsSettings } from './components/GoalsSettings'
import styles from './App.module.css'

type View = 'home' | 'in-progress' | 'goals'

export default function App() {
  const { t } = useTranslation()
  const { tasks, goals, addTask, completeTask, removeTask, updateGoals } =
    useAppState()
  const streak = useStreak()

  const [view, setView] = useState<View>('home')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [randomTaskOpen, setRandomTaskOpen] = useState(false)
  const [completionOpen, setCompletionOpen] = useState(false)

  function handleSelectTask(task: Task) {
    setSelectedTask(task)
    setView('in-progress')
  }

  function handleStartRandomTask(task: Task) {
    setRandomTaskOpen(false)
    setSelectedTask(task)
    setView('in-progress')
  }

  function handleMarkDone() {
    setCompletionOpen(true)
  }

  function handleGiveUp() {
    setSelectedTask(null)
    setView('home')
  }

  function handleCompletion(taskId: string, partial: boolean) {
    completeTask(taskId, partial)
    setCompletionOpen(false)
    setSelectedTask(null)
    setView('home')
  }

  function handleCloseCompletion() {
    setCompletionOpen(false)
  }

  if (view === 'goals') {
    return (
      <div className={styles.container}>
        <GoalsSettings
          goals={goals}
          onSave={updateGoals}
          onBack={() => setView('home')}
        />
      </div>
    )
  }

  if (view === 'in-progress' && selectedTask) {
    return (
      <div className={styles.container}>
        <TaskInProgress
          task={selectedTask}
          onComplete={handleMarkDone}
          onGiveUp={handleGiveUp}
        />
        <CompletionModal
          open={completionOpen}
          task={selectedTask}
          onComplete={handleCompletion}
          onClose={handleCloseCompletion}
        />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Header onOpenGoals={() => setView('goals')} />
      <StreakCard streak={streak} />

      <Flex direction="column" gap="3">
        <Flex align="center" justify="between">
          <Heading size="4">{t('home.todaysTasks')}</Heading>
          <Text size="1" color="gray">
            {t('home.pending', { count: tasks.filter((t) => !t.completedAt).length })}
          </Text>
        </Flex>
        <TaskList
          tasks={tasks}
          onSelectTask={handleSelectTask}
          onRemoveTask={removeTask}
        />
      </Flex>

      <Flex className={styles.actionBar} gap="2">
        <Button
          variant="soft"
          size="3"
          onClick={() => setRandomTaskOpen(true)}
          className={styles.actionButton}
        >
          {t('home.pickRandom')}
        </Button>
        <Button
          size="3"
          onClick={() => setAddTaskOpen(true)}
          className={styles.actionButton}
        >
          {t('home.addTask')}
        </Button>
      </Flex>

      <AddTaskModal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onAdd={addTask}
      />
      <RandomTaskModal
        open={randomTaskOpen}
        onClose={() => setRandomTaskOpen(false)}
        tasks={tasks}
        onStart={handleStartRandomTask}
      />
    </div>
  )
}
