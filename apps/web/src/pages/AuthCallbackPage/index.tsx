import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './styles.module.css'

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithTokens } = useAuth()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')
    const userParam = searchParams.get('user')
    const error = searchParams.get('error')

    if (error) {
      navigate(`/login?oauth_error=${encodeURIComponent(error)}`, { replace: true })
      return
    }

    if (!accessToken || !refreshToken || !userParam) {
      navigate('/login', { replace: true })
      return
    }

    try {
      const user = JSON.parse(decodeURIComponent(userParam))
      loginWithTokens(accessToken, refreshToken, user)
      navigate('/dashboard', { replace: true })
    } catch {
      navigate('/login', { replace: true })
    }
  }, [searchParams, loginWithTokens, navigate])

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.spinner} />
        <p>Signing you in...</p>
      </div>
    </div>
  )
}
