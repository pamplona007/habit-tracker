const pt = {
  // App
  appName: 'Habit Tracker',

  // Header
  header: {
    openGoals: 'Abrir configurações de metas',
  },

  // Home
  home: {
    todaysTasks: 'Tarefas de Hoje',
    pending: '{{count}} pendente',
    pickRandom: '🎲 Tarefa aleatória',
    addTask: '+ Adicionar Tarefa',
  },

  // StreakCard
  streak: {
    days: 'dias seguidos',
    start: 'Comece sua sequência hoje!',
  },

  // TaskList
  taskList: {
    empty: 'Nenhuma tarefa ainda. Adicione uma para começar!',
  },

  // AddTaskModal
  addTask: {
    title: 'Adicionar Tarefa',
    namePlaceholder: 'ex: Ir correr',
    nameLabel: 'Nome da tarefa *',
    nameRequired: 'O nome da tarefa é obrigatório.',
    deadlineLabel: 'Prazo (opcional)',
    cancel: 'Cancelar',
    add: 'Adicionar',
  },

  // RandomTaskModal
  randomTask: {
    title: 'Tarefa Aleatória',
    allDone: 'Todas as tarefas concluídas! Adicione mais para continuar.',
    close: 'Fechar',
    due: 'Prazo {{date}}',
    pickAnother: 'Outra tarefa',
    letsDoIt: 'Bora lá!',
  },

  // CompletionModal
  completion: {
    title: 'Como foi?',
    fullyCompleted: 'Totalmente concluída ✅',
    partiallyCompleted: 'Parcialmente concluída 🟡',
    cancel: 'Cancelar',
  },

  // TaskInProgress
  inProgress: {
    label: 'EM ANDAMENTO',
    markDone: 'Marcar como feita',
    giveUp: 'Desistir',
  },

  // GoalsSettings
  goals: {
    title: 'Metas',
    description:
      'Defina suas metas mínimas de atividade. A sequência é mantida quando você atinge sua meta semanal, mesmo nos dias em que não conclui uma tarefa.',
    weeklyLabel: 'Dias ativos por semana (mínimo)',
    weeklyHint: 'Quantos dias por semana você pretende completar ao menos uma tarefa.',
    weeklyError: 'Deve ser entre 1 e 7.',
    monthlyLabel: 'Dias ativos por mês (mínimo)',
    monthlyHint: 'Sua meta geral de atividade mensal.',
    monthlyError: 'Deve ser entre 1 e 31.',
    save: 'Salvar Metas',
    back: 'Voltar',
  },

  // LanguageSettings
  language: {
    title: 'Idioma',
    label: 'Idioma do app',
  },

  // Settings page (if unified)
  settings: {
    title: 'Configurações',
  },
} as const

export default pt
