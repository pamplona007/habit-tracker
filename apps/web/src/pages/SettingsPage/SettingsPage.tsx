import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  Dialog,
  Select,
} from '@radix-ui/themes'
import { useAuth } from '../../context'
import { useHousehold, useCreateInvite } from '../../hooks'
import styles from './styles.module.css'

export function SettingsPage() {
  const { user, logout } = useAuth()
  const householdId = user?.currentHouseholdId ?? null
  const { data: household, isLoading } = useHousehold(householdId)
  const createInvite = useCreateInvite()

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')
  const [inviteHours, setInviteHours] = useState('24')

  if (isLoading) return <Text color="gray">Carregando...</Text>

  function handleGenerateInvite() {
    if (!householdId) return
    createInvite.mutate(
      { householdId, expiresInHours: Number(inviteHours) },
      {
        onSuccess: (invite) => {
          setGeneratedCode(invite.code)
          setInviteDialogOpen(true)
        },
      }
    )
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
  }

  const roleColors: Record<string, 'red' | 'orange' | 'gray'> = {
    OWNER: 'red',
    ADMIN: 'orange',
    MEMBER: 'gray',
  }

  const roleLabels: Record<string, string> = {
    OWNER: 'Dono',
    ADMIN: 'Admin',
    MEMBER: 'Membro',
  }

  return (
    <Flex direction="column" gap="6" className={styles.container}>
      {/* User section */}
      <Card className={styles.section}>
        <Heading size="4" mb="3">👤 Minha conta</Heading>
        <Flex direction="column" gap="2">
          <Flex justify="between" align="center">
            <Text size="2" color="gray">Nome</Text>
            <Text size="2">{user?.name ?? '—'}</Text>
          </Flex>
          <Flex justify="between" align="center">
            <Text size="2" color="gray">Email</Text>
            <Text size="2">{user?.email}</Text>
          </Flex>
          <Flex justify="between" align="center">
            <Text size="2" color="gray">Casas</Text>
            <Text size="2">{user?.memberships?.length ?? 0}</Text>
          </Flex>
          <Box mt="2">
            <Button variant="soft" color="red" size="1" onClick={() => logout()}>
              Sair da conta
            </Button>
          </Box>
        </Flex>
      </Card>

      {/* Household section */}
      {household && (
        <Card className={styles.section}>
          <Flex justify="between" align="center" mb="3">
            <Heading size="4">🏠 {household.name}</Heading>
          </Flex>

          {/* Members */}
          <Text size="2" weight="medium" mb="2">Membros</Text>
          <Flex direction="column" gap="2" mb="4">
            {household.members.map((m) => (
              <Flex key={m.user.id} justify="between" align="center">
                <Flex direction="column">
                  <Text size="2">{m.user.name ?? m.user.email}</Text>
                  <Text size="1" color="gray">{m.user.email}</Text>
                </Flex>
                <Badge color={roleColors[m.role]} size="1">
                  {roleLabels[m.role]}
                </Badge>
              </Flex>
            ))}
          </Flex>

          {/* Invites */}
          <Text size="2" weight="medium" mb="2">Convites</Text>
          {household.invites.length > 0 && (
            <Flex direction="column" gap="2" mb="3">
              {household.invites.map((invite) => (
                <Flex key={invite.id} justify="between" align="center">
                  <Flex direction="column">
                    <Text size="2" weight="bold" className={styles.code}>
                      {invite.code}
                    </Text>
                    <Text size="1" color="gray">
                      Expira {new Date(invite.expiresAt).toLocaleString('pt-BR')}
                    </Text>
                  </Flex>
                  <Button size="1" variant="soft" onClick={() => copyCode(invite.code)}>
                    Copiar
                  </Button>
                </Flex>
              ))}
            </Flex>
          )}
          {household.invites.length === 0 && (
            <Text size="2" color="gray" mb="3">Nenhum convite ativo</Text>
          )}

          {/* Generate invite */}
          <Flex gap="2" align="end">
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="1" color="gray">Validade (horas)</Text>
              <Select.Root value={inviteHours} onValueChange={setInviteHours}>
                <Select.Trigger />
                <Select.Content>
                  {['1', '6', '12', '24', '72', '168'].map((h) => (
                    <Select.Item key={h} value={h}>
                      {h === '168' ? '7 dias' : h === '72' ? '3 dias' : h === '24' ? '1 dia' : `${h}h`}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
            <Button onClick={handleGenerateInvite} disabled={createInvite.isPending}>
              {createInvite.isPending ? 'Gerando...' : 'Gerar convite'}
            </Button>
          </Flex>
        </Card>
      )}

      {/* Invite result dialog */}
      <Dialog.Root open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <Dialog.Content className={styles.dialogContent}>
          <Dialog.Title>Convite gerado!</Dialog.Title>
          <Flex direction="column" gap="3" mt="2" align="center">
            <Text size="2" color="gray" align="center">
              Compartilhe este código com quem você quer convidar:
            </Text>
            <Box className={styles.codeBox}>
              <Text size="5" weight="bold" className={styles.code}>
                {generatedCode}
              </Text>
            </Box>
            <Button onClick={() => copyCode(generatedCode)}>
              Copiar código
            </Button>
          </Flex>
          <Flex justify="end" mt="3">
            <Dialog.Close><Button variant="soft">Fechar</Button></Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  )
}
