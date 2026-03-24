import { useState } from 'react'
import { Box, Button, Flex, Heading, Text, TextField } from '@radix-ui/themes'
import { useAuth } from '../../context'
import { Link } from '../../types/ui'
import styles from './styles.module.css'

export function LoginPage() {
  const { login, isLoggingIn, loginError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    login({ email, password })
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.card}>
        <Flex direction="column" gap="5">
          <Flex direction="column" gap="2">
            <Heading size="7" align="center">
              Entrar
            </Heading>
            <Text size="2" color="gray" align="center">
              Bem-vindo de volta!
            </Text>
          </Flex>

          <form onSubmit={handleSubmit} className={styles.form}>
            <Flex direction="column" gap="3">
              <TextField.Root
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <TextField.Root
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
              />

              {loginError && (
                <Text size="1" color="red">
                  Email ou senha incorretos
                </Text>
              )}

              <Button type="submit" size="3" disabled={isLoggingIn} highContrast>
                {isLoggingIn ? 'Entrando...' : 'Entrar'}
              </Button>
            </Flex>
          </form>

          <Text size="2" color="gray" align="center">
            Não tem conta?{' '}
            <Link to="/register" style={{ color: 'var(--accent-9)' }}>
              Criar conta
            </Link>
          </Text>
        </Flex>
      </Box>
    </Box>
  )
}
