import { Flex, Text } from '@radix-ui/themes'
import styles from './CircularProgress.module.css'

type CircularProgressProps = {
  progress: number // 0 to 1
  size?: number
  strokeWidth?: number
  children?: React.ReactNode
}

export function CircularProgress({
  progress,
  size = 200,
  strokeWidth = 8,
  children,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - progress * circumference

  return (
    <div className={styles.wrapper} style={{ width: size, height: size }}>
      <svg
        className={styles.svg}
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          className={styles.bg}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          className={styles.progress}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
}

type TimerDisplayProps = {
  time: string
  label: string
}

export function TimerDisplay({ time, label }: TimerDisplayProps) {
  return (
    <Flex direction="column" align="center" gap="1">
      <Text className={styles.timerTime}>{time}</Text>
      <Text size="1" className={styles.timerLabel}>{label}</Text>
    </Flex>
  )
}
