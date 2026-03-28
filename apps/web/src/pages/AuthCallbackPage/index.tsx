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

    // FIX #1 & #9: Read tokens from URL fragment (#) not query string (?)
    // Fragments are never sent to servers, don't appear in logs or Referer headers
    const hash = window.location.hash.substring(1) // Remove leading #
    const hashParams = new URLSearchParams(hash)

    const accessToken = hashParams.get('accessToken')
    const refreshToken = hashParams.get('refreshToken')
    const userParam = hashParams.get('user')

    // FIX #3: Read error from BOTH fragment (new) and query string (backward compat)
    const error = hashParams.get('error') || new URLSearchParams(window.location.search).get('error')

    // FIX #9: Clean the URL immediately after reading tokens
    // This removes tokens from browser history
    window.history.replaceState(null, '', window.location.pathname)

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
