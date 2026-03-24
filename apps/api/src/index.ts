import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwtMiddleware, loadUser, requireHouseholdMembership, requireCurrentHousehold } from './middleware/auth'
import { authRoutes } from './routes/auth'
import { householdsRoutes } from './routes/households'
import { noticesRoutes } from './routes/notices'
import { tasksRoutes } from './routes/tasks'
import { shoppingRoutes } from './routes/shopping'

const app = new Hono()

// Middleware global
app.use('*', cors({
  origin: '*',
  credentials: true,
}))

// Root
app.get('/', (c) => c.json({
  message: 'Habit Tracker API',
  version: '3.0.0',
  endpoints: {
    auth: '/auth',
    households: '/households',
    notices: '/households/:householdId/notices',
    tasks: '/households/:householdId/tasks',
    shopping: '/households/:householdId/shopping',
  },
}))

// Auth (públicas: login, register)
app.route('/auth', authRoutes)

// /auth/me é protegida
app.use('/auth/me', jwtMiddleware, loadUser)

// Households (precisa de token, mas não de membership para criar/ver/join)
app.use('/households/*', jwtMiddleware, loadUser)
app.route('/households', householdsRoutes)

// Resources com householdId no path (precisa ser membro)
app.use('/households/:householdId/notices/*', requireHouseholdMembership)
app.use('/households/:householdId/tasks/*', requireHouseholdMembership)
app.use('/households/:householdId/shopping/*', requireHouseholdMembership)

app.route('/households/:householdId/notices', noticesRoutes)
app.route('/households/:householdId/tasks', tasksRoutes)
app.route('/households/:householdId/shopping', shoppingRoutes)

// Health
app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
