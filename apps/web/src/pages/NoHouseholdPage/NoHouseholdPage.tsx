import { useState } from 'react'
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  TextField,
  Badge,
} from '@radix-ui/themes'
import { useAuth } from '../../context'
import {
  useCreateHousehold,
  useJoinHousehold,
  useHouseholds,
} from '../../hooks'
import styles from './styles.module.css'

export function NoHouseholdPage() {
  const { logout } = useAuth()
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')

  const { data: households = [] } = useHouseholds()
  const createHousehold = useCreateHousehold()
  const joinHousehold = useJoinHousehold()

  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const error =
    createHousehold.error || joinHousehold.error
      ? 'Algo deu errado. Tente novamente.'
      : null

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!householdName.trim()) return
    createHousehold.mutate({ name: householdName.trim() })
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    joinHousehold.mutate(inviteCode.trim().toUpperCase())
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.card}>
        <Flex direction="column" gap="5">
          <Flex direction="column" gap="2" align="center">
            <Text size="8">🏠</Text>
            <Heading size="6" align="center">
              Você ainda não está em nenhuma casa
            </Heading>
            <Text size="2" color="gray" align="center">
              Crie uma nova ou entre com código de convite
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
                highContrast
                onClick={() => setMode('create')}
              >
                🏠 Criar casa nova
              </Button>
              <Button
                size="3"
                variant="outline"
                onClick={() => setMode('join')}
              >
                🔑 Entrar com código
              </Button>

              {households.length > 0 && (
                <>
                  <Text size="1" color="gray" align="center" mt="2">
                    Você também pode entrar numa casa que já é membro:
                  </Text>
                  {households.map((h) => (
                    <Badge key={h.id} size="2">
                      {h.name}
                    </Badge>
                  ))}
                </>
              )}

              <Button size="1" variant="ghost" color="gray" onClick={() => logout()}>
                Sair da conta
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
                  onChange={(e) => setHouseholdName(e.target.value)}
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
                  onChange={(e) =>
                    setInviteCode(e.target.value.toUpperCase())
                  }
                  autoFocus
                  maxLength={12}
                  required
                />
                <Button
                  type="submit"
                  size="3"
                  disabled={joinHousehold.isPending}
                  highContrast
                >
                  {joinHousehold.isPending ? 'Entrando...' : 'Entrar'}
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
