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

## Design System — Linen & Mint

O frontend usa o design system **Linen & Mint** do Stitch, um sistema editorial de alta qualidade.

### Princípios
- **"The Ethereal Organizer"** — UI sofisticada com camadas suaves e atmoféricas
- **"No-Line Rule"** — Sem bordas de 1px; usar mudanças de cor para definir seções
- **Tonal Nesting** — Profundidade através de proximidade de cores, não sombras
- **Glass & Gradient** — Elementos flutuantes com backdrop-blur e gradientes sutis

### Tipografia
- **Display/Headline**: Manrope (sans-serif geométrica)
- **Body/Label**: Plus Jakarta Sans

### Paleta de Cores
```
Primary:      #016a6b (teal)
Primary container: #a0f0f0
Secondary:    #37628c (blue)
Surface:      #f9f9ff (background)
On Surface:   #293247 (text)
```

### Tokens CSS
Ver `apps/web/src/styles/tokens.css` para todos os tokens.

---

## Stitch Screens

Design system e screens disponíveis em: `projects/1440029435138039410`

### Screens Disponíveis
| Título | Screen ID |
|--------|-----------|
| Landing Page | 7a1a8af60f5144c592b7ef878a4c1f0e |
| Login | 1a6df64c92744969852c9367f7824a5e |
| Register | f236b238a42e4a6093d1de85afb8d7d5 |
| No Household | cd96d40af5b9473b829503d5f744538f |
| Settings | ee919aee11a1458fbce6fb50085713f3 |
| Home Dashboard | 793a317f43bb4dfeb672bb5ab2350d17 |
| Task List | 882be01bbbdf41fa83f870a5fd298c3e |
| Quick Start | 3bce068e15614122b092b7147c3cd18f |
| Task Timer | b17a1ed972b9417080a6032a086a2d4a |
| Create Task | ced61b4eba354641ab9bd19d2bba7743 |
| Notices | bbfaa937000d4bfcb8eec6ae1aa81d10 |
| Shopping List | 3ce78b4e3050423fb3ffaca4cc1c82f2 |

---

## Regras de Estilo

- **Tailwind CSS v4** — classes utilitárias no JSX
- **Design Tokens** — definidos em `@theme` no `index.css` (ex: `text-primary`, `bg-surface-container-lowest`)
- **Espaçamento** — classes Tailwind (p-4, m-6, gap-4, etc.)
- **Border Radius** — `rounded-lg` para containers, `rounded-full` para botões
- **Material Symbols** — ícone via `<span className="material-symbols-outlined">{icon}</span>`

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
