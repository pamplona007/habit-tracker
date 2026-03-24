# Habit Tracker — Plataforma Doméstica Colaborativa

Organize sua casa: tarefas, avisos e listas de compras compartilhados entre membros de uma casa.

## 🐳 Docker (Desenvolvimento Local)

```bash
# Subir tudo
docker compose up

# Ver logs
docker compose logs -f

# Para tudo
docker compose down

# Reset completo (banco + imagens)
docker compose down -v --rmi all
```

**Urls:**
- Frontend: http://localhost:5173
- API: http://localhost:3000
- API Docs: http://localhost:3000 (health check)

**Seed (dados de teste):**
```bash
docker compose exec api bun run prisma/seed.ts
```

**Login padrão:**
```
pamplona@email.com / 123456
```

## 🚀 Sem Docker

```bash
# 1. Dependências
npm install

# 2. PostgreSQL
docker run -d -p 5432:5432 \
  -e POSTGRES_USER=habit_tracker \
  -e POSTGRES_PASSWORD=habit_tracker_dev \
  -e POSTGRES_DB=habit_tracker \
  postgres:16-alpine

# 3. API
cp apps/api/.env.example apps/api/.env
cd apps/api
npx prisma db push
npx prisma db seed
bun run --watch src/index.ts

# 4. Web (outro terminal)
cd apps/web
npm run dev
```

## 📁 Estrutura

```
habit-tracker/
├── apps/
│   ├── web/                    # React + Vite + TanStack Query
│   │   └── src/
│   │       ├── api/            # Cliente Axios + endpoints
│   │       ├── components/     # UI (layout, tasks, notices, shopping)
│   │       ├── context/        # AuthContext, Providers
│   │       ├── hooks/         # TanStack Query hooks por domínio
│   │       ├── i18n/          # EN/PT
│   │       └── pages/         # Landing, Login, Register, Dashboard, Settings
│   │
│   └── api/                   # Bun + Hono + Prisma + PostgreSQL
│       └── src/
│           ├── middleware/     # Auth (JWT)
│           └── routes/         # auth, households, tasks, notices, shopping
│
├── docker-compose.yml
├── package.json               # Root workspace
└── turbo.json
```

## 📡 API Endpoints

### Auth
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/register` | Criar conta |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | User atual |

### Households
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/households` | Criar casa |
| GET | `/households` | Listar casas do user |
| POST | `/households/join` | Entrar com código |
| GET | `/households/:id` | Detalhes + membros + convites |
| POST | `/households/:id/invites` | Gerar convite |
| POST | `/households/:id/switch` | Trocar casa ativa |
| POST | `/households/:id/leave` | Sair da casa |

### Tasks
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/households/:id/tasks` | Listar tarefas |
| POST | `/households/:id/tasks` | Criar tarefa |
| PATCH | `/households/:id/tasks/:id` | Editar tarefa |
| POST | `/households/:id/tasks/:id/complete` | Completar (FULL/PARTIAL) |
| DELETE | `/households/:id/tasks/:id/complete` | Toggle: remove completion |
| DELETE | `/households/:id/tasks/:id` | Deletar |

### Notices
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET/POST | `/households/:id/notices` | Listar / Criar |
| PATCH/DELETE | `/households/:id/notices/:id` | Editar / Deletar |

### Shopping
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET/POST | `/households/:id/shopping` | Listas |
| DELETE | `/households/:id/shopping/:id` | Deletar lista |
| POST | `/households/:id/shopping/:id/items` | Adicionar item |
| PATCH | `/households/:id/shopping/:listId/items/:itemId` | Toggle item |
| DELETE | `/households/:id/shopping/:listId/items/:itemId` | Remover item |

## 🗄️ Modelo de Dados

```
Household
├── id, name
└── members (N:N via HouseholdMember)
├── notices[]
├── tasks[]
├── shoppingLists[]
└── invites[]

HouseholdMember (N:N)
├── householdId + userId (PK composta)
├── role (OWNER | ADMIN | MEMBER)
└── joinedAt

User
├── id, email, password, name
├── currentHouseholdId
└── memberships[] (via HouseholdMember)

HouseholdInvite
├── code (único), isUsed, expiresAt
├── householdId
└── usedById

Task
├── id, name, description
├── type (DAILY | WEEKLY | MONTHLY | ONE_TIME)
├── dayOfWeek?, dayOfMonth?, deadline?
├── isActive
└── completions[]

TaskCompletion
├── id, completedAt, type (FULL | PARTIAL)
├── taskId, userId
└── createdAt (via Task)

Notice
├── id, title, content, priority
├── isActive, startDate?, endDate?
└── householdId

ShoppingList
├── id, name, isActive
├── householdId
└── items[]

ShoppingItem
├── id, name, quantity, isChecked
└── listId
```

## 🛠️ Tech Stack

### Frontend
- **Vite** + **React 19** + **TypeScript**
- **TanStack Query** — cache e sync
- **Axios** — cliente HTTP
- **Radix UI Themes** — componentes
- **i18next** — EN/PT
- **CSS Modules**

### Backend
- **Bun** runtime
- **Hono** framework
- **Prisma** ORM
- **PostgreSQL**
- **JWT** autenticação
- **Zod** validação

## 🎮 Funcionalidades

### Tarefas
- Tipos: diária, semanal, mensal, pontual
- 🎲 Seleção aleatória de tarefa pendente
- ⏱️ Timer com cronômetro
- ✅ Conclusão full ou parcial
- 🔥 Streak (dias seguidos)
- Toggle completo/descompleto

### Avisos
- Priority: baixa, normal, alta, urgente
- Ordenados por prioridade

### Compras
- Múltiplas listas
- Progress bar
- Quantidade por item

### Casa
- Múltiplas casas por usuário (N:N)
- Convites com código + expiração
- Troca rápida de casa via selector

---

Criado: 2026-03-24
