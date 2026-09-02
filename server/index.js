import 'dotenv/config'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import pg from 'pg'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = Number(process.env.PORT || 3000)

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'when2meet',
      user: process.env.DB_USER || 'when2meet',
      password: process.env.DB_PASSWORD || 'when2meet-dev-only',
    }

if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false }
}

const pool = new Pool({ ...poolConfig, max: Number(process.env.DB_POOL_MAX || 10) })

app.disable('x-powered-by')
app.use(express.json({ limit: '256kb' }))

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function validateRoomInput(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const dates = Array.isArray(body?.dates) ? body.dates : []
  const timeStart = Number(body?.time_start)
  const timeEnd = Number(body?.time_end)

  if (!title || title.length > 60) throw new Error('Title must be between 1 and 60 characters')
  if (dates.length < 1 || dates.length > 30 || dates.some(date => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    throw new Error('Dates must contain 1 to 30 valid dates')
  }
  if (!Number.isInteger(timeStart) || !Number.isInteger(timeEnd) || timeStart < 0 || timeEnd > 24 || timeEnd < 1 || timeStart >= timeEnd) {
    throw new Error('Invalid time range')
  }

  return { title, dates, timeStart, timeEnd }
}

function validateAvailabilityInput(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const slots = Array.isArray(body?.slots) ? body.slots : []

  if (!name || name.length > 20) throw new Error('Name must be between 1 and 20 characters')
  if (slots.length < 1 || slots.some(slot => typeof slot !== 'string' || slot.length > 100)) {
    throw new Error('At least one valid slot is required')
  }

  return { name, slots }
}

app.get('/api/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.post('/api/rooms', async (req, res, next) => {
  try {
    const { title, dates, timeStart, timeEnd } = validateRoomInput(req.body)
    const ownerToken = crypto.randomBytes(32).toString('hex')
    const { rows } = await pool.query(
      `INSERT INTO rooms (title, dates, time_start, time_end, owner_token_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, dates, time_start, time_end, created_at`,
      [title, dates, timeStart, timeEnd, hashToken(ownerToken)],
    )

    res.status(201).json({ ...rows[0], owner_token: ownerToken })
  } catch (error) {
    next(error)
  }
})

app.get('/api/rooms/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid room id' })
    const { rows } = await pool.query(
      `SELECT id, title, dates, time_start, time_end, created_at
       FROM rooms WHERE id = $1`,
      [req.params.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Room not found' })
    res.json(rows[0])
  } catch (error) {
    next(error)
  }
})

app.get('/api/rooms/:id/availability', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid room id' })
    const { rows } = await pool.query(
      `SELECT id, room_id, name, slots, updated_at, created_at
       FROM availability WHERE room_id = $1 ORDER BY created_at ASC`,
      [req.params.id],
    )
    res.json(rows)
  } catch (error) {
    next(error)
  }
})

app.put('/api/rooms/:id/availability', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid room id' })
    const { name, slots } = validateAvailabilityInput(req.body)
    const { rows } = await pool.query(
      `INSERT INTO availability (room_id, name, slots)
       VALUES ($1, $2, $3)
       ON CONFLICT (room_id, name)
       DO UPDATE SET slots = EXCLUDED.slots, updated_at = now()
       RETURNING id, room_id, name, slots, updated_at, created_at`,
      [req.params.id, name, slots],
    )
    res.json(rows[0])
  } catch (error) {
    next(error)
  }
})

app.delete('/api/rooms/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid room id' })
    const ownerToken = req.get('x-owner-token')
    if (!ownerToken) return res.status(403).json({ error: 'Owner token is required' })

    const { rowCount } = await pool.query(
      'DELETE FROM rooms WHERE id = $1 AND owner_token_hash = $2',
      [req.params.id, hashToken(ownerToken)],
    )
    if (rowCount === 0) return res.status(403).json({ error: 'Only the room owner can delete this room' })
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' })
})

const distPath = path.resolve(__dirname, '../dist')
app.use(express.static(distPath))

app.use((error, _req, res, _next) => {
  console.error(error)
  if (error.code === '23505') return res.status(409).json({ error: 'Availability already exists' })
  if (error.message?.startsWith('Title ') || error.message?.startsWith('Dates ') || error.message?.startsWith('Invalid time') || error.message?.startsWith('Name ') || error.message?.startsWith('At least ')) {
    return res.status(400).json({ error: error.message })
  }
  res.status(500).json({ error: 'Internal server error' })
})

async function cleanupExpiredRooms() {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM rooms
       WHERE dates[array_upper(dates, 1)] IS NOT NULL
         AND (dates[array_upper(dates, 1)]::date + interval '5 days') < now()`,
    )
    if (rowCount > 0) console.log(`Removed ${rowCount} expired room(s)`)
  } catch (error) {
    console.error('Room cleanup failed', error)
  }
}

async function start() {
  const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8')
  await pool.query(schema)
  await cleanupExpiredRooms()

  const server = app.listen(port, () => {
    console.log(`When2Meet server listening on port ${port}`)
  })

  const cleanupTimer = setInterval(cleanupExpiredRooms, 60 * 60 * 1000)
  cleanupTimer.unref()

  const shutdown = async () => {
    server.close()
    await pool.end()
    process.exit(0)
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

start().catch(error => {
  console.error('Failed to start server', error)
  process.exit(1)
})
