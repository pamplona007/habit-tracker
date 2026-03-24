const en = {
  // App
  appName: 'Habit Tracker',

  // Header
  header: {
    openGoals: 'Open goals settings',
  },

  // Home
  home: {
    todaysTasks: "Today's Tasks",
    pending: '{{count}} pending',
    pickRandom: '🎲 Pick a random task',
    addTask: '+ Add Task',
  },

  // StreakCard
  streak: {
    days: 'day streak',
    start: 'Start your streak today!',
  },

  // TaskList
  taskList: {
    empty: 'No tasks yet. Add one to get started!',
  },

  // AddTaskModal
  addTask: {
    title: 'Add Task',
    namePlaceholder: 'e.g. Go for a run',
    nameLabel: 'Task name *',
    nameRequired: 'Task name is required.',
    deadlineLabel: 'Deadline (optional)',
    cancel: 'Cancel',
    add: 'Add',
  },

  // RandomTaskModal
  randomTask: {
    title: 'Random Task',
    allDone: 'All tasks completed! Add more tasks to keep going.',
    close: 'Close',
    due: 'Due {{date}}',
    pickAnother: 'Pick another',
    letsDoIt: "Let's do it!",
  },

  // CompletionModal
  completion: {
    title: 'How did it go?',
    fullyCompleted: 'Fully completed ✅',
    partiallyCompleted: 'Partially completed 🟡',
    cancel: 'Cancel',
  },

  // TaskInProgress
  inProgress: {
    label: 'IN PROGRESS',
    markDone: 'Mark as done',
    giveUp: 'Give up',
  },

  // GoalsSettings
  goals: {
    title: 'Goals',
    description:
      "Set your minimum activity targets. A streak is maintained when you meet your weekly goal even on days you don't complete a task.",
    weeklyLabel: 'Active days per week (minimum)',
    weeklyHint: 'How many days per week you aim to complete at least one task.',
    weeklyError: 'Must be between 1 and 7.',
    monthlyLabel: 'Active days per month (minimum)',
    monthlyHint: 'Your overall monthly activity target.',
    monthlyError: 'Must be between 1 and 31.',
    save: 'Save Goals',
    back: 'Go back',
  },

  // LanguageSettings
  language: {
    title: 'Language',
    label: 'App language',
  },

  // Settings page (if unified)
  settings: {
    title: 'Settings',
  },
} as const

export default en
