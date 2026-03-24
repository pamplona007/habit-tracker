import { Card, Flex, Text } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'
import styles from './styles.module.css'

type StreakCardProps = {
  streak: number
}

export function StreakCard({ streak }: StreakCardProps) {
  const { t } = useTranslation()

  return (
    <Card className={styles.card}>
      <Flex direction="column" align="center" gap="2" py="4">
        <span className={styles.fireEmoji}>🔥</span>
        {streak > 0 ? (
          <>
            <Text className={styles.streakNumber}>{streak}</Text>
            <Text size="3" color="gray" weight="medium">
              {t('streak.days')}
            </Text>
          </>
        ) : (
          <Text size="3" color="gray" align="center">
            {t('streak.start')}
          </Text>
        )}
      </Flex>
    </Card>
  )
}
