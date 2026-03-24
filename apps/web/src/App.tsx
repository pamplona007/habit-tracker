import { useEffect, useState } from 'react'
import { Flex, Spinner } from '@radix-ui/themes'
import { useAuth } from './context'
import {
  LandingPage,
  LoginPage,
  RegisterPage,
  NoHouseholdPage,
  DashboardPage,
} from './pages'

type Route = '/' | '/login' | '/register'

function getInitialRoute(): Route {
  return (window.location.pathname as Route) || '/'
}

export default function App() {
  const { status } = useAuth()
  const [route, setRoute] = useState<Route>(getInitialRoute)

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const path = (e as CustomEvent<string>).detail
      setRoute(path as Route)
      window.history.pushState({}, '', path)
    }

    window.addEventListener('navigate', handleNavigate)
    return () => window.removeEventListener('navigate', handleNavigate)
  }, [])

  // Loading state
  if (status === 'loading') {
    return (
      <Flex minHeight="100vh" align="center" justify="center">
        <Spinner size="3" />
      </Flex>
    )
  }

  // Unauthenticated → public pages
  if (status === 'unauthenticated') {
    switch (route) {
      case '/login':
        return <LoginPage />
      case '/register':
        return <RegisterPage />
      default:
        return <LandingPage />
    }
  }

  // Authenticated but no household
  if (status === 'no-household') {
    return <NoHouseholdPage />
  }

  // Authenticated with household → Dashboard
  return <DashboardPage />
}
