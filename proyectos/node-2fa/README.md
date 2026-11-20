# AuthGuard 2FA 🔐

Aplicación web local de demostración para registro e inicio de sesión con contraseña y segundo factor TOTP (códigos temporales de seis dígitos).

## Problema y solución

La contraseña por sí sola puede ser insuficiente para proteger una cuenta. AuthGuard agrega un paso con una aplicación autenticadora: al crear la cuenta genera un QR, valida el primer código para activar 2FA y vuelve a pedir un código en los siguientes inicios de sesión.

## Funcionalidades

- Registro e inicio de sesión con correo.
- Hash de contraseñas usando bcryptjs (factor de costo 12).
- Configuración TOTP con QR y clave manual de respaldo de configuración.
- Sesiones persistidas en SQLite, cookie `httpOnly` y protección `sameSite`.
- Límite de intentos en endpoints de autenticación.
- Persistencia de usuarios con Prisma y SQLite.
- Interfaz en español para probar el flujo completo localmente.

## Tecnologías

Node.js 20+, Express, Prisma, SQLite, bcryptjs, otplib, qrcode, express-session y Helmet.

## Ejecución local

```bash
npm install
```

Crea un archivo `.env` a partir de `.env.example` y cambia `SESSION_SECRET` por una cadena aleatoria privada. Después inicializa el esquema y levanta la aplicación:

```bash
npm run db:push
npm run dev
```

Abre `http://localhost:3000`. En el primer registro, escanea el QR con una app TOTP (por ejemplo, una aplicación autenticadora compatible) y verifica el código. Cierra la sesión para probar el ingreso con contraseña y segundo factor.

La base de datos `prisma/dev.db` y las sesiones locales se crean durante la ejecución y están excluidas del repositorio.

## Endpoints principales

| Método | Ruta | Función |
|---|---|---|
| POST | `/api/auth/register` | Crea cuenta y prepara configuración TOTP |
| POST | `/api/auth/enable-2fa` | Valida el primer código y activa 2FA |
| POST | `/api/auth/login` | Comprueba credenciales e inicia el paso 2FA |
| POST | `/api/auth/verify-2fa` | Verifica el código y establece la sesión |
| GET | `/api/me` | Consulta la cuenta de la sesión autenticada |
| POST | `/api/auth/logout` | Cierra la sesión |

## Decisiones y alcance

La sesión se regenera al avanzar los pasos de autenticación para reducir la exposición a fijación de sesión. La demo guarda el secreto TOTP en la base SQLite local para permitir la verificación; un servicio real debe proteger secretos con cifrado y gestión dedicada, contar con recuperación de cuenta, usar HTTPS, configurar límites y monitoreo según su despliegue y pasar revisión de seguridad.

Este proyecto es demostrativo y local: no debe recibir cuentas o contraseñas reales ni presentarse como servicio listo para producción.

## Descripción para la hoja de vida

> Construí una aplicación de autenticación con Node.js y Express, persistencia SQLite mediante Prisma y verificación 2FA basada en TOTP; implementé hash de contraseñas, sesiones persistentes y límites de intentos.

