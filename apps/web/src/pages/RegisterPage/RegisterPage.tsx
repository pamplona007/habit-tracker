import { useState } from 'react'
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  TextField,
  Separator,
} from '@radix-ui/themes'
import { useAuth } from '../../context'
import { Link } from '../../types/ui'
import { HouseholdStep } from './HouseholdStep'
import styles from './styles.module.css'

type Step = 'register' | 'household'

export function RegisterPage() {
  const { register, isRegistering, registerError } = useAuth()
  const [step, setStep] = useState<Step>('register')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleRegisterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    register(
      { email, password, name: name || undefined },
      {
        onSuccess: () => setStep('household'),
      }
    )
  }

  if (step === 'household') {
    return <HouseholdStep email={email} />
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.card}>
        <Flex direction="column" gap="5">
          <Flex direction="column" gap="2">
            <Heading size="7" align="center">
              Criar conta
            </Heading>
            <Text size="2" color="gray" align="center">
              Organize sua casa com a família
            </Text>
          </Flex>

          <Separator size="4" />

          <form onSubmit={handleRegisterSubmit} className={styles.form}>
            <Flex direction="column" gap="3">
              <TextField.Root
                type="text"
                placeholder="Nome (opcional)"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                autoFocus
              />
              <TextField.Root
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
              />
              <TextField.Root
                type="password"
                placeholder="Senha (mín. 6 caracteres)"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                minLength={6}
                required
              />

              {registerError && (
                <Text size="1" color="red">
                  Este email já está em uso
                </Text>
              )}

              <Button type="submit" size="3" disabled={isRegistering} highContrast>
                {isRegistering ? 'Criando...' : 'Criar conta'}
              </Button>
            </Flex>
          </form>

          <Text size="2" color="gray" align="center">
            Já tem conta?{' '}
            <Link to="/login" style={{ color: 'var(--accent-9)' }}>
              Entrar
            </Link>
          </Text>
        </Flex>
      </Box>
    </Box>
  )
}
