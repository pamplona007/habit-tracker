import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwtMiddleware, auth } from './middleware/auth'
import { authRoutes } from './routes/auth'
import { noticesRoutes } from './routes/notices'
import { weeklyTasksRoutes } from './routes/weekly-tasks'
import { monthlyTasksRoutes } from './routes/monthly-tasks'
import { shoppingRoutes } from './routes/shopping'

const app = new Hono()

// Middleware
app.use('*', cors({
  origin: '*',
  credentials: true,
}))

// Public routes
app.get('/', (c) => c.json({ 
  message: 'Habit Tracker API',
  version: '1.0.0',
  endpoints: {
    auth: '/auth',
    notices: '/notices',
    weekly: '/weekly-tasks',
    monthly: '/monthly-tasks',
    shopping: '/shopping',
  }
}))

// Auth routes (public)
app.route('/auth', authRoutes)

// Protected routes
app.use('/notices/*', jwtMiddleware)
app.use('/weekly-tasks/*', jwtMiddleware)
app.use('/monthly-tasks/*', jwtMiddleware)
app.use('/shopping/*', jwtMiddleware)

app.route('/notices', noticesRoutes)
app.route('/weekly-tasks', weeklyTasksRoutes)
app.route('/monthly-tasks', monthlyTasksRoutes)
app.route('/shopping', shoppingRoutes)

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
