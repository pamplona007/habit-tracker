import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/auth'
import app from '../index'
import { cleanupAllTestData } from './helpers'

describe('POST /auth/register', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('registers a new user and returns token', async () => {
    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.email).toBe('newuser@example.com')
    expect(body.user.name).toBe('New User')
    expect(body.token).toBeDefined()
    expect(body.user.password).toBeUndefined()
  })

  it('registers without name', async () => {
    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'noname@example.com',
        password: 'password123',
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.name).toBeNull()
  })

  it('rejects duplicate email', async () => {
    await prisma.user.create({
      data: {
        email: 'taken@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Taken',
      },
    })

    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'taken@example.com',
        password: 'password123',
      }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Email already registered')
  })

  it('rejects missing email', async () => {
    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password123' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Email and password are required')
  })

  it('rejects missing password', async () => {
    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Email and password are required')
  })

  it('rejects password shorter than 6 chars', async () => {
    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: '12345' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Password must be at least 6 characters')
  })
})

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await prisma.user.create({
      data: {
        email: 'login@example.com',
        password: await bcrypt.hash('correctpassword', 10),
        name: 'Login User',
      },
    })
  })

  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('logs in with correct credentials', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@example.com', password: 'correctpassword' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.email).toBe('login@example.com')
    expect(body.token).toBeDefined()
    expect(body.user.password).toBeUndefined()
  })

  it('rejects wrong password', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@example.com', password: 'wrongpassword' }),
    })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Invalid credentials')
  })

  it('rejects non-existent email', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@example.com', password: 'password123' }),
    })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Invalid credentials')
  })

  it('rejects missing email', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password123' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Email and password are required')
  })

  it('rejects missing password', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@example.com' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Email and password are required')
  })

  it('returns user with memberships on login', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@example.com', password: 'correctpassword' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.memberships).toBeDefined()
    expect(Array.isArray(body.user.memberships)).toBe(true)
  })
})

describe('GET /auth/me', () => {
  afterEach(async () => {
    await cleanupAllTestData()
  })

  it('returns current user with memberships', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'me@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Me User',
      },
    })

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' })

    const res = await app.request('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.email).toBe('me@example.com')
    expect(body.user.memberships).toBeDefined()
  })

  it('returns 401 without token', async () => {
    const res = await app.request('/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    const res = await app.request('/auth/me', {
      headers: { Authorization: 'Bearer invalidtoken' },
    })
    expect(res.status).toBe(401)
  })
})
