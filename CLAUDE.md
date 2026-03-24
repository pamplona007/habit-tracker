# CLAUDE.md — Habit Tracker (Monorepo)

Plataforma doméstica colaborativa em React + Bun/Hono.

---

## Stack

### Frontend (`apps/web`)
- **Vite** + **React 19** + **TypeScript**
- **TanStack Query** — cache e sync de dados
- **Axios** — cliente HTTP
- **@radix-ui/themes** — componentes UI
- **i18next** — internacionalização (EN/PT)
- **CSS Modules** — estilos

### Backend (`apps/api`)
- **Bun** runtime
- **Hono** framework
- **Prisma** ORM
- **PostgreSQL** banco de dados
- **JWT** autenticação
- **Zod** validação

---

## Modelo de Dados (Prisma)

```
Household
├── id, name
└── members[], notices[], tasks[], shoppingLists[], invites[]

HouseholdMember (N:N — composite PK)
├── householdId + userId
├── role (OWNER | ADMIN | MEMBER)
└── joinedAt

User
├── id, email, password, name
├── currentHouseholdId
└── memberships[]

HouseholdInvite
├── code (único), isUsed, expiresAt
├── householdId, usedById

Task
├── id, name, description
├── type (DAILY | WEEKLY | MONTHLY | ONE_TIME)
├── dayOfWeek?, dayOfMonth?, deadline?, isActive
└── completions[]

TaskCompletion
├── id, completedAt, type (FULL | PARTIAL)
├── taskId, userId

Notice
├── id, title, content, priority (low|normal|high|urgent)
├── isActive, startDate?, endDate?
└── householdId

ShoppingList / ShoppingItem
└── householdId / listId
```

---

## API Endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Households
- `POST /households` — criar
- `GET /households` — listar casas do user
- `POST /households/join` — entrar com código
- `GET /households/:id` — detalhes + membros + convites
- `POST /households/:id/invites` — gerar convite
- `POST /households/:id/switch` — trocar casa ativa
- `POST /households/:id/leave` — sair

### Tasks
- `GET /households/:id/tasks?type=DAILY|WEEKLY|MONTHLY|ONE_TIME`
- `POST /households/:id/tasks`
- `PATCH /households/:id/tasks/:id`
- `POST /households/:id/tasks/:id/complete` — body: `{ type: 'FULL' | 'PARTIAL' }`
- `DELETE /households/:id/tasks/:id/complete` — toggle (remove última completion)
- `DELETE /households/:id/tasks/:id`

### Notices
- `GET/POST /households/:id/notices`
- `PATCH/DELETE /households/:id/notices/:id`

### Shopping
- `GET/POST /households/:id/shopping`
- `DELETE /households/:id/shopping/:id`
- `POST /households/:id/shopping/:id/items`
- `PATCH /households/:id/shopping/:listId/items/:itemId`
- `DELETE /households/:id/shopping/:listId/items/:itemId`

---

## Fluxo de Segurança

### Middleware chain:
1. `jwtMiddleware` — valida JWT
2. `loadUser` — carrega user + memberships (N:N)
3. `requireHouseholdMembership` — verifica se user é membro da `:householdId` no path

### Convites:
- Código único + expira + uso único
- Atomic transaction: marca usado + cria membership

---

## Estrutura Frontend

```
src/
├── api/               # client.ts + auth, households, tasks, notices, shopping
├── components/
│   ├── layout/        # Sidebar (com household selector + mobile)
│   ├── tasks/         # TasksTab, StreakCard, TaskInProgress, CompletionModal
│   ├── notices/       # NoticesTab
│   └── shopping/      # ShoppingTab
├── context/          # AuthContext, Providers
├── hooks/           # TanStack Query hooks (useTasks, useNotices, etc.)
├── i18n/            # locales/en.ts, pt.ts
├── pages/           # Landing, Login, Register, NoHousehold, Dashboard, Settings
└── types/ui.tsx     # Link component
```

---

## Regras de Estilo

- **CSS Modules** — cada componente na sua pasta com `styles.module.css`
- **Radix UI** para componentes (Box, Flex, Text, Button, Card, Dialog, Select, Checkbox, Badge, Progress, Avatar, TextArea, TextField, IconButton)
- **Variáveis Radix** para cores: `var(--accent-9)`, `var(--gray-3)` — nunca hex hardcoded
- Espaçamento em múltiplos de 4px

---

## Views (App.tsx)

```ts
type Route = '/' | '/login' | '/register'

// status: 'loading' | 'unauthenticated' | 'no-household' | 'authenticated'
// Unauthenticated → Landing / Login / Register
// Authenticated + no-household → NoHouseholdPage
// Authenticated + household → DashboardPage
```

---

## TanStack Query Keys

```ts
AUTH_KEYS.me              // ['auth', 'me']
HOUSEHOLD_KEYS.all       // ['households']
HOUSEHOLD_KEYS.one(id)   // ['households', id]
TASK_KEYS.all(id)         // ['households', id, 'tasks']
NOTICE_KEYS.all(id)       // ['households', id, 'notices']
SHOPPING_KEYS.all(id)     // ['households', id, 'shopping']
```

---

## Docker

```bash
docker compose up             # Subir tudo
docker compose down         # Parar
docker compose exec api bun run prisma db push
docker compose exec api bun run prisma/seed.ts
```

---

## Pendências

1. ✅ Auth + Household (N:N)
2. ✅ Tarefas (daily/weekly/monthly/one-time)
3. ✅ Streak + Timer + Random + Completion (FULL/PARTIAL)
4. ✅ Avisos com priority
5. ✅ Listas de compras com quantidade
6. ✅ Sidebar com household selector + mobile
7. ✅ Página de configurações (membros + convites)
8. ✅ i18n EN/PT
9. ❌ Editar perfil do usuário
10. ❌ Histórico de completions
11. ❌ Notificações / lembretes
12. ❌ Deploy (Railway / Vercel)
