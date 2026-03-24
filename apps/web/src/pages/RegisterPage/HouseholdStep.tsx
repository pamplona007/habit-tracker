import { useState } from 'react'
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  TextField,
} from '@radix-ui/themes'
import { useCreateHousehold, useJoinHousehold } from '../../hooks'
import styles from './styles.module.css'

type HouseholdStepProps = {
  email: string
}

export function HouseholdStep({ email }: HouseholdStepProps) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const createHousehold = useCreateHousehold()
  const joinHousehold = useJoinHousehold()

  const error =
    createHousehold.error || joinHousehold.error
      ? 'Algo deu errado. Tente novamente.'
      : null

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!householdName.trim()) return
    createHousehold.mutate(
      { name: householdName.trim() },
      {
        onError: () => {},
      }
    )
  }

  function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    joinHousehold.mutate(inviteCode.trim().toUpperCase())
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.card}>
        <Flex direction="column" gap="5">
          <Flex direction="column" gap="2">
            <Text size="3" color="gray" align="center">
              Conta criada! 👋
            </Text>
            <Heading size="6" align="center">
              Bem-vindo, {email}!
            </Heading>
            <Text size="2" color="gray" align="center">
              Agora escolha: criar uma casa nova ou entrar numa existente.
            </Text>
          </Flex>

          {error && (
            <Text size="1" color="red" align="center">
              {error}
            </Text>
          )}

          {mode === 'choose' && (
            <Flex direction="column" gap="3">
              <Button
                size="3"
                variant="outline"
                onClick={() => setMode('create')}
              >
                🏠 Criar uma casa nova
              </Button>
              <Text size="2" color="gray" align="center">
                ou
              </Text>
              <Button
                size="3"
                variant="outline"
                onClick={() => setMode('join')}
              >
                🔑 Entrar com código de convite
              </Button>
            </Flex>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate} className={styles.form}>
              <Flex direction="column" gap="3">
                <Text size="2" weight="medium">
                  Nome da casa
                </Text>
                <TextField.Root
                  placeholder="Ex: Casa Pamplona"
                  value={householdName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHouseholdName(e.target.value)}
                  autoFocus
                  minLength={2}
                  required
                />
                <Button
                  type="submit"
                  size="3"
                  disabled={createHousehold.isPending}
                  highContrast
                >
                  {createHousehold.isPending ? 'Criando...' : 'Criar casa'}
                </Button>
                <Button
                  type="button"
                  size="1"
                  variant="ghost"
                  color="gray"
                  onClick={() => setMode('choose')}
                >
                  Voltar
                </Button>
              </Flex>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin} className={styles.form}>
              <Flex direction="column" gap="3">
                <Text size="2" weight="medium">
                  Código de convite
                </Text>
                <TextField.Root
                  placeholder="ABCD1234"
                  value={inviteCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setInviteCode(e.target.value.toUpperCase())
                  }
                  autoFocus
                  maxLength={12}
                  required
                  style={{ textTransform: 'uppercase' }}
                />
                <Button
                  type="submit"
                  size="3"
                  disabled={joinHousehold.isPending}
                  highContrast
                >
                  {joinHousehold.isPending ? 'Entrando...' : 'Entrar na casa'}
                </Button>
                <Button
                  type="button"
                  size="1"
                  variant="ghost"
                  color="gray"
                  onClick={() => setMode('choose')}
                >
                  Voltar
                </Button>
              </Flex>
            </form>
          )}
        </Flex>
      </Box>
    </Box>
  )
}
