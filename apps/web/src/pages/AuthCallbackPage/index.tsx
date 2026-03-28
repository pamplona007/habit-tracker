import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './styles.module.css'

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
    const userParam = params.get('user')
    const error = params.get('error')

    if (error) {
      window.history.replaceState(null, '', window.location.pathname)
      navigate(`/login?oauth_error=${encodeURIComponent(error)}`, { replace: true })
      return
    }

    if (!accessToken || !userParam) {
      window.history.replaceState(null, '', window.location.pathname)
      navigate('/login', { replace: true })
      return
    }

    try {
      const user = JSON.parse(decodeURIComponent(userParam))
      loginWithTokens(accessToken, user)
      window.history.replaceState(null, '', '/auth/callback')
      navigate('/dashboard', { replace: true })
    } catch {
      window.history.replaceState(null, '', window.location.pathname)
      navigate('/login', { replace: true })
    }
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
