import { useState } from 'react'
import {
  Button,
  Flex,
  Heading,
  IconButton,
  Select,
  Text,
  TextField,
} from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'
import type { Goals } from '../../types'
import styles from './styles.module.css'

type GoalsSettingsProps = {
  goals: Goals
  onSave: (goals: Goals) => void
  onBack: () => void
}

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
]

export function GoalsSettings({ goals, onSave, onBack }: GoalsSettingsProps) {
  const { t, i18n } = useTranslation()
  const [weekly, setWeekly] = useState(String(goals.weeklyMinDays))
  const [monthly, setMonthly] = useState(String(goals.monthlyMinDays))
  const [errors, setErrors] = useState<{ weekly?: string; monthly?: string }>({})

  function validate(): boolean {
    const errs: { weekly?: string; monthly?: string } = {}
    const w = Number(weekly)
    const m = Number(monthly)
    if (!weekly || isNaN(w) || w < 1 || w > 7) {
      errs.weekly = t('goals.weeklyError')
    }
    if (!monthly || isNaN(m) || m < 1 || m > 31) {
      errs.monthly = t('goals.monthlyError')
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    onSave({ weeklyMinDays: Number(weekly), monthlyMinDays: Number(monthly) })
    onBack()
  }

  function handleLanguageChange(lang: string) {
    i18n.changeLanguage(lang)
  }

  return (
    <Flex direction="column" gap="4" className={styles.container}>
      <Flex align="center" gap="2" className={styles.topBar}>
        <IconButton
          variant="ghost"
          size="2"
          color="gray"
          aria-label={t('goals.back')}
          onClick={onBack}
          className={styles.backButton}
        >
          ←
        </IconButton>
        <Heading size="5">{t('settings.title')}</Heading>
      </Flex>

      {/* Goals section */}
      <Heading size="4" mt="2">
        {t('goals.title')}
      </Heading>

      <Text size="2" color="gray">
        {t('goals.description')}
      </Text>

      <Flex direction="column" gap="1">
        <Text size="2" weight="medium">
          {t('goals.weeklyLabel')}
        </Text>
        <TextField.Root
          type="number"
          min={1}
          max={7}
          value={weekly}
          onChange={(e) => {
            setWeekly(e.target.value)
            setErrors((prev) => ({ ...prev, weekly: undefined }))
          }}
        />
        {errors.weekly && (
          <Text size="1" color="red">
            {errors.weekly}
          </Text>
        )}
        <Text size="1" color="gray">
          {t('goals.weeklyHint')}
        </Text>
      </Flex>

      <Flex direction="column" gap="1">
        <Text size="2" weight="medium">
          {t('goals.monthlyLabel')}
        </Text>
        <TextField.Root
          type="number"
          min={1}
          max={31}
          value={monthly}
          onChange={(e) => {
            setMonthly(e.target.value)
            setErrors((prev) => ({ ...prev, monthly: undefined }))
          }}
        />
        {errors.monthly && (
          <Text size="1" color="red">
            {errors.monthly}
          </Text>
        )}
        <Text size="1" color="gray">
          {t('goals.monthlyHint')}
        </Text>
      </Flex>

      <Button size="3" onClick={handleSave} className={styles.saveButton}>
        {t('goals.save')}
      </Button>

      {/* Language section */}
      <Heading size="4" mt="4">
        {t('language.title')}
      </Heading>

      <Flex direction="column" gap="1">
        <Text size="2" weight="medium">
          {t('language.label')}
        </Text>
        <Select.Root
          value={i18n.resolvedLanguage ?? i18n.language}
          onValueChange={handleLanguageChange}
        >
          <Select.Trigger />
          <Select.Content>
            {LANGUAGES.map((lang) => (
              <Select.Item key={lang.value} value={lang.value}>
                {lang.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>
    </Flex>
  )
}
