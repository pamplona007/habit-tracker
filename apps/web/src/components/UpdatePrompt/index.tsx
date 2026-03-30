import { useRegisterSW } from 'virtual:pwa-register/react'
import styles from './styles.module.scss'

export function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  if (needRefresh) {
    return (
      <div className={styles.toast}>
        <span className="material-symbols-outlined">refresh</span>
        <span>New version available!</span>
        <button
          onClick={() => updateServiceWorker()}
          className={styles.reloadBtn}
        >
          Reload
        </button>
      </div>
    )
  }

  return null
}
