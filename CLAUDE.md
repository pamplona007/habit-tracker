# CLAUDE.md — Habit Tracker (Monorepo)

Plataforma doméstica completa: tarefas (diárias/semanais/mensais), avisos e listas de compras.

---

## Stack

### Frontend (`apps/web`)
- **Vite** + **React 19** + **TypeScript**
- **@radix-ui/themes** para componentes UI
- **CSS Modules** para estilos (NUNCA Tailwind inline)
- **i18next** para internacionalização (EN/PT)
- localStorage para cache local (chave: `habit-tracker-state`)

### Backend (`apps/api`)
- **Bun** runtime
- **Hono** framework
- **Prisma** ORM
- **PostgreSQL** banco de dados
- **JWT** autenticação
- **Zod** validação

---

## Estrutura de Componentes

O frontend foi movido para `apps/web/src/`:

```
apps/web/src/
├── components/
│   ├── Header/
│   ├── StreakCard/
│   ├── TaskList/
│   ├── TaskItem/
│   ├── AddTaskModal/
│   ├── RandomTaskModal/
│   ├── TaskInProgress/
│   ├── CompletionModal/
│   └── GoalsSettings/
├── hooks/
│   ├── useAppState.ts   # estado global + localStorage
│   └── useStreak.ts     # cálculo de streak
├── i18n/
│   ├── index.ts         # configuração i18next
│   └── locales/
│       ├── en.ts        # inglês
│       └── pt.ts        # português
├── types/
│   └── index.ts
├── utils/
│   ├── dates.ts
│   └── streak.ts
├── App.tsx
└── main.tsx
```

---

## API (`apps/api/src/routes`)

| Rota | Descrição |
|------|-----------|
| `auth.ts` | Register, login, /me |
| `notices.ts` | CRUD avisos |
| `weekly-tasks.ts` | CRUD tarefas semanais |
| `monthly-tasks.ts` | CRUD tarefas mensais |
| `shopping.ts` | CRUD listas + itens |

Todas as rotas (exceto auth) são protegidas por JWT middleware.

---

## Regras de Estilo (CRÍTICO)

- CSS Modules ONLY — nenhum inline style, nenhum Tailwind
- Cores via variáveis Radix: `var(--accent-9)`, `var(--gray-3)`, etc. — nunca hex hardcoded
- Espaçamento: grid de 4px (4, 8, 12, 16, 24, 32, 48px)
- Componentes Radix permitidos: Box, Flex, Text, Heading, Button, Card, Badge, Dialog, TextField, IconButton, Select

---

## Modelo de Dados (Prisma)

```prisma
User
├── id, email, password, name
├── notices[]        # Avisos (title, content, priority, isActive)
├── weeklyTasks[]    # Tarefas semanais (dayOfWeek 0-6)
├── monthlyTasks[]   # Tarefas mensais (dayOfMonth 1-31)
└── shoppingLists[]  # Listas de compras
    └── items[]     # Itens (name, quantity, isChecked)
```

---

## Internacionalização

- Arquivos em `apps/web/src/i18n/locales/`
- Seletor de idioma nas configurações (GoalsSettings)
- Persistido via localStorage (`habit-tracker-lang`)

---

## Navegação (sem router)

Estado `view` no App.tsx: `'home' | 'in-progress' | 'goals'`

Modais usam Radix Dialog e são sobrepostos às views.

---

## Como Rodar

```bash
# Desenvolvimento
npm run dev          # Ambos web + api
npm run dev:web      # Só frontend (localhost:5173)
npm run dev:api      # Só backend (localhost:3000)

# Database
cd apps/api
npx prisma db push   # Criar tabelas
```

---

## UX / Design

- StreakCard: número grande (≥4rem), emoji 🔥, cor quente (accent orange)
- Tarefas ordenadas por deadline (com deadline primeiro)
- Empty state da task list: mensagem encorajadora + botão de adicionar
- TaskInProgress: timer visual desde que a view abriu
- Mobile-first, max-width ~480px centralizado

---

## Pendências

1. ❌ Conectar frontend com API (atualmente localStorage)
2. ❌ Criar telas para novas funcionalidades (avisos, tarefas semanais/mensais, listas)
3. ❌ Implementar login/registro no frontend
4. ✅ Monorepo configurado
5. ✅ Backend com Prisma schema
6. ✅ i18n EN/PT
