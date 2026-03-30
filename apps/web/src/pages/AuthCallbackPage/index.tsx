import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiClient } from '../../api/client'
import styles from './styles.module.scss'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { loginWithTokens } = useAuth()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)

    const accessToken = params.get('accessToken')
    const error = params.get('error')

    if (error) {
      window.history.replaceState(null, '', window.location.pathname)
      navigate(`/login?oauth_error=${encodeURIComponent(error)}`, { replace: true })
      return
    }

    if (!accessToken) {
      window.history.replaceState(null, '', window.location.pathname)
      navigate('/login', { replace: true })
      return
    }

    const authenticate = async () => {
      try {
        loginWithTokens(accessToken, { id: '', email: '', name: '' } as any)

        const response = await apiClient.get<{ user: any }>('/auth/me')
        const user = response.data.user

        loginWithTokens(accessToken, user)
        window.history.replaceState(null, '', '/auth/callback')
        navigate('/dashboard', { replace: true })
      } catch {
        window.history.replaceState(null, '', window.location.pathname)
        navigate('/login', { replace: true })
      }
    }

    authenticate()
  }, [loginWithTokens, navigate])

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.spinner} />
        <p>Signing you in...</p>
      </div>
    </div>
  )
}
