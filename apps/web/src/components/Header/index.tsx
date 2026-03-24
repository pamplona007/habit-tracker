import { Flex, Heading, IconButton } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'
import styles from './styles.module.css'

type HeaderProps = {
  onOpenGoals: () => void
}

export function Header({ onOpenGoals }: HeaderProps) {
  const { t } = useTranslation()

  return (
    <Flex
      className={styles.header}
      align="center"
      justify="between"
      py="3"
    >
      <Heading size="5" weight="bold">
        {t('appName')}
      </Heading>
      <IconButton
        variant="ghost"
        size="2"
        aria-label={t('header.openGoals')}
        onClick={onOpenGoals}
        className={styles.gearButton}
      >
        ⚙️
      </IconButton>
    </Flex>
  )
}
