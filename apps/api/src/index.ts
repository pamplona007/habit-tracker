import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { jwtMiddleware, loadUser, requireHouseholdMembership } from './middleware/auth'
import { authRoutes } from './routes/auth'
import { householdsRoutes } from './routes/households'
import { noticesRoutes } from './routes/notices'
import { tasksRoutes } from './routes/tasks'
import { streakRoutes } from './routes/streak'
import { shoppingRoutes } from './routes/shopping'
import { statsRoutes } from './routes/stats'
import { pushRoutes } from './routes/push'
import { cronRoutes } from './routes/cron'
import { z } from 'zod'

const app = new Hono()

app.use('*', async (c, next) => {
  const start = Date.now()
  const method = c.req.method
  const path = c.req.path
  const headers = c.req.header()
  const { authorization: _, cookie: __, ...safeHeaders } = headers as Record<string, string>
  console.log(`[${new Date().toISOString()}] --> ${method} ${path}`)
  console.log('  Headers:', JSON.stringify(safeHeaders, null, 2))
  await next()
  const duration = Date.now() - start
  console.log(`[${new Date().toISOString()}] <-- ${method} ${path} [${c.res.status}] ${duration}ms`)
})

app.onError((err, c) => {
  if (err instanceof z.ZodError) {
    return c.json({ error: 'Validation error', details: err.errors }, 400)
  }
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

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

app.route('/stats', statsRoutes)
app.route('/auth', authRoutes)

app.use('/households/*', jwtMiddleware, loadUser)
app.route('/households', householdsRoutes)

app.use('/households/:householdId/notices/*', requireHouseholdMembership)
app.use('/households/:householdId/tasks/*', requireHouseholdMembership)
app.use('/households/:householdId/shopping/*', requireHouseholdMembership)
app.use('/households/:householdId/streak/*', requireHouseholdMembership)

app.route('/households/:householdId/notices', noticesRoutes)
app.route('/households/:householdId/tasks', tasksRoutes)
app.route('/households/:householdId/shopping', shoppingRoutes)
app.route('/households/:householdId/streak', streakRoutes)

app.route('/push', pushRoutes)

app.route('/cron', cronRoutes)

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
