export const API_BASE = process.env.E2E_API_URL || 'http://localhost:3000';
export const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

export const TEST_USER_PASSWORD = 'TestPassword123';

export const ROUTES = {
  LANDING: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  TASKS: '/tasks',
  NOTICES: '/notices',
  SHOPPING: '/shopping',
  SETTINGS: '/settings',
  NO_HOUSEHOLD: '/no-household',
} as const;