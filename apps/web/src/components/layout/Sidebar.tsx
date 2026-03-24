import { useState } from 'react'
import { Box, Flex, Text, Select, Avatar, IconButton } from '@radix-ui/themes'
import { useAuth } from '../../context'
import { useHouseholds, useSwitchHousehold } from '../../hooks'
import type { ReactNode } from 'react'
import styles from './styles.module.css'

type Tab = 'notices' | 'tasks' | 'shopping' | 'settings'

type SidebarProps = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  children: ReactNode
}

export function Sidebar({ activeTab, onTabChange, children }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const { data: households = [] } = useHouseholds()
  const switchHousehold = useSwitchHousehold()

  function handleHouseholdSwitch(householdId: string) {
    switchHousehold.mutate(householdId)
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?'

  function handleNavClick(tab: Tab) {
    onTabChange(tab)
    setMobileOpen(false)
  }

  return (
    <>
      {/* Mobile hamburger — fixed, always visible */}
      <Box className={styles.mobileHeader}>
        <IconButton
          variant="ghost"
          size="2"
          onClick={() => setMobileOpen(!mobileOpen)}
          className={styles.hamburger}
        >
          {mobileOpen ? '✕' : '☰'}
        </IconButton>
        <Text size="3" weight="bold">
          🏠 {households.find((h) => h.id === user?.currentHouseholdId)?.name ?? '...'}
        </Text>
        <Avatar size="1" radius="full" fallback={initials} className={styles.mobileAvatar} />
      </Box>

      {/* Mobile overlay */}
      {mobileOpen && (
        <Box className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Main layout: sidebar + content */}
      <Box className={styles.layoutWrapper}>
        {/* Sidebar */}
        <Box className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <Flex direction="column" justify="between" height="100%">
          <Flex direction="column" gap="5">
            <Flex justify="between" align="center">
              <Text size="4" weight="bold" className={styles.appName}>
                🏠 Habit Tracker
              </Text>
              {/* Close button on mobile */}
              <IconButton
                variant="ghost"
                size="1"
                className={styles.closeButton}
                onClick={() => setMobileOpen(false)}
              >
                ✕
              </IconButton>
            </Flex>

            {/* Household selector */}
            <Flex direction="column" gap="1">
              <Text size="1" color="gray" weight="medium">
                Casa
              </Text>
              <Select.Root
                value={user?.currentHouseholdId ?? ''}
                onValueChange={handleHouseholdSwitch}
              >
                <Select.Trigger className={styles.householdSelect} />
                <Select.Content>
                  {households.map((h) => (
                    <Select.Item key={h.id} value={h.id}>
                      {h.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            {/* Navigation */}
            <Flex direction="column" gap="1" mt="2">
              <Text size="1" color="gray" weight="medium">
                Menu
              </Text>
              <NavButton
                active={activeTab === 'notices'}
                onClick={() => handleNavClick('notices')}
              >
                📌 Avisos
              </NavButton>
              <NavButton
                active={activeTab === 'tasks'}
                onClick={() => handleNavClick('tasks')}
              >
                ✅ Tarefas
              </NavButton>
              <NavButton
                active={activeTab === 'shopping'}
                onClick={() => handleNavClick('shopping')}
              >
                🛒 Compras
              </NavButton>
              <NavButton onClick={() => handleNavClick('settings')}>
                ⚙️ Configurações
              </NavButton>
            </Flex>
          </Flex>

          {/* User info */}
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <Avatar size="2" radius="full" fallback={initials} className={styles.avatar} />
              <Text size="2" className={styles.userName}>{user?.name ?? user?.email}</Text>
            </Flex>
            <NavButton onClick={logout}>
              Sair
            </NavButton>
          </Flex>
        </Flex>
      </Box>

      {/* Main content */}
      <Box className={styles.content}>{children}</Box>
      </Box>
    </>
  )
}

function NavButton({
  children,
  active,
  onClick,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
}) {
  return (
    <Box
      className={`${styles.navButton} ${active ? styles.navButtonActive : ''}`}
      onClick={onClick}
    >
      <Text size="2">{children}</Text>
    </Box>
  )
}
