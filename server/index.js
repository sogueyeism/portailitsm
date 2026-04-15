import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import nodemailer from 'nodemailer'
import multer from 'multer'
import session from 'express-session'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import {
  dbGetAllServices, dbGetService, dbInsertService, dbUpdateService, dbDeleteService,
  dbGetAllDemands, dbGetDemandsByUser, dbInsertDemand, dbUpdateDemand,
  dbGetAllSettings, dbSetAllSettings,
  dbGetNotifications, dbInsertNotification, dbMarkNotificationRead, dbMarkAllRead,
  dbGetUserByEmail, dbGetUserById, dbInsertUser, dbUpdateUserLogin, dbUpsertSsoUser, dbGetAllUsers, dbUpdateUser, dbUpdateUserPassword, dbDeleteUser,
  dbInsertLog, dbGetLogs, dbCountUserChatsToday, dbGetStats,
} from './db.js'

// Load .env manually (no extra dependency)
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  }
} catch { /* .env optional */ }

const API_KEY = process.env.ANTHROPIC_API_KEY
if (!API_KEY) {
  console.error('ANTHROPIC_API_KEY is missing. Add it to server/.env')
  process.exit(1)
}

const JWT_SECRET = process.env.JWT_SECRET || 'ism-portail-it-secret-change-in-prod'
const IS_PROD = process.env.NODE_ENV === 'production'

const app = express()

// CORS — restrictive in production
if (IS_PROD) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
  app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  }))
} else {
  app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:5173'], credentials: true }))
}

app.use(express.json())

// ── Rate limiting ──
// Global: 200 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requetes. Reessayez dans une minute.' },
})
app.use(globalLimiter)

// Strict: login & register — 10 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion. Reessayez dans 15 minutes.' },
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

// AI chat — 30 requests per minute per IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Limite de requetes IA atteinte. Reessayez dans une minute.' },
})
app.use('/api/chat', chatLimiter)

// Upload — 20 per minute
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Trop de fichiers uploades. Reessayez dans une minute.' },
})
app.use('/api/upload', uploadLimiter)

// Export — 5 per minute (prevent data scraping)
const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Limite d\'export atteinte.' },
})
app.use('/api/export', exportLimiter)

// ── JWT Auth middleware ──
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifié' })
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET)
    req.userId = payload.id
    req.userEmail = payload.email
    req.userRole = payload.role
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalide' })
  }
}

function requireDSI(req, res, next) {
  requireAuth(req, res, () => {
    if (req.userRole !== 'dsi') {
      return res.status(403).json({ error: 'Accès réservé DSI' })
    }
    next()
  })
}

// Serve uploaded files
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// Multer config for image uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: join(__dirname, 'uploads'),
    filename: (_req, file, cb) => {
      const ext = file.originalname.split('.').pop()
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
    ]
    if (allowed.some((t) => file.mimetype.startsWith(t) || file.mimetype === t)) cb(null, true)
    else cb(new Error('Type de fichier non autorise'))
  },
})

// Upload endpoint
app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err.message)
      return res.status(400).json({ error: err.message })
    }
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier' })
    const url = `/uploads/${req.file.filename}`
    res.json({ success: true, url, filename: req.file.filename })
  })
})

// ═══════════════════════════════════════════════════════════
// Authentication
// ═══════════════════════════════════════════════════════════

// Seed default admin user if no users exist
try {
  const users = dbGetAllUsers()
  if (users.length === 0) {
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123'
    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@groupeism.sn'
    const hash = bcrypt.hashSync(adminPassword, 10)
    dbInsertUser({
      email: adminEmail,
      password_hash: hash,
      first_name: 'Admin',
      last_name: 'DSI',
      initials: 'AD',
      display_name: 'Admin DSI',
      role: 'dsi',
    })
    console.log(`Default admin user created: ${adminEmail}`)
    
  }
} catch (e) {
  console.error('Failed to seed admin user:', e.message)
}

/**
 * POST /api/auth/login
 * Email + password login. Returns JWT token + user info.
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' })
  }

  const user = dbGetUserByEmail(email.toLowerCase().trim())
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Identifiants incorrects' })
  }

  if (!user.password_hash) {
    return res.status(401).json({ error: 'Ce compte utilise le SSO. Connectez-vous via OneLogin.' })
  }

  const valid = bcrypt.compareSync(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants incorrects' })
  }

  dbUpdateUserLogin(user.id)
  logActivity(req, 'login', 'user', user.id, user.email)

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' },
  )

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      initials: user.initials,
      displayName: user.display_name,
      role: user.role,
    },
  })
})

/**
 * GET /api/auth/me
 * Validate token and return user info.
 */
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifie' })
  }

  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET)
    const user = dbGetUserById(payload.id)
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Utilisateur inactif' })
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      initials: user.initials,
      displayName: user.display_name,
      role: user.role,
    })
  } catch {
    return res.status(401).json({ error: 'Token invalide' })
  }
})

/**
 * POST /api/auth/register
 * Create a new user (admin only in production).
 */
app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName, role } = req.body
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'Tous les champs sont requis' })
  }

  const existing = dbGetUserByEmail(email.toLowerCase().trim())
  if (existing) {
    return res.status(409).json({ error: 'Cet email est deja utilise' })
  }

  const hash = bcrypt.hashSync(password, 10)
  const initials = (firstName[0] + lastName[0]).toUpperCase()
  const displayName = `${firstName} ${lastName.charAt(0)}.`

  const id = dbInsertUser({
    email: email.toLowerCase().trim(),
    password_hash: hash,
    first_name: firstName,
    last_name: lastName,
    initials,
    display_name: displayName,
    role: role || 'user',
  })

  res.json({ success: true, userId: id })
})

/**
 * OneLogin SSO callback stub.
 * POST /api/auth/sso/callback
 * When OneLogin is configured, this receives the OIDC token.
 */
app.post('/api/auth/sso/callback', async (req, res) => {
  const { code, redirectUri } = req.body

  const settings = dbGetAllSettings()
  const clientId = settings.oneloginClientId
  const clientSecret = settings.oneloginClientSecret
  const issuer = settings.oneloginIssuer

  if (!clientId || !clientSecret || !issuer) {
    return res.status(503).json({ error: 'SSO OneLogin non configure. Renseignez les parametres dans le back office.' })
  }

  // Validate issuer is a proper HTTPS URL to prevent SSRF
  try {
    const issuerUrl = new URL(issuer)
    if (issuerUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Issuer URL must use HTTPS' })
    }
  } catch {
    return res.status(400).json({ error: 'Issuer URL invalide' })
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(`${issuer}/oidc/2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenRes.ok) throw new Error('Token exchange failed')
    const tokens = await tokenRes.json()

    // Get user info
    const userInfoRes = await fetch(`${issuer}/oidc/2/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userInfoRes.ok) throw new Error('UserInfo failed')
    const userInfo = await userInfoRes.json()

    // Upsert user in DB
    const firstName = userInfo.given_name || userInfo.name?.split(' ')[0] || ''
    const lastName = userInfo.family_name || userInfo.name?.split(' ').slice(1).join(' ') || ''
    const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase()

    const user = dbUpsertSsoUser({
      email: userInfo.email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      initials,
      display_name: `${firstName} ${lastName.charAt(0) || ''}.`,
      role: 'user', // Default role, admin can change
      sso_id: userInfo.sub,
    })

    dbUpdateUserLogin(user.id)

    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' },
    )

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        initials: user.initials,
        displayName: user.display_name,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('SSO error:', err.message)
    res.status(500).json({ error: 'Erreur SSO: ' + err.message })
  }
})

/**
 * GET /api/auth/sso/config
 * Returns OneLogin config for the frontend (public info only).
 */
app.get('/api/auth/sso/config', (_req, res) => {
  const settings = dbGetAllSettings()
  const configured = !!(settings.oneloginClientId && settings.oneloginIssuer)
  res.json({
    configured,
    clientId: settings.oneloginClientId || '',
    issuer: settings.oneloginIssuer || '',
  })
})

// ═══════════════════════════════════════════════════════════
// Activity logging helper
// ═══════════════════════════════════════════════════════════

function logActivity(req, action, targetType = '', targetId = '', details = '') {
  try {
    dbInsertLog({
      userId: req.userId || null,
      userEmail: req.userEmail || '',
      action,
      targetType,
      targetId: String(targetId),
      details,
      ip: req.ip || req.connection?.remoteAddress || '',
    })
  } catch {}
}

// ═══════════════════════════════════════════════════════════
// Admin routes: Logs, Stats, Export, Maintenance, Quotas, API Key
// ═══════════════════════════════════════════════════════════

// Logs
app.get('/api/logs', requireDSI, (req, res) => {
  const limit = parseInt(req.query.limit) || 200
  res.json(dbGetLogs(limit))
})

// Stats (dashboard)
app.get('/api/stats', requireDSI, (_req, res) => {
  res.json(dbGetStats())
})

// Export CSV
app.get('/api/export/:type', requireDSI, (req, res) => {
  const { type } = req.params
  let rows = []
  let filename = ''
  let headers = []

  if (type === 'users') {
    rows = dbGetAllUsers()
    headers = ['id', 'email', 'first_name', 'last_name', 'role', 'active', 'created_at', 'last_login']
    filename = 'utilisateurs.csv'
  } else if (type === 'demands') {
    rows = dbGetAllDemands().map((d) => ({
      id: d.id, userName: d.userName, userEmail: d.userEmail, status: d.status,
      service: d.ticket?.service || '', titre: d.ticket?.titre || '',
      urgence: d.ticket?.urgence || '', glpiTicketId: d.glpiTicketId || '',
      glpiStatus: d.glpiStatusLabel || '', createdAt: d.createdAt,
    }))
    headers = ['id', 'userName', 'userEmail', 'status', 'service', 'titre', 'urgence', 'glpiTicketId', 'glpiStatus', 'createdAt']
    filename = 'demandes.csv'
  } else if (type === 'logs') {
    rows = dbGetLogs(5000)
    headers = ['id', 'user_email', 'action', 'target_type', 'target_id', 'details', 'ip', 'created_at']
    filename = 'logs.csv'
  } else {
    return res.status(400).json({ error: 'Type invalide' })
  }

  // Build CSV
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send('\uFEFF' + csv) // BOM for Excel
})

// Import users from CSV
app.post('/api/users/import', requireDSI, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' })

  // Validate that the file is within the uploads directory
  const uploadsDir = join(__dirname, 'uploads')
  const filePath = require('path').resolve(req.file.path)
  if (!filePath.startsWith(uploadsDir)) {
    return res.status(400).json({ error: 'Chemin de fichier invalide' })
  }

  try {
    const content = require('fs').readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter((l) => l.trim())
    if (lines.length < 2) return res.status(400).json({ error: 'Fichier vide ou invalide' })

    const headerLine = lines[0].toLowerCase()
    const sep = headerLine.includes(';') ? ';' : ','
    const headers = headerLine.split(sep).map((h) => h.trim().replace(/"/g, ''))

    const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'))
    const firstIdx = headers.findIndex((h) => h.includes('prenom') || h.includes('first') || h.includes('prénom'))
    const lastIdx = headers.findIndex((h) => h.includes('nom') || h.includes('last') || h.includes('name'))
    const roleIdx = headers.findIndex((h) => h.includes('role') || h.includes('rôle') || h.includes('profil'))
    const passIdx = headers.findIndex((h) => h.includes('pass') || h.includes('mot'))

    if (emailIdx === -1) return res.status(400).json({ error: 'Colonne email introuvable dans le CSV' })

    let created = 0
    let skipped = 0
    const errors = []

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ''))
      const email = cols[emailIdx]?.toLowerCase().trim()
      if (!email) continue

      const existing = dbGetUserByEmail(email)
      if (existing) { skipped++; continue }

      const firstName = cols[firstIdx] || email.split('@')[0].split('.')[0] || ''
      const lastName = cols[lastIdx] || email.split('@')[0].split('.').slice(1).join('.') || ''
      const role = cols[roleIdx] || 'user'
      const password = cols[passIdx] || 'changeme123'
      const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase()

      try {
        dbInsertUser({
          email,
          password_hash: bcrypt.hashSync(password, 10),
          first_name: firstName,
          last_name: lastName,
          initials,
          display_name: `${firstName} ${lastName.charAt(0) || ''}.`,
          role: ['user', 'rh', 'dsi'].includes(role) ? role : 'user',
        })
        created++
      } catch (e) {
        errors.push(`Ligne ${i + 1}: ${e.message}`)
      }
    }

    res.json({ success: true, created, skipped, errors })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Quotas check
app.get('/api/quotas/:userId', (req, res) => {
  const userId = parseInt(req.params.userId)
  const settings = dbGetAllSettings()
  const dailyLimit = parseInt(settings.aiDailyLimit) || 50
  const used = dbCountUserChatsToday(userId)
  res.json({ dailyLimit, used, remaining: Math.max(0, dailyLimit - used) })
})

// Maintenance mode
app.get('/api/maintenance', (_req, res) => {
  const settings = dbGetAllSettings()
  res.json({
    enabled: settings.maintenanceMode === 'true',
    message: settings.maintenanceMessage || 'Le portail est en cours de maintenance. Veuillez reessayer plus tard.',
  })
})

// API Key management
app.get('/api/admin/api-key', requireDSI, (_req, res) => {
  // Return masked key
  const key = process.env.ANTHROPIC_API_KEY || ''
  const masked = key ? key.slice(0, 12) + '...' + key.slice(-6) : ''
  res.json({ configured: !!key, masked })
})

app.put('/api/admin/api-key', requireDSI, (req, res) => {
  const { apiKey } = req.body
  if (!apiKey) return res.status(400).json({ error: 'Cle requise' })
  process.env.ANTHROPIC_API_KEY = apiKey
  dbSetAllSettings({ anthropicApiKey: apiKey })
  res.json({ success: true })
})

// Roles & permissions config
app.get('/api/admin/roles', requireDSI, (_req, res) => {
  const settings = dbGetAllSettings()
  const roles = settings.customRoles ? JSON.parse(settings.customRoles) : {
    user: { label: 'Utilisateur', permissions: ['chat', 'form', 'view_own_demands'] },
    rh: { label: 'RH', permissions: ['chat', 'form', 'view_own_demands', 'account_deletion'] },
    dsi: { label: 'DSI', permissions: ['chat', 'form', 'view_own_demands', 'backoffice', 'manage_users', 'manage_catalogue', 'manage_settings', 'view_logs', 'export'] },
  }
  res.json(roles)
})

app.put('/api/admin/roles', requireDSI, (req, res) => {
  dbSetAllSettings({ customRoles: JSON.stringify(req.body) })
  res.json({ success: true })
})

// ═══════════════════════════════════════════════════════════
// User management (DSI only)
// ═══════════════════════════════════════════════════════════

app.get('/api/users', requireDSI, (_req, res) => {
  res.json(dbGetAllUsers())
})

app.put('/api/users/:id', (req, res) => {
  const { firstName, lastName, role, active } = req.body
  const id = parseInt(req.params.id)
  const user = dbGetUserById(id)
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  const initials = ((firstName || user.first_name)[0] + (lastName || user.last_name)[0]).toUpperCase()
  const displayName = `${firstName || user.first_name} ${(lastName || user.last_name).charAt(0)}.`

  dbUpdateUser({
    id,
    first_name: firstName || user.first_name,
    last_name: lastName || user.last_name,
    initials,
    display_name: displayName,
    role: role || user.role,
    active: active !== undefined ? (active ? 1 : 0) : user.active,
  })
  res.json({ success: true })
})

app.put('/api/users/:id/password', (req, res) => {
  const { password } = req.body
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caracteres' })
  }
  const id = parseInt(req.params.id)
  const hash = bcrypt.hashSync(password, 10)
  dbUpdateUserPassword(id, hash)
  res.json({ success: true })
})

app.delete('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id)
  if (id === 1) return res.status(403).json({ error: 'Impossible de supprimer le compte admin principal' })
  dbDeleteUser(id)
  res.json({ success: true })
})

// ═══════════════════════════════════════════════════════════

app.post('/api/chat', async (req, res) => {
  const { system, messages, stream, max_tokens } = req.body

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 1024,
        system: system || '',
        messages: messages || [],
        stream: !!stream,
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      console.error('Anthropic error:', anthropicRes.status, err)
      res.status(anthropicRes.status).send(err)
      return
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const reader = anthropicRes.body.getReader()
      const decoder = new TextDecoder()

      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          res.write(chunk)
        }
      } catch (e) {
        console.error('Stream error:', e.message)
      }
      res.end()
    } else {
      const data = await anthropicRes.json()
      res.json(data)
    }
  } catch (err) {
    console.error('Proxy error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// Email notification service
// ═══════════════════════════════════════════════════════════

function getSmtpConfig() {
  const settings = loadSettings()
  return {
    host: settings.smtpHost || process.env.SMTP_HOST,
    port: parseInt(settings.smtpPort || process.env.SMTP_PORT || '587'),
    user: settings.smtpUser || process.env.SMTP_USER,
    pass: settings.smtpPass || process.env.SMTP_PASS,
    from: settings.smtpFrom || process.env.SMTP_FROM || 'portail-it@groupeism.sn',
    dsiEmails: settings.dsiEmails || process.env.DSI_EMAILS || '',
  }
}

function createTransporter() {
  const smtp = getSmtpConfig()
  if (!smtp.host || !smtp.user || !smtp.pass) return null
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  })
}

async function sendEmail(to, subject, html) {
  const transporter = createTransporter()
  if (!transporter) {
    console.log(`[EMAIL] SMTP non configuré — email non envoyé à ${to}`)
    return false
  }
  const smtp = getSmtpConfig()
  try {
    await transporter.sendMail({
      from: `"Portail IT ISM" <${smtp.from}>`,
      to,
      subject,
      html,
    })
    console.log(`[EMAIL] Envoyé à ${to}: ${subject}`)
    return true
  } catch (e) {
    console.error('[EMAIL] Echec envoi:', e.message)
    return false
  }
}

// ── Email templates ──

function emailNewTicket({ demandId, titre, service, urgence, userName, userEmail, glpiTicketId, description }) {
  return {
    subject: `🎫 Nouveau ticket ${glpiTicketId} — ${titre}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <div style="background: #3D1F00; padding: 20px 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #E8831A; font-size: 18px; margin: 0;">Portail IT — Groupe ISM</h1>
          <p style="color: rgba(255,255,255,.5); font-size: 12px; margin: 4px 0 0;">Nouveau ticket versé dans GLPI</p>
        </div>
        <div style="background: #fff; padding: 24px; border: 1px solid #E8DCCF; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #1A0C00; font-size: 14px; margin: 0 0 16px;">
            Un nouveau ticket a été créé depuis le Portail IT :
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr><td style="padding: 6px 0; color: #9C7A55; width: 120px;">Référence</td><td style="color: #1A0C00; font-weight: 600;">${glpiTicketId} (${demandId})</td></tr>
            <tr><td style="padding: 6px 0; color: #9C7A55;">Titre</td><td style="color: #1A0C00; font-weight: 600;">${titre}</td></tr>
            <tr><td style="padding: 6px 0; color: #9C7A55;">Service</td><td style="color: #1A0C00;">${service}</td></tr>
            <tr><td style="padding: 6px 0; color: #9C7A55;">Urgence</td><td style="color: #1A0C00;">${urgence}</td></tr>
            <tr><td style="padding: 6px 0; color: #9C7A55;">Demandeur</td><td style="color: #1A0C00;">${userName} (${userEmail})</td></tr>
          </table>
          <div style="margin: 16px 0; padding: 12px; background: #FBF7F2; border-radius: 8px; font-size: 13px; color: #5C3D1E; line-height: 1.6;">
            ${description}
          </div>
          <p style="font-size: 12px; color: #9C7A55; margin: 16px 0 0;">
            Connectez-vous à <a href="https://help.groupeism.sn" style="color: #D4731A;">GLPI</a> pour traiter ce ticket.
          </p>
        </div>
      </div>`,
  }
}

function emailStatusChange({ demandId, titre, glpiTicketId, newStatus, userName }) {
  const statusColors = {
    'En cours (attribué)': '#D4731A',
    'En cours (planifié)': '#D4731A',
    'En attente': '#8A5A00',
    'Résolu': '#1A7A4A',
    'Clôturé': '#1A7A4A',
    'Nouveau': '#1A5E9C',
  }
  const color = statusColors[newStatus] || '#5C3D1E'

  return {
    subject: `📋 Mise à jour ticket ${glpiTicketId} — ${newStatus}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <div style="background: #3D1F00; padding: 20px 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #E8831A; font-size: 18px; margin: 0;">Portail IT — Groupe ISM</h1>
          <p style="color: rgba(255,255,255,.5); font-size: 12px; margin: 4px 0 0;">Mise à jour de votre demande</p>
        </div>
        <div style="background: #fff; padding: 24px; border: 1px solid #E8DCCF; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #1A0C00; font-size: 14px; margin: 0 0 16px;">
            Bonjour ${userName},
          </p>
          <p style="color: #5C3D1E; font-size: 13px; line-height: 1.6; margin: 0 0 16px;">
            Le statut de votre demande <strong>${demandId}</strong> a changé :
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <div style="display: inline-block; background: ${color}15; border: 1px solid ${color}30; border-radius: 20px; padding: 8px 20px;">
              <span style="color: ${color}; font-size: 15px; font-weight: 700;">${newStatus}</span>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0;">
            <tr><td style="padding: 6px 0; color: #9C7A55; width: 120px;">Ticket GLPI</td><td style="color: #1A0C00; font-weight: 600;">${glpiTicketId}</td></tr>
            <tr><td style="padding: 6px 0; color: #9C7A55;">Titre</td><td style="color: #1A0C00;">${titre}</td></tr>
          </table>
          <p style="font-size: 12px; color: #9C7A55; margin: 16px 0 0;">
            Vous pouvez suivre l'avancement de votre demande sur le Portail IT.
          </p>
        </div>
      </div>`,
  }
}

/**
 * Notify DSI technicians about a new ticket.
 */
async function notifyTechnicians(ticketInfo) {
  const smtp = getSmtpConfig()
  const emails = smtp.dsiEmails.split(',').map((e) => e.trim()).filter(Boolean)
  if (emails.length === 0) {
    console.log('[EMAIL] Aucun email DSI configuré — notification techniciens ignorée')
    return
  }
  const { subject, html } = emailNewTicket(ticketInfo)
  for (const email of emails) {
    await sendEmail(email, subject, html)
  }
}

/**
 * Notify requester about a status change.
 */
async function notifyRequester(userEmail, statusInfo) {
  if (!userEmail) return
  const { subject, html } = emailStatusChange(statusInfo)
  await sendEmail(userEmail, subject, html)
}

// ═══════════════════════════════════════════════════════════
// GLPI API Integration
// ═══════════════════════════════════════════════════════════

const GLPI_API_URL = process.env.GLPI_API_URL     // ex: https://glpi.ism.sn/apirest.php
const GLPI_APP_TOKEN = process.env.GLPI_APP_TOKEN
const GLPI_USER_TOKEN = process.env.GLPI_USER_TOKEN

// Map urgency labels to GLPI urgency IDs (1-5)
const URGENCY_MAP = {
  'Faible': 1,
  'Normal': 3,
  'Élevée': 4,
  'Urgente': 5,
}

// Map portal services to GLPI itilcategories_id (sub-categories for precision)
// IDs from https://help.groupeism.sn GLPI instance
const SERVICE_CATEGORY_MAP = {
  // Problème machine → sous-catégorie selon le type de problème
  'Signaler un probleme machine': 3,     // Support technique > Panne matérielle
  'Signaler un problème machine': 3,
  'PC ne demarre pas': 3,                // Panne matérielle
  'Ecran bleu (BSOD)': 3,               // Panne matérielle
  'Lenteur excessive': 5,               // Support technique > Lenteur
  'Peripherique defaillant': 6,          // Support technique > Périphérique
  "Probleme d'affichage": 4,            // Support technique > Écrans
  // Mot de passe
  'Reinitialisation de mot de passe': 8, // Accès & Sécurité > Mot de passe
  'Réinitialisation de mot de passe': 8,
  // Création mail
  'Creation de compte mail': 12,         // Messagerie > Création adresse mail
  'Création de compte mail': 12,
  // Suppression compte
  'Suppression de compte': 10,           // Accès & Sécurité > Suppression de compte
}

// Fallback: map by general category name
const CATEGORY_FALLBACK_MAP = {
  'Support technique': 2,
  'Accès & Sécurité': 7,
  'Acces & Securite': 7,
  'Messagerie': 11,
}

function resolveCategory(ticketData) {
  // Try mapping by service name first (most precise)
  if (SERVICE_CATEGORY_MAP[ticketData.service]) {
    return SERVICE_CATEGORY_MAP[ticketData.service]
  }
  // Try mapping by ticket title keywords for sub-category precision
  const titre = ticketData.titre || ''
  for (const [keyword, catId] of Object.entries(SERVICE_CATEGORY_MAP)) {
    if (titre.toLowerCase().includes(keyword.toLowerCase())) {
      return catId
    }
  }
  // Fallback to general category
  return CATEGORY_FALLBACK_MAP[ticketData.categorie] || 0
}

// GLPI ticket type: 1 = Incident, 2 = Demande (Request)
// Incidents = something is broken/blocked; Requests = asking for an action
const TYPE_MAP = {
  'Signaler un probleme machine': 1,    // Incident
  'Signaler un problème machine': 1,    // Incident (accented)
  'Reinitialisation de mot de passe': 1, // Incident
  'Réinitialisation de mot de passe': 1, // Incident (accented)
  'Creation de compte mail': 2,          // Demande
  'Création de compte mail': 2,          // Demande (accented)
  'Suppression de compte': 2,            // Demande
}

function resolveTicketType(service) {
  return TYPE_MAP[service] || 1 // Default to Incident
}

// GLPI impact: 1=Very low, 2=Low, 3=Medium, 4=High, 5=Very high
const IMPACT_MAP = {
  'Signaler un probleme machine': 3,     // Affects 1 person's work
  'Signaler un problème machine': 3,
  'Reinitialisation de mot de passe': 2, // Affects 1 person
  'Réinitialisation de mot de passe': 2,
  'Creation de compte mail': 1,          // Not yet in production
  'Création de compte mail': 1,
  'Suppression de compte': 4,            // Security impact, org-level
}

function resolveImpact(service) {
  return IMPACT_MAP[service] || 3 // Default medium
}

/**
 * Open a GLPI session and return the session_token.
 */
async function glpiInitSession() {
  const res = await fetch(`${GLPI_API_URL}/initSession`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'App-Token': GLPI_APP_TOKEN,
      'Authorization': `user_token ${GLPI_USER_TOKEN}`,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GLPI initSession failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  return data.session_token
}

/**
 * Close a GLPI session.
 */
async function glpiKillSession(sessionToken) {
  await fetch(`${GLPI_API_URL}/killSession`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'App-Token': GLPI_APP_TOKEN,
      'Session-Token': sessionToken,
    },
  }).catch(() => {})
}

/**
 * Create a ticket in GLPI. Returns the created ticket ID.
 */
async function glpiCreateTicket(sessionToken, ticketData, glpiCategoryId) {
  const res = await fetch(`${GLPI_API_URL}/Ticket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'App-Token': GLPI_APP_TOKEN,
      'Session-Token': sessionToken,
    },
    body: JSON.stringify({
      input: {
        name: ticketData.titre,
        content: ticketData.description,
        urgency: URGENCY_MAP[ticketData.urgence] || 3,
        impact: resolveImpact(ticketData.service),
        type: resolveTicketType(ticketData.service),
        itilcategories_id: glpiCategoryId || resolveCategory(ticketData),
        status: 1, // New
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GLPI createTicket failed (${res.status}): ${body}`)
  }

  const data = await res.json()
  return data.id
}

/**
 * Add a followup (comment) to a GLPI ticket.
 */
async function glpiAddFollowup(sessionToken, ticketId, content) {
  const res = await fetch(`${GLPI_API_URL}/Ticket/${ticketId}/ITILFollowup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'App-Token': GLPI_APP_TOKEN,
      'Session-Token': sessionToken,
    },
    body: JSON.stringify({
      input: {
        itemtype: 'Ticket',
        items_id: ticketId,
        content,
        is_private: 0,
      },
    }),
  })
  if (!res.ok) {
    console.error('GLPI followup failed:', await res.text())
  }
}

/**
 * Assign an email as requester on a GLPI ticket (no GLPI user account needed).
 */
async function glpiAssignRequesterEmail(sessionToken, ticketId, email) {
  await fetch(`${GLPI_API_URL}/Ticket/${ticketId}/Ticket_User`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'App-Token': GLPI_APP_TOKEN,
      'Session-Token': sessionToken,
    },
    body: JSON.stringify({
      input: {
        tickets_id: ticketId,
        users_id: 0,
        type: 1, // 1 = Requester
        alternative_email: email,
      },
    }),
  }).catch((e) => console.error('GLPI assign requester email failed:', e.message))
}

/**
 * Search for a GLPI location by keyword. Returns location ID or 0.
 */
async function glpiFindLocation(sessionToken, locationText) {
  if (!locationText) return 0
  try {
    const url = `${GLPI_API_URL}/search/Location?criteria[0][field]=1&criteria[0][searchtype]=contains&criteria[0][value]=${encodeURIComponent(locationText)}&forcedisplay[0]=2&forcedisplay[1]=1`
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'App-Token': GLPI_APP_TOKEN,
        'Session-Token': sessionToken,
      },
    })
    if (!res.ok) return 0
    const data = await res.json()
    if (data.totalcount > 0 && data.data && data.data.length > 0) {
      return data.data[0][2] // field 2 = ID
    }
  } catch (e) {
    console.error('GLPI location search failed:', e.message)
  }
  return 0
}

/**
 * Search for a GLPI Computer by name. Returns { id, name } or null.
 */
async function glpiFindComputerByName(sessionToken, name) {
  if (!name) return null
  try {
    const url = `${GLPI_API_URL}/search/Computer?criteria%5B0%5D%5Bfield%5D=1&criteria%5B0%5D%5Bsearchtype%5D=contains&criteria%5B0%5D%5Bvalue%5D=${encodeURIComponent(name)}&forcedisplay%5B0%5D=2&forcedisplay%5B1%5D=1&range=0-1`
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', 'App-Token': GLPI_APP_TOKEN, 'Session-Token': sessionToken },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.totalcount > 0 && data.data && data.data.length > 0) {
      return { id: data.data[0][2], name: data.data[0][1] }
    }
  } catch (e) { console.error('GLPI computer search by name failed:', e.message) }
  return null
}

/**
 * Search for a GLPI Computer by the "Usager" (contact) field.
 * The contact field contains Windows login like "ndeye-yacine.gaye@GROUPEISM".
 * We search with both firstName and lastName to avoid false matches.
 * Returns { id, name } or null (first match).
 */
async function glpiFindComputerByUser(sessionToken, { firstName, lastName }) {
  if (!lastName) return null
  try {
    // Search contact field containing lastName (mandatory)
    // AND contact field containing firstName or beginning of it (to disambiguate)
    let url = `${GLPI_API_URL}/search/Computer?`
      + `criteria%5B0%5D%5Bfield%5D=7&criteria%5B0%5D%5Bsearchtype%5D=contains&criteria%5B0%5D%5Bvalue%5D=${encodeURIComponent(lastName)}`

    // Add firstName criteria if available (handles compound names like ndeye-yacine)
    if (firstName) {
      // Use first 3+ chars of firstName to match (e.g. "Oumar" → "oum", "Ndeye-Yacine" → "ndeye")
      const firstNameSearch = firstName.toLowerCase().split(/[-\s]/)[0] // "Ndeye-Yacine" → "ndeye"
      url += `&criteria%5B1%5D%5Blink%5D=AND&criteria%5B1%5D%5Bfield%5D=7&criteria%5B1%5D%5Bsearchtype%5D=contains&criteria%5B1%5D%5Bvalue%5D=${encodeURIComponent(firstNameSearch)}`
    }

    url += `&forcedisplay%5B0%5D=2&forcedisplay%5B1%5D=1&forcedisplay%5B2%5D=7&range=0-1`

    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', 'App-Token': GLPI_APP_TOKEN, 'Session-Token': sessionToken },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.totalcount > 0 && data.data && data.data.length > 0) {
      console.log(`Found computer for ${firstName} ${lastName}: ${data.data[0][1]} (contact: ${data.data[0][7]})`)
      return { id: data.data[0][2], name: data.data[0][1], contact: data.data[0][7] }
    }
  } catch (e) { console.error('GLPI computer search by user failed:', e.message) }
  return null
}

/**
 * Link a computer to a GLPI ticket.
 */
async function glpiLinkItem(sessionToken, ticketId, itemtype, itemId) {
  await fetch(`${GLPI_API_URL}/Ticket/${ticketId}/Item_Ticket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'App-Token': GLPI_APP_TOKEN,
      'Session-Token': sessionToken,
    },
    body: JSON.stringify({
      input: {
        tickets_id: ticketId,
        itemtype,
        items_id: itemId,
      },
    }),
  }).catch((e) => console.error('GLPI link item failed:', e.message))
}

/**
 * Format a conversation array into readable text for GLPI followup.
 */
function formatConversation(conversation) {
  if (!conversation || conversation.length === 0) return null
  const lines = conversation.map((msg) => {
    const who = msg.role === 'user' ? '👤 Utilisateur' : '🤖 Assistant IA'
    return `${who} :\n${msg.content}`
  })
  return [
    '═══ Conversation Portail IT ISM ═══',
    '',
    ...lines,
    '',
    '═══ Fin de la conversation ═══',
  ].join('\n\n')
}

/**
 * POST /api/glpi/tickets
 * Receives a ticket from the backoffice, creates it in GLPI,
 * and returns the GLPI ticket ID.
 */
app.post('/api/glpi/tickets', async (req, res) => {
  // Check GLPI config
  if (!GLPI_API_URL || !GLPI_APP_TOKEN || !GLPI_USER_TOKEN) {
    return res.status(503).json({
      error: 'GLPI non configuré',
      message: 'Les paramètres GLPI_API_URL, GLPI_APP_TOKEN et GLPI_USER_TOKEN doivent être renseignés dans server/.env',
    })
  }

  const { ticket, demandId, userName, userEmail, userFirstName, userLastName, conversation, location, glpiCategoryId } = req.body

  if (!ticket || !ticket.titre) {
    return res.status(400).json({ error: 'Données de ticket manquantes' })
  }

  let sessionToken = null

  try {
    // 1. Open session
    sessionToken = await glpiInitSession()

    // 2. Create ticket — build HTML description for GLPI
    let htmlDesc = ''

    // If structured form data exists, render it as HTML table
    if (ticket.formData && ticket.formData.length > 0) {
      htmlDesc += '<table style="border-collapse:collapse;width:100%;margin-bottom:12px;">'
      for (const fd of ticket.formData) {
        let val = ''
        if (fd.type === 'file' && fd.fileUrls?.length) {
          val = fd.fileUrls.map((url, i) => {
            const isImg = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
            return isImg
              ? `<a href="${url}" target="_blank"><img src="${url}" style="max-height:80px;border-radius:4px;" /></a>`
              : `<a href="${url}" target="_blank">Fichier ${i + 1}</a>`
          }).join(' ')
        } else if (Array.isArray(fd.value)) {
          val = fd.value.join(', ')
        } else if (typeof fd.value === 'boolean') {
          val = fd.value ? 'Oui' : 'Non'
        } else {
          val = String(fd.value || '')
        }
        htmlDesc += `<tr><td style="padding:4px 8px;font-weight:bold;color:#666;vertical-align:top;white-space:nowrap;">${fd.label}</td><td style="padding:4px 8px;">${val}</td></tr>`
      }
      htmlDesc += '</table>'
    } else {
      htmlDesc += `<p>${(ticket.description || '').replace(/\n/g, '<br>')}</p>`
    }

    // Attachments section
    if (ticket.attachments?.length) {
      htmlDesc += '<hr><p><strong>Pieces jointes :</strong></p>'
      for (const url of ticket.attachments) {
        const isImg = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
        htmlDesc += isImg
          ? `<p><a href="${url}" target="_blank"><img src="${url}" style="max-height:200px;border-radius:8px;" /></a></p>`
          : `<p><a href="${url}" target="_blank">${url.split('/').pop()}</a></p>`
      }
    }

    // Metadata footer
    htmlDesc += `<hr><p style="color:#999;font-size:11px;">Origine : Portail IT ISM (${demandId}) | Demandeur : ${userName || 'N/A'} (${userEmail || ''}) | Service : ${ticket.service} | Urgence : ${ticket.urgence} | SLA : ${ticket.sla}</p>`

    const enrichedTicket = {
      ...ticket,
      description: htmlDesc,
    }

    const glpiTicketId = await glpiCreateTicket(sessionToken, enrichedTicket, glpiCategoryId)

    // 3. For machine problems, try to find and link a computer
    const isMachineProblem = (ticket.service || '').toLowerCase().includes('machine') ||
                             (ticket.service || '').toLowerCase().includes('probleme')
    if (isMachineProblem) {
      let computer = null

      // Strategy 1: Look for a computer name in the description (e.g. "DESKTOP-8Q2RBLG", "LP-4CE9211MWZ")
      const desc = ticket.description || ''
      const computerMatch = desc.match(/\b(PC[-_]?\w+|DESKTOP[-_]\w+|LP[-_]\w+|ISM[-_]\w+)/i)
      if (computerMatch) {
        computer = await glpiFindComputerByName(sessionToken, computerMatch[1])
      }

      // Strategy 2: If not found by name, search by user (via Usager/contact field using firstName + lastName)
      if (!computer && (userFirstName || userLastName)) {
        computer = await glpiFindComputerByUser(sessionToken, { firstName: userFirstName, lastName: userLastName })
      }

      if (computer) {
        await glpiLinkItem(sessionToken, glpiTicketId, 'Computer', computer.id)
        console.log(`Computer "${computer.name}" (ID ${computer.id}) linked to ticket ${glpiTicketId}`)
      }
    }

    // 4. Try to associate a location
    if (location) {
      const locationId = await glpiFindLocation(sessionToken, location)
      if (locationId) {
        // Update the ticket with the location
        await fetch(`${GLPI_API_URL}/Ticket/${glpiTicketId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'App-Token': GLPI_APP_TOKEN,
            'Session-Token': sessionToken,
          },
          body: JSON.stringify({ input: { id: glpiTicketId, locations_id: locationId } }),
        }).catch(() => {})
      }
    }

    // 4. Assign the portal email as requester
    if (userEmail) {
      await glpiAssignRequesterEmail(sessionToken, glpiTicketId, userEmail)
      console.log(`Requester email ${userEmail} assigned to ticket ${glpiTicketId}`)
    }

    // 4. Add conversation as followup if available
    const conversationText = formatConversation(conversation)
    if (conversationText) {
      await glpiAddFollowup(sessionToken, glpiTicketId, conversationText)
    }

    // 5. Notify technicians by email (async, don't block response)
    notifyTechnicians({
      demandId,
      titre: ticket.titre,
      service: ticket.service,
      urgence: ticket.urgence,
      userName: userName || 'N/A',
      userEmail: userEmail || 'N/A',
      glpiTicketId: `GLPI-${glpiTicketId}`,
      description: ticket.description,
    }).catch(() => {})

    // 6. Return success
    res.json({
      success: true,
      glpiTicketId,
      message: `Ticket #${glpiTicketId} créé dans GLPI`,
    })
  } catch (err) {
    console.error('GLPI error:', err.message)
    res.status(502).json({
      error: 'Erreur GLPI',
      message: err.message,
    })
  } finally {
    // 4. Always close session
    if (sessionToken) {
      await glpiKillSession(sessionToken)
    }
  }
})

/**
 * GET /api/glpi/status
 * Check if GLPI is configured and reachable.
 */
app.get('/api/glpi/status', async (_req, res) => {
  if (!GLPI_API_URL || !GLPI_APP_TOKEN || !GLPI_USER_TOKEN) {
    return res.json({ configured: false, connected: false })
  }

  try {
    const sessionToken = await glpiInitSession()
    await glpiKillSession(sessionToken)
    res.json({ configured: true, connected: true })
  } catch (err) {
    res.json({ configured: true, connected: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// GLPI Category management (Portal = master)
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/glpi/categories
 * Create a new ITILCategory in GLPI. Returns the created category ID.
 */
app.post('/api/glpi/categories', async (req, res) => {
  if (!GLPI_API_URL || !GLPI_APP_TOKEN || !GLPI_USER_TOKEN) {
    return res.status(503).json({ error: 'GLPI non configuré' })
  }

  const { name, parentId } = req.body
  if (!name) return res.status(400).json({ error: 'Nom requis' })

  let sessionToken = null
  try {
    sessionToken = await glpiInitSession()

    const glpiRes = await fetch(`${GLPI_API_URL}/ITILCategory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'App-Token': GLPI_APP_TOKEN,
        'Session-Token': sessionToken,
      },
      body: JSON.stringify({
        input: {
          name,
          itilcategories_id: parentId || 0,
          is_incident: 1,
          is_request: 1,
          is_helpdeskvisible: 1,
        },
      }),
    })

    if (!glpiRes.ok) {
      const body = await glpiRes.text()
      throw new Error(`GLPI createCategory failed (${glpiRes.status}): ${body}`)
    }

    const data = await glpiRes.json()
    console.log(`GLPI category "${name}" created with ID ${data.id}`)
    res.json({ success: true, glpiCategoryId: data.id })
  } catch (err) {
    console.error('GLPI category error:', err.message)
    res.status(502).json({ error: err.message })
  } finally {
    if (sessionToken) await glpiKillSession(sessionToken)
  }
})

/**
 * GET /api/glpi/categories
 * List all ITILCategories from GLPI for import.
 */
app.get('/api/glpi/categories', async (_req, res) => {
  if (!GLPI_API_URL || !GLPI_APP_TOKEN || !GLPI_USER_TOKEN) {
    return res.status(503).json({ error: 'GLPI non configuré' })
  }

  let sessionToken = null
  try {
    sessionToken = await glpiInitSession()

    const glpiRes = await fetch(`${GLPI_API_URL}/ITILCategory?range=0-100`, {
      headers: {
        'Content-Type': 'application/json',
        'App-Token': GLPI_APP_TOKEN,
        'Session-Token': sessionToken,
      },
    })

    if (!glpiRes.ok) throw new Error(`GLPI listCategories failed (${glpiRes.status})`)

    const data = await glpiRes.json()
    const categories = data.map((c) => ({
      id: c.id,
      name: c.name,
      completename: c.completename,
      level: c.level,
      parentId: c.itilcategories_id,
    }))

    res.json({ categories })
  } catch (err) {
    console.error('GLPI categories error:', err.message)
    res.status(502).json({ error: err.message })
  } finally {
    if (sessionToken) await glpiKillSession(sessionToken)
  }
})

// ═══════════════════════════════════════════════════════════
// GLPI → Portal sync (ticket status)
// ═══════════════════════════════════════════════════════════

// GLPI status IDs → portal labels
const GLPI_STATUS_MAP = {
  1: { status: 'new',         label: 'Nouveau' },
  2: { status: 'in_progress', label: 'En cours (attribué)' },
  3: { status: 'in_progress', label: 'En cours (planifié)' },
  4: { status: 'waiting',     label: 'En attente' },
  5: { status: 'resolved',    label: 'Résolu' },
  6: { status: 'closed',      label: 'Clôturé' },
}

/**
 * POST /api/glpi/sync
 * Receives an array of { demandId, glpiTicketId } and returns updated statuses.
 * The glpiTicketId is expected as "GLPI-123" — we extract the number.
 */
app.post('/api/glpi/sync', async (req, res) => {
  if (!GLPI_API_URL || !GLPI_APP_TOKEN || !GLPI_USER_TOKEN) {
    return res.status(503).json({ error: 'GLPI non configuré' })
  }

  const { tickets } = req.body // [{ demandId, glpiTicketId, currentGlpiStatus?, userEmail?, userName?, titre? }]
  if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
    return res.json({ updates: [] })
  }

  let sessionToken = null
  try {
    sessionToken = await glpiInitSession()
    const updates = []

    for (const { demandId, glpiTicketId, currentGlpiStatus, userEmail: reqEmail, userName: reqName, titre: reqTitre } of tickets) {
      // Extract numeric ID from "GLPI-54"
      const numId = parseInt(String(glpiTicketId).replace(/\D/g, ''), 10)
      if (!numId || isNaN(numId) || numId <= 0 || numId > 999999999) continue

      // Construct URL safely using validated integer — prevents SSRF
      const safeTicketUrl = `${GLPI_API_URL}/Ticket/${numId}`

      try {
        const ticketRes = await fetch(safeTicketUrl, {
          headers: {
            'Content-Type': 'application/json',
            'App-Token': GLPI_APP_TOKEN,
            'Session-Token': sessionToken,
          },
        })
        if (!ticketRes.ok) continue
        const ticketData = await ticketRes.json()
        const glpiStatus = GLPI_STATUS_MAP[ticketData.status] || { status: 'unknown', label: 'Inconnu' }

        const update = {
          demandId,
          glpiTicketId,
          glpiStatus: glpiStatus.status,
          glpiStatusLabel: glpiStatus.label,
          glpiDateMod: ticketData.date_mod,
          timeline: {
            glpiCreatedAt: ticketData.date_creation || ticketData.date || null,
            takenAt: ticketData.takeintoaccountdate || null,
            waitingAt: ticketData.begin_waiting_date || null,
            resolvedAt: ticketData.solvedate || null,
            closedAt: ticketData.closedate || null,
          },
        }
        updates.push(update)

        // Notify requester if status changed
        if (currentGlpiStatus && currentGlpiStatus !== glpiStatus.status && reqEmail) {
          notifyRequester(reqEmail, {
            demandId,
            titre: reqTitre || ticketData.name || '',
            glpiTicketId,
            newStatus: glpiStatus.label,
            userName: reqName || '',
          }).catch(() => {})
        }
      } catch (e) {
        console.error('Sync failed for ticket:', String(glpiTicketId).replace(/[^a-zA-Z0-9-]/g, ''), e.message)
      }
    }

    res.json({ updates })
  } catch (err) {
    console.error('GLPI sync error:', err.message)
    res.status(502).json({ error: err.message })
  } finally {
    if (sessionToken) await glpiKillSession(sessionToken)
  }
})

// ═══════════════════════════════════════════════════════════
// Settings persistence (SQLite)
// ═══════════════════════════════════════════════════════════

function loadSettings() {
  return dbGetAllSettings()
}

app.get('/api/settings', requireAuth, (_req, res) => {
  res.json(loadSettings())
})

app.put('/api/settings', requireDSI, (req, res) => {
  dbSetAllSettings(req.body)
  const updated = dbGetAllSettings()

  if (updated.glpiUrl) process.env.GLPI_API_URL = updated.glpiUrl
  if (updated.glpiToken) process.env.GLPI_APP_TOKEN = updated.glpiToken

  res.json({ success: true, settings: updated })
})

// ═══════════════════════════════════════════════════════════
// API — Services (catalogue)
// ═══════════════════════════════════════════════════════════

app.get('/api/services', (_req, res) => {
  res.json(dbGetAllServices())
})

app.post('/api/services', (req, res) => {
  dbInsertService(req.body)
  res.json({ success: true })
})

app.put('/api/services/:id', (req, res) => {
  dbUpdateService({ ...req.body, id: req.params.id })
  res.json({ success: true })
})

app.delete('/api/services/:id', (req, res) => {
  dbDeleteService(req.params.id)
  res.json({ success: true })
})

// ═══════════════════════════════════════════════════════════
// API — Demands
// ═══════════════════════════════════════════════════════════

app.get('/api/demands', (req, res) => {
  const { userId } = req.query
  if (userId) {
    res.json(dbGetDemandsByUser(Number(userId)))
  } else {
    res.json(dbGetAllDemands())
  }
})

app.post('/api/demands', (req, res) => {
  dbInsertDemand(req.body)
  res.json({ success: true })
})

app.patch('/api/demands/:id', (req, res) => {
  dbUpdateDemand(req.params.id, req.body)
  res.json({ success: true })
})

// ═══════════════════════════════════════════════════════════
// API — Notifications
// ═══════════════════════════════════════════════════════════

app.get('/api/notifications', (req, res) => {
  const { userEmail } = req.query
  res.json(dbGetNotifications(userEmail))
})

app.post('/api/notifications', (req, res) => {
  dbInsertNotification(req.body)
  res.json({ success: true })
})

app.patch('/api/notifications/:id/read', (req, res) => {
  dbMarkNotificationRead(Number(req.params.id))
  res.json({ success: true })
})

app.post('/api/notifications/read-all', (req, res) => {
  dbMarkAllRead(req.body.userEmail || '')
  res.json({ success: true })
})

// ═══════════════════════════════════════════════════════════
// Production: serve frontend static files
// ═══════════════════════════════════════════════════════════

if (IS_PROD) {
  const distPath = join(__dirname, '../dist')
  app.use(express.static(distPath))
  // SPA fallback — all non-API routes serve index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return res.status(404).end()
    res.sendFile(join(distPath, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}${IS_PROD ? ' (production)' : ' (development)'}`)
  console.log(`SQLite database: portail.db`)
})
