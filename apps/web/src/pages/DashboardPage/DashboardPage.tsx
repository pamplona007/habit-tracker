import { useState } from 'react'
import { Spinner, Flex } from '@radix-ui/themes'
import { useAuth } from '../../context'
import { Sidebar } from '../../components/layout/Sidebar'
import { NoticesTab } from '../../components/notices/NoticesTab'
import { TasksTab } from '../../components/tasks/TasksTab'
import { ShoppingTab } from '../../components/shopping/ShoppingTab'
import { SettingsPage } from '../SettingsPage'

type Tab = 'notices' | 'tasks' | 'shopping' | 'settings'

export function DashboardPage() {
  const { isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('notices')

  if (isLoading) {
    return (
      <Flex minHeight="100vh" align="center" justify="center">
        <Spinner size="3" />
      </Flex>
    )
  }

  return (
    <Sidebar activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'notices' && <NoticesTab />}
      {activeTab === 'tasks' && <TasksTab />}
      {activeTab === 'shopping' && <ShoppingTab />}
      {activeTab === 'settings' && <SettingsPage />}
    </Sidebar>
  )
}
