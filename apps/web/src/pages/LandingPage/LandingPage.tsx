import { Box, Button, Flex, Heading, Text, Container } from '@radix-ui/themes'
import { Link } from '../../types/ui'
import styles from './styles.module.css'

export function LandingPage() {
  return (
    <Box className={styles.page}>
      <Container size="1" className={styles.container}>
        <Flex direction="column" align="center" gap="6" pt="9">
          <Flex direction="column" align="center" gap="3">
            <Text size="8" weight="bold" className={styles.emoji}>
              🏠
            </Text>
            <Heading size="8" align="center">
              Habit Tracker
            </Heading>
            <Text size="4" color="gray" align="center">
              Organize sua casa — tarefas, avisos e listas de compras, juntos.
            </Text>
          </Flex>

          <Flex direction="column" gap="3" width="100%" mt="4">
            <Text size="3" weight="medium">
              Crie uma conta para começar
            </Text>

            <Flex direction="column" gap="2" className={styles.features}>
              <Flex gap="2" align="center">
                <Text>✅</Text>
                <Text size="2">Tarefas do dia, semana e mês</Text>
              </Flex>
              <Flex gap="2" align="center">
                <Text>✅</Text>
                <Text size="2">Avisos para a família</Text>
              </Flex>
              <Flex gap="2" align="center">
                <Text>✅</Text>
                <Text size="2">Listas de compras compartilhadas</Text>
              </Flex>
              <Flex gap="2" align="center">
                <Text>✅</Text>
                <Text size="2">Múltiplas casas</Text>
              </Flex>
            </Flex>

            <Link to="/register" className={styles.cta}>
              <Button size="3" highContrast className={styles.ctaButton}>
                Criar contagrátis
              </Button>
            </Link>

            <Text size="2" color="gray" align="center">
              Já tem conta?{' '}
              <Link to="/login" style={{ color: 'var(--accent-9)' }}>
                Entrar
              </Link>
            </Text>
          </Flex>
        </Flex>
      </Container>
    </Box>
  )
}
