# Habit Tracker - Monorepo

Plataforma completa de gestão doméstica com tarefas, avisos e listas de compras.

## 📁 Estrutura

```
habit-tracker/
├── apps/
│   ├── web/           # Frontend (Vite + React + Radix UI + i18next)
│   └── api/           # Backend (Bun + Hono + Prisma + PostgreSQL)
├── package.json       # Root workspace (npm)
└── turbo.json        # Build orchestration
```

## 🛠️ Tech Stack

### Frontend
- **Vite** - Build tool
- **React 19** - UI framework
- **Radix UI Themes** - Componentes
- **i18next** - Internacionalização (EN/PT)
- **TypeScript**

### Backend
- **Bun** - Runtime (super rápido)
- **Hono** - Framework web
- **Prisma** - ORM
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **Zod** - Validação

## 🚀 Como Rodar

### Pré-requisitos
- Node.js 18+
- Bun (opcional, já incluso no npm)
- PostgreSQL

### Setup

```bash
# Instalar dependências (raiz)
npm install

# Backend: configurar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
# Editar .env com suas credenciais PostgreSQL

# Backend: criar banco e cliente Prisma
cd apps/api
npx prisma db push

# Desenvolvimento (ambos frontend e backend)
npm run dev

# Ou individualmente:
npm run dev:web   # http://localhost:5173
npm run dev:api   # http://localhost:3000
```

## 📡 API Endpoints

### Autenticação (público)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/register` | Criar conta |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Usuário atual (protegido) |

### Avisos (protegido)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/notices` | Listar avisos |
| POST | `/notices` | Criar aviso |
| PATCH | `/notices/:id` | Atualizar aviso |
| DELETE | `/notices/:id` | Deletar aviso |

### Tarefas Semanais (protegido)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/weekly-tasks` | Listar tarefas |
| POST | `/weekly-tasks` | Criar tarefa |
| POST | `/weekly-tasks/:id/complete` | Completar/toggle |
| PATCH | `/weekly-tasks/:id` | Atualizar |
| DELETE | `/weekly-tasks/:id` | Deletar |

### Tarefas Mensais (protegido)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/monthly-tasks` | Listar tarefas |
| POST | `/monthly-tasks` | Criar tarefa |
| POST | `/monthly-tasks/:id/complete` | Completar/toggle |
| PATCH | `/monthly-tasks/:id` | Atualizar |
| DELETE | `/monthly-tasks/:id` | Deletar |

### Listas de Compras (protegido)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/shopping` | Listar listas |
| GET | `/shopping/:id` | Ver lista específica |
| POST | `/shopping` | Criar lista |
| DELETE | `/shopping/:id` | Deletar lista |
| POST | `/shopping/:id/items` | Adicionar item |
| PATCH | `/shopping/:listId/items/:itemId` | Toggle item |
| DELETE | `/shopping/:listId/items/:itemId` | Remover item |

## 🔐 Modelo de Dados

```
User
├── id, email, password, name
├── notices[]        # Avisos
├── weeklyTasks[]    # Tarefas semanais
├── monthlyTasks[]  # Tarefas mensais
└── shoppingLists[] # Listas de compras
    └── items[]     # Itens da lista
```

## 🌐 Internacionalização

O app suporta **inglês** e **português**. O idioma é selecionado nas configurações e persistido no localStorage.

## 🔧 Variáveis de Ambiente

### apps/api/.env
```env
DATABASE_URL="postgresql://user:password@localhost:5432/habit_tracker"
JWT_SECRET="sua-chave-secreta-aqui"
PORT=3000
```

## 📦 Scripts

```bash
npm run dev        # Iniciar ambos (web + api)
npm run dev:web    # Apenas frontend
npm run dev:api    # Apenas backend
npm run build      # Build production
```

## 🚢 Deploy

### Railway (Recomendado)
1. Criar projeto no Railway
2. Adicionar PostgreSQL plugin
3. Conectar repositório Git
4. Configurar variáveis de ambiente:
   - `DATABASE_URL` (do Railway)
   - `JWT_SECRET` (gerar chave segura)

### Frontend (Vercel/Netlify)
- Build command: `npm run build`
- Output directory: `apps/web/dist`

---

Criado em: 2026-03-24
