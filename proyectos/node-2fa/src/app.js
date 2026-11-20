require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: dataDir }),
  name: 'authguard.sid',
  secret: process.env.SESSION_SECRET || 'local-demo-only-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(express.static(path.join(__dirname, '..', 'public')));

const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
const cleanEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validPassword = (value) => typeof value === 'string' && value.length >= 10 && value.length <= 72;
const validToken = (value) => typeof value === 'string' && /^\d{6}$/.test(value);
const setupPayload = async (user) => {
  const secret = user.totpSecret || authenticator.generateSecret();
  if (!user.totpSecret) await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } });
  const uri = authenticator.keyuri(user.email, 'AuthGuard Demo', secret);
  return { qr: await QRCode.toDataURL(uri), secret, email: user.email };
};
const regenerate = (req) => new Promise((resolve, reject) => req.session.regenerate((err) => err ? reject(err) : resolve()));

app.post('/api/auth/register', authLimit, async (req, res, next) => {
  try {
    const email = cleanEmail(req.body.email);
    if (!email.includes('@') || !validPassword(req.body.password)) return res.status(400).json({ error: 'Ingresa un correo válido y una contraseña de 10 a 72 caracteres.' });
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await prisma.user.create({ data: { email, passwordHash } });
    await regenerate(req);
    req.session.setupUserId = user.id;
    res.status(201).json({ message: 'Cuenta creada. Configura tu segundo factor.', setup: await setupPayload(user) });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    next(err);
  }
});

app.post('/api/auth/login', authLimit, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: cleanEmail(req.body.email) } });
    if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash))) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    await regenerate(req);
    if (user.totpEnabled) {
      req.session.pendingLoginUserId = user.id;
      return res.json({ requiresTotp: true, message: 'Ingresa el código de tu aplicación autenticadora.' });
    }
    req.session.setupUserId = user.id;
    res.json({ requiresSetup: true, message: 'Activa el segundo factor para completar el acceso.', setup: await setupPayload(user) });
  } catch (err) { next(err); }
});

app.post('/api/auth/enable-2fa', authLimit, async (req, res, next) => {
  try {
    if (!req.session.setupUserId || !validToken(req.body.token)) return res.status(400).json({ error: 'Completa el registro y escribe el código de seis dígitos.' });
    const user = await prisma.user.findUnique({ where: { id: req.session.setupUserId } });
    if (!user?.totpSecret || !authenticator.verify({ token: req.body.token, secret: user.totpSecret })) return res.status(400).json({ error: 'Código inválido. Revisa la hora del teléfono e inténtalo de nuevo.' });
    await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
    await regenerate(req);
    req.session.userId = user.id;
    res.json({ message: 'Segundo factor activado.', email: user.email });
  } catch (err) { next(err); }
});

app.post('/api/auth/verify-2fa', authLimit, async (req, res, next) => {
  try {
    if (!req.session.pendingLoginUserId || !validToken(req.body.token)) return res.status(400).json({ error: 'Inicia sesión y escribe el código de seis dígitos.' });
    const user = await prisma.user.findUnique({ where: { id: req.session.pendingLoginUserId } });
    if (!user?.totpEnabled || !user.totpSecret || !authenticator.verify({ token: req.body.token, secret: user.totpSecret })) return res.status(401).json({ error: 'Código inválido o vencido.' });
    await regenerate(req);
    req.session.userId = user.id;
    res.json({ message: 'Sesión iniciada.', email: user.email });
  } catch (err) { next(err); }
});

app.get('/api/me', async (req, res, next) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: 'No has iniciado sesión.' });
    const user = await prisma.user.findUnique({ where: { id: req.session.userId }, select: { email: true, totpEnabled: true } });
    if (!user) return res.status(401).json({ error: 'La cuenta ya no está disponible.' });
    res.json(user);
  } catch (err) { next(err); }
});

app.post('/api/auth/logout', (req, res) => req.session.destroy(() => {
  res.clearCookie('authguard.sid', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Sesión cerrada.' });
}));

app.use((err, req, res, next) => {
  console.error('Request failed:', err.message);
  res.status(500).json({ error: 'Ocurrió un error interno. Inténtalo de nuevo.' });
});

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => console.log(`AuthGuard disponible en http://localhost:${port}`));
async function shutdown() { server.close(); await prisma.$disconnect(); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

