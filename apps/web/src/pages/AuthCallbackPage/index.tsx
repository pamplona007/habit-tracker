import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './styles.module.css'

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithToken } = useAuth()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const token = searchParams.get('token')
    const userParam = searchParams.get('user')
    const error = searchParams.get('error')

    if (error) {
      navigate(`/login?oauth_error=${encodeURIComponent(error)}`, { replace: true })
      return
    }

    if (!token || !userParam) {
      navigate('/login', { replace: true })
      return
    }

    try {
      const user = JSON.parse(decodeURIComponent(userParam))
      loginWithToken(token, user)
      navigate('/dashboard', { replace: true })
    } catch {
      navigate('/login', { replace: true })
    }
  }, [searchParams, loginWithToken, navigate])

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.spinner} />
        <p>Signing you in...</p>
      </div>
    </div>
  )
}
