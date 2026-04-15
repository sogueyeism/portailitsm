import Database from 'better-sqlite3'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = join(__dirname, 'portail.db')

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ═══════════════════════════════════════════════════════════
// Schema
// ═══════════════════════════════════════════════════════════

db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    emoji TEXT NOT NULL DEFAULT '📋',
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sla TEXT NOT NULL DEFAULT '4 heures',
    sla_speed TEXT NOT NULL DEFAULT 'mid',
    icon_color TEXT NOT NULL DEFAULT 'orange',
    categorie TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    restricted INTEGER NOT NULL DEFAULT 0,
    restricted_to TEXT DEFAULT '',
    glpi_category_id INTEGER DEFAULT NULL,
    mode TEXT NOT NULL DEFAULT 'chat',
    form_fields_json TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS demands (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL DEFAULT '',
    user_first_name TEXT DEFAULT '',
    user_last_name TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    reject_reason TEXT DEFAULT '',
    glpi_ticket_id TEXT DEFAULT '',
    glpi_status TEXT DEFAULT '',
    glpi_status_label TEXT DEFAULT '',
    hors_categorie INTEGER NOT NULL DEFAULT 0,
    ticket_json TEXT DEFAULT NULL,
    conversation_json TEXT DEFAULT '[]',
    timeline_json TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    user_email TEXT DEFAULT '',
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_email TEXT DEFAULT '',
    action TEXT NOT NULL,
    target_type TEXT DEFAULT '',
    target_id TEXT DEFAULT '',
    details TEXT DEFAULT '',
    ip TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT DEFAULT NULL,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    initials TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user',
    sso_id TEXT DEFAULT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login TEXT DEFAULT NULL
  );
`)

// Migrations — add columns if missing
try { db.exec(`ALTER TABLE services ADD COLUMN mode TEXT NOT NULL DEFAULT 'chat'`) } catch {}
try { db.exec(`ALTER TABLE services ADD COLUMN form_fields_json TEXT DEFAULT NULL`) } catch {}

// ═══════════════════════════════════════════════════════════
// Prepared statements
// ═══════════════════════════════════════════════════════════

const stmts = {
  // Users
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  getUserBySsoId: db.prepare('SELECT * FROM users WHERE sso_id = ?'),
  getAllUsers: db.prepare('SELECT id, email, first_name, last_name, initials, display_name, role, active, created_at, last_login FROM users ORDER BY created_at ASC'),
  insertUser: db.prepare('INSERT INTO users (email, password_hash, first_name, last_name, initials, display_name, role) VALUES (@email, @password_hash, @first_name, @last_name, @initials, @display_name, @role)'),
  updateUserLogin: db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?"),
  upsertSsoUser: db.prepare('INSERT INTO users (email, first_name, last_name, initials, display_name, role, sso_id) VALUES (@email, @first_name, @last_name, @initials, @display_name, @role, @sso_id) ON CONFLICT(email) DO UPDATE SET first_name=@first_name, last_name=@last_name, display_name=@display_name, sso_id=@sso_id'),
  updateUser: db.prepare('UPDATE users SET first_name=@first_name, last_name=@last_name, initials=@initials, display_name=@display_name, role=@role, active=@active WHERE id=@id'),
  updateUserPassword: db.prepare('UPDATE users SET password_hash=? WHERE id=?'),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),

  // Services
  getAllServices: db.prepare('SELECT * FROM services ORDER BY created_at ASC'),
  getService: db.prepare('SELECT * FROM services WHERE id = ?'),
  insertService: db.prepare(`INSERT INTO services (id, emoji, name, description, sla, sla_speed, icon_color, categorie, active, restricted, restricted_to, glpi_category_id, mode, form_fields_json) VALUES (@id, @emoji, @name, @description, @sla, @sla_speed, @icon_color, @categorie, @active, @restricted, @restricted_to, @glpi_category_id, @mode, @form_fields_json)`),
  updateService: db.prepare(`UPDATE services SET emoji=@emoji, name=@name, description=@description, sla=@sla, sla_speed=@sla_speed, icon_color=@icon_color, categorie=@categorie, active=@active, restricted=@restricted, restricted_to=@restricted_to, glpi_category_id=@glpi_category_id, mode=@mode, form_fields_json=@form_fields_json, updated_at=datetime('now') WHERE id=@id`),
  deleteService: db.prepare('DELETE FROM services WHERE id = ?'),

  getAllDemands: db.prepare('SELECT * FROM demands ORDER BY created_at DESC'),
  getDemand: db.prepare('SELECT * FROM demands WHERE id = ?'),
  getDemandsByUser: db.prepare('SELECT * FROM demands WHERE user_id = ? ORDER BY created_at DESC'),
  insertDemand: db.prepare(`INSERT INTO demands (id, user_id, user_name, user_email, user_first_name, user_last_name, status, hors_categorie, ticket_json, conversation_json, timeline_json) VALUES (@id, @user_id, @user_name, @user_email, @user_first_name, @user_last_name, @status, @hors_categorie, @ticket_json, @conversation_json, @timeline_json)`),
  updateDemand: db.prepare(`UPDATE demands SET status=@status, reject_reason=@reject_reason, glpi_ticket_id=@glpi_ticket_id, glpi_status=@glpi_status, glpi_status_label=@glpi_status_label, ticket_json=@ticket_json, timeline_json=@timeline_json, updated_at=datetime('now') WHERE id=@id`),

  getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
  setSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
  getAllSettings: db.prepare('SELECT * FROM settings'),

  getNotifications: db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'),
  getNotifsByUser: db.prepare("SELECT * FROM notifications WHERE user_email = ? OR user_email = '' ORDER BY created_at DESC LIMIT 50"),
  insertNotification: db.prepare('INSERT INTO notifications (type, title, message, user_email) VALUES (@type, @title, @message, @user_email)'),
  markRead: db.prepare('UPDATE notifications SET read = 1 WHERE id = ?'),
  markAllRead: db.prepare("UPDATE notifications SET read = 1 WHERE user_email = ? OR user_email = ''"),

  // Activity logs
  insertLog: db.prepare('INSERT INTO activity_logs (user_id, user_email, action, target_type, target_id, details, ip) VALUES (@user_id, @user_email, @action, @target_type, @target_id, @details, @ip)'),
  getLogs: db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?'),
  getLogsByUser: db.prepare('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'),
  countLogsByAction: db.prepare('SELECT action, COUNT(*) as count FROM activity_logs GROUP BY action'),

  // Quotas
  countUserChatsToday: db.prepare("SELECT COUNT(*) as count FROM activity_logs WHERE user_id = ? AND action = 'chat_message' AND created_at >= date('now')"),
}

// ═══════════════════════════════════════════════════════════
// Row converters
// ═══════════════════════════════════════════════════════════

function rowToService(row) {
  return {
    id: row.id, emoji: row.emoji, name: row.name, desc: row.description,
    sla: row.sla, slaSpeed: row.sla_speed, iconColor: row.icon_color,
    categorie: row.categorie, active: !!row.active, restricted: !!row.restricted,
    restrictedTo: row.restricted_to || '', glpiCategoryId: row.glpi_category_id || undefined,
    mode: row.mode || 'chat',
    formFields: row.form_fields_json ? JSON.parse(row.form_fields_json) : undefined,
  }
}

function serviceToRow(svc) {
  return {
    id: svc.id, emoji: svc.emoji, name: svc.name,
    description: svc.desc || svc.description || '',
    sla: svc.sla, sla_speed: svc.slaSpeed || svc.sla_speed || 'mid',
    icon_color: svc.iconColor || svc.icon_color || 'orange',
    categorie: svc.categorie, active: svc.active ? 1 : 0,
    restricted: svc.restricted ? 1 : 0,
    restricted_to: svc.restrictedTo || svc.restricted_to || '',
    glpi_category_id: svc.glpiCategoryId || svc.glpi_category_id || null,
    mode: svc.mode || 'chat',
    form_fields_json: svc.formFields ? JSON.stringify(svc.formFields) : null,
  }
}

function rowToDemand(row) {
  return {
    id: row.id, userId: row.user_id, userName: row.user_name,
    userEmail: row.user_email, userFirstName: row.user_first_name,
    userLastName: row.user_last_name, createdAt: row.created_at,
    status: row.status, rejectReason: row.reject_reason || undefined,
    glpiTicketId: row.glpi_ticket_id || undefined,
    glpiStatus: row.glpi_status || undefined,
    glpiStatusLabel: row.glpi_status_label || undefined,
    horsCategorie: !!row.hors_categorie,
    ticket: row.ticket_json ? JSON.parse(row.ticket_json) : null,
    conversation: row.conversation_json ? JSON.parse(row.conversation_json) : [],
    timeline: row.timeline_json ? JSON.parse(row.timeline_json) : undefined,
  }
}

// ═══════════════════════════════════════════════════════════
// Exports — Services
// ═══════════════════════════════════════════════════════════

export function dbGetAllServices() {
  return stmts.getAllServices.all().map(rowToService)
}

export function dbGetService(id) {
  const row = stmts.getService.get(id)
  return row ? rowToService(row) : null
}

export function dbInsertService(svc) {
  stmts.insertService.run(serviceToRow(svc))
}

export function dbUpdateService(svc) {
  stmts.updateService.run(serviceToRow(svc))
}

export function dbDeleteService(id) {
  stmts.deleteService.run(id)
}

// ═══════════════════════════════════════════════════════════
// Exports — Users
// ═══════════════════════════════════════════════════════════

export function dbGetUserByEmail(email) {
  return stmts.getUserByEmail.get(email) || null
}

export function dbGetUserById(id) {
  return stmts.getUserById.get(id) || null
}

export function dbGetUserBySsoId(ssoId) {
  return stmts.getUserBySsoId.get(ssoId) || null
}

export function dbGetAllUsers() {
  return stmts.getAllUsers.all()
}

export function dbInsertUser(user) {
  const result = stmts.insertUser.run(user)
  return result.lastInsertRowid
}

export function dbUpdateUserLogin(id) {
  stmts.updateUserLogin.run(id)
}

export function dbUpsertSsoUser(user) {
  stmts.upsertSsoUser.run(user)
  return stmts.getUserByEmail.get(user.email)
}

export function dbUpdateUser(user) {
  stmts.updateUser.run(user)
}

export function dbUpdateUserPassword(id, hash) {
  stmts.updateUserPassword.run(hash, id)
}

export function dbDeleteUser(id) {
  stmts.deleteUser.run(id)
}

// ═══════════════════════════════════════════════════════════
// Exports — Demands
// ═══════════════════════════════════════════════════════════

export function dbGetAllDemands() {
  return stmts.getAllDemands.all().map(rowToDemand)
}

export function dbGetDemandsByUser(userId) {
  return stmts.getDemandsByUser.all(userId).map(rowToDemand)
}

export function dbInsertDemand(d) {
  stmts.insertDemand.run({
    id: d.id, user_id: d.userId, user_name: d.userName,
    user_email: d.userEmail || '', user_first_name: d.userFirstName || '',
    user_last_name: d.userLastName || '', status: d.status,
    hors_categorie: d.horsCategorie ? 1 : 0,
    ticket_json: d.ticket ? JSON.stringify(d.ticket) : null,
    conversation_json: JSON.stringify(d.conversation || []),
    timeline_json: d.timeline ? JSON.stringify(d.timeline) : null,
  })
}

export function dbUpdateDemand(id, patch) {
  const existing = stmts.getDemand.get(id)
  if (!existing) return
  const merged = { ...rowToDemand(existing), ...patch }
  stmts.updateDemand.run({
    id,
    status: merged.status,
    reject_reason: merged.rejectReason || '',
    glpi_ticket_id: merged.glpiTicketId || '',
    glpi_status: merged.glpiStatus || '',
    glpi_status_label: merged.glpiStatusLabel || '',
    ticket_json: merged.ticket ? JSON.stringify(merged.ticket) : null,
    timeline_json: merged.timeline ? JSON.stringify(merged.timeline) : null,
  })
}

// ═══════════════════════════════════════════════════════════
// Exports — Settings
// ═══════════════════════════════════════════════════════════

export function dbGetAllSettings() {
  const rows = stmts.getAllSettings.all()
  const obj = {}
  for (const row of rows) obj[row.key] = row.value
  return obj
}

export function dbSetAllSettings(settings) {
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      stmts.setSetting.run(key, String(value))
    }
  })
  tx()
}

// ═══════════════════════════════════════════════════════════
// Exports — Notifications
// ═══════════════════════════════════════════════════════════

export function dbGetNotifications(userEmail) {
  return userEmail ? stmts.getNotifsByUser.all(userEmail) : stmts.getNotifications.all()
}

export function dbInsertNotification(n) {
  stmts.insertNotification.run({ type: n.type, title: n.title, message: n.message, user_email: n.userEmail || '' })
}

export function dbMarkNotificationRead(id) {
  stmts.markRead.run(id)
}

export function dbMarkAllRead(userEmail) {
  stmts.markAllRead.run(userEmail || '')
}

// ═══════════════════════════════════════════════════════════
// Exports — Activity Logs
// ═══════════════════════════════════════════════════════════

export function dbInsertLog(log) {
  stmts.insertLog.run({
    user_id: log.userId || null,
    user_email: log.userEmail || '',
    action: log.action,
    target_type: log.targetType || '',
    target_id: log.targetId || '',
    details: log.details || '',
    ip: log.ip || '',
  })
}

export function dbGetLogs(limit = 200) {
  return stmts.getLogs.all(limit)
}

export function dbGetLogsByUser(userId, limit = 100) {
  return stmts.getLogsByUser.all(userId, limit)
}

export function dbCountLogsByAction() {
  return stmts.countLogsByAction.all()
}

export function dbCountUserChatsToday(userId) {
  return stmts.countUserChatsToday.get(userId)?.count || 0
}

// ═══════════════════════════════════════════════════════════
// Exports — Stats (for dashboard)
// ═══════════════════════════════════════════════════════════

export function dbGetStats() {
  const totalDemands = db.prepare('SELECT COUNT(*) as c FROM demands').get().c
  const pendingDemands = db.prepare("SELECT COUNT(*) as c FROM demands WHERE status='pending'").get().c
  const approvedDemands = db.prepare("SELECT COUNT(*) as c FROM demands WHERE status='approved'").get().c
  const rejectedDemands = db.prepare("SELECT COUNT(*) as c FROM demands WHERE status='rejected'").get().c
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c
  const activeUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE active=1').get().c
  const totalServices = db.prepare('SELECT COUNT(*) as c FROM services').get().c
  const activeServices = db.prepare('SELECT COUNT(*) as c FROM services WHERE active=1').get().c
  const todayDemands = db.prepare("SELECT COUNT(*) as c FROM demands WHERE created_at >= date('now')").get().c
  const weekDemands = db.prepare("SELECT COUNT(*) as c FROM demands WHERE created_at >= date('now', '-7 days')").get().c
  const demandsByService = db.prepare("SELECT json_extract(ticket_json, '$.service') as service, COUNT(*) as count FROM demands WHERE ticket_json IS NOT NULL GROUP BY service ORDER BY count DESC").all()
  const demandsByDay = db.prepare("SELECT date(created_at) as day, COUNT(*) as count FROM demands WHERE created_at >= date('now', '-30 days') GROUP BY day ORDER BY day").all()
  const recentLogins = db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE action='login' AND created_at >= date('now', '-1 day')").get().c

  return {
    totalDemands, pendingDemands, approvedDemands, rejectedDemands,
    totalUsers, activeUsers, totalServices, activeServices,
    todayDemands, weekDemands, demandsByService, demandsByDay, recentLogins,
  }
}

export default db
