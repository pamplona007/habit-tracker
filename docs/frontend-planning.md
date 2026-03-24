# Frontend — Planejamento

## Estado Atual

- i18n (EN/PT) ✅
- CSS Modules + Radix UI Themes ✅
- Estrutura de componentes existente (Header, TaskList, etc.) ✅
- localStorage (vai ser substituído por API) ⚠️

---

## Telas / Views

### 1. Auth (sem household)
| View | Descrição |
|------|-----------|
| `Login` | Email + password |
| `Register` | Email + password + name |

**Fluxo:** Sem token → mostra Login/Register. Não mostra nada da app.

---

### 2. Household Setup (user sem casa)
| View | Descrição |
|------|-----------|
| `NoHousehold` | "Você não está em nenhuma casa" + criar ou entrar |

**Fluxo:** Token existe mas `currentHouseholdId` é null → mostra `NoHousehold`.

---

### 3. App Principal (user com casa)
| View | Descrição |
|------|-----------|
| `Dashboard` | Tab principal com avisos + tarefas + listas |
| `Settings` | Trocar idioma + trocar casa + membros |

**Dentro do Dashboard (tabs ou páginas):**
| View | Descrição |
|------|-----------|
| `NoticesTab` | Quadro de avisos da casa |
| `TasksTab` | Tarefas (daily/weekly/monthly/one-time) |
| `ShoppingTab` | Listas de compras |

---

## Componentes a Criar

### Auth
```
AuthPage/
├── LoginForm/
│   └── index.tsx
├── RegisterForm/
│   └── index.tsx
└── NoHouseholdPage/
    ├── CreateHouseholdForm/
    └── JoinWithCodeForm/
```

### Layout
```
Layout/
├── Sidebar/        # Navegação (Dashboard, Settings)
├── Header/         # Nome da casa + trocar
└── TabNav/        # Notices | Tasks | Shopping
```

### Notices
```
NoticesTab/
├── NoticeBoard/    # Lista de avisos
├── NoticeCard/    # 1 aviso (título, content, priority badge)
├── AddNoticeModal/
└── EditNoticeModal/
```

### Tasks
```
TasksTab/
├── TaskFilters/    # Tabs: All | Daily | Weekly | Monthly | One-time
├── TaskList/
├── TaskCard/       # Nome + type badge + completions
├── AddTaskModal/
│   ├── type selector (DAILY/WEEKLY/MONTHLY/ONE_TIME)
│   ├── dayOfWeek picker (se WEEKLY)
│   ├── dayOfMonth picker (se MONTHLY)
│   └── deadline picker (se ONE_TIME)
└── TaskDetailModal/
    └── CompletionHistory (quem completou + quando)
```

### Shopping
```
ShoppingTab/
├── ShoppingListSelector/  # Tabs: Lista 1 | Lista 2 | + Nova
├── ShoppingListView/
│   ├── AddItemForm/
│   ├── ShoppingItem/      # Checkbox + nome + quantidade
│   └── ProgressBar/       # X/Y items checked
└── CreateListModal/
```

### Settings
```
SettingsPage/
├── LanguageSelector/      # EN | PT (já existe no GoalsSettings)
├── HouseholdManager/
│   ├── HouseholdList/     # Minhas casas + qual está ativa
│   ├── SwitchHouseholdButton/
│   ├── CreateHouseholdForm/
│   └── InviteSection/
│       ├── InviteList/   # Códigos ativos
│       └── GenerateInviteButton/
├── MembersList/           # Membros da casa atual
└── LeaveHouseholdButton/
```

---

## Tarefas por Prioridade

### Fase 1 — Autenticação + Household ( foundations)
1. **API Client** (`src/api/`)
   - `auth.ts` — login, register, me
   - `households.ts` — CRUD, join, invites
   - `tasks.ts`, `notices.ts`, `shopping.ts`
   - Axios ou fetch wrapper com Bearer token

2. **AuthContext** — estado global de auth (token, user)
   - Persiste token no localStorage
   - Verifica se token é válido (GET /auth/me)
   - Redireciona conforme estado (login → app)

3. **LoginPage + RegisterPage**
   - Radix Dialog ou página dedicada
   - Validação Zod (frontend)

4. **NoHouseholdPage**
   - Criar casa (`POST /households`)
   - Entrar com código (`POST /households/join`)
   - Verifica `currentHouseholdId` depois de criar/entrar

---

### Fase 2 — Dashboard Core
5. **AppContext / HouseholdContext**
   - household atual
   - members
   - invites

6. **Header atualizado**
   - Nome da casa
   - Avatar/nome do user
   - Botão settings

7. **Sidebar / TabNav**
   - Tabs: Notices | Tasks | Shopping

---

### Fase 3 — Notices
8. **NoticeBoard** — lista de avisos
9. **AddNoticeModal** — criar aviso
10. **NoticeCard** — título + content + priority badge
11. **Edit/DeleteNoticeModal**

---

### Fase 4 — Tasks
12. **TaskFilters** — filtro por type
13. **TaskCard** — nome + type badge + completion count
14. **AddTaskModal** — com type selector + campos condicionais
15. **TaskDetailModal** — histórico de completions (quem + quando)
16. **MarkComplete button** — `POST /tasks/:id/complete`

---

### Fase 5 — Shopping
17. **ShoppingListSelector** — tabs para múltiplas listas
18. **ShoppingListView** — itens da lista ativa
19. **AddItemForm** — inline no topo da lista
20. **ShoppingItem** — checkbox + nome + quantidade
21. **CreateListModal**
22. **Progress indicator** — "5/10 items"

---

### Fase 6 — Settings + Extras
23. **SettingsPage**
    - Trocar idioma (já existe)
    - Trocar casa ativa
    - Lista de casas
    - Gerar convite (mostra código)
    - Lista de membros
    - Sair da casa

24. **StreakCard adaptado**
    - Usa `TaskCompletion` em vez de `completedAt` local
    - Completações por dia

25. **i18n completo** — PT/EN para todas as telas novas

---

## Ordem Sugerida

```
Fase 1 (crítico)
  → API Client + AuthContext + Login/Register + NoHousehold

Fase 2 (crítico)
  → Dashboard shell + Header + TabNav

Fase 3 (funcionalidade core)
  → Notices

Fase 4 (funcionalidade core)
  → Tasks

Fase 5 (funcionalidade core)
  → Shopping

Fase 6 ( 마무리)
  → Settings + StreakCard + i18n
```

---

## Estrutura de Pastas Proposta

```
apps/web/src/
├── api/
│   ├── client.ts       # axios instance com token
│   ├── auth.ts
│   ├── households.ts
│   ├── tasks.ts
│   ├── notices.ts
│   └── shopping.ts
│
├── context/
│   ├── AuthContext.tsx
│   └── HouseholdContext.tsx
│
├── pages/
│   ├── LoginPage/
│   ├── RegisterPage/
│   ├── NoHouseholdPage/
│   ├── DashboardPage/
│   └── SettingsPage/
│
├── components/
│   ├── layout/
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   └── TabNav/
│   ├── notices/
│   ├── tasks/
│   ├── shopping/
│   └── common/         # Button, Modal wrappers, etc.
│
├── hooks/
│   ├── useApi.ts
│   ├── useAuth.ts
│   └── useHousehold.ts
│
├── types/
│   └── api.ts          # Tipos das respostas da API
│
├── i18n/
│   ├── locales/
│   │   ├── en.ts
│   │   └── pt.ts       # Adicionar chaves das novas telas
│   └── index.ts
│
├── App.tsx              # View router (home | in-progress | goals | notices | settings)
└── main.tsx
```

---

## Notas

- **View router** — manter o padrão atual: estado `view` no App.tsx, sem react-router
- **Radix UI Themes** — continuar usando (Card, Dialog, Select, Tabs, etc.)
- **CSS Modules** — continuar (cada componente na sua pasta)
- **API base URL** — `/api` no dev (via vite proxy), variável de ambiente no prod
