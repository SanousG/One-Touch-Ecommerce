# Decisiones técnicas

| # | Decisión | Motivo / consecuencia |
|---|---|---|
| 1 | Next.js 16.4.6, App Router, `src/`, alias `@/*`, TypeScript estricto, ESLint | Versión estable; `proxy.ts` sustituye a `middleware.ts` en Next 16 |
| 2 | Tailwind CSS 4 con tokens `@theme` | Utilidades semánticas sin configuración pesada |
| 3 | Prisma 7.10.1 + `@prisma/adapter-pg` + `pg` | Compatible con Better Auth 1.7.27; exige driver adapter |
| 4 | Override de `effect` a 3.22.5 | Corrige aviso de ReDoS de `@prisma/config`; `npm audit` en 0 |
| 5 | Better Auth con `disableSignUp: true` | Alta de negocios pendiente de aprobación |
| 6 | Hash scrypt de Better Auth | No implementar criptografía propia |
| 7 | `cookieCache` desactivado | El negocio activo se lee siempre de la BD |
| 8 | Rate limiting 30/min y 5/min en `/sign-in/email` | Protección básica; en réplicas usar `secondaryStorage` |
| 9 | `activeTenantId` con `input: false` | El cliente no puede manipular el negocio activo |
| 10 | Route Handlers delgados sobre servicios | Autorización centralizada y reutilizable |
| 11 | Inicialización diferida de Prisma y Better Auth | La imagen compila sin `DATABASE_URL` ni `BETTER_AUTH_SECRET`; los secretos solo existen en tiempo de ejecución |
| 12 | Páginas de sesión marcadas `force-dynamic` | Evita prerenderizado que exigiría secretos en tiempo de build |
| 13 | `output: "standalone"` en Next | Imagen final pequeña, sin `npm` ni devDependencies |
| 14 | Dockerfile multi-stage con objetivos `deps`, `builder`, `migrator` y `runner` | El contenedor de ejecución no incluye la CLI de Prisma ni tsx |
| 15 | Servicio `migrate` con `prisma migrate deploy` y `depends_on` healthy | Migraciones reproducibles, sin `db push`, sin borrado de datos |
| 16 | Seed manual con perfil `tools` | No se ejecuta en cada arranque; sin credenciales en imágenes ni Git |
| 17 | PostgreSQL sin puerto publicado | Acceso privado por red Docker; superficie de ataque menor |
| 18 | `AUTH_COOKIES_SECURE=false` solo en local | Permite cookies sobre HTTP en `localhost`; el valor por defecto sigue siendo `Secure` para producción |
| 19 | Sin suites de pruebas automatizadas en esta etapa | Se sustituyeron por validación manual/HTTP documentada |

## Compatibilidad con la Fase 1

Se conservaron íntegramente login, logout, sesiones, usuarios, negocios, memberships, OWNER/OPERATOR, selector de negocio, protección cross-tenant, rate limiting y validaciones de formularios. Solo se retiró el código de pruebas automatizadas y sus dependencias.

## Cambios de requisitos previstos

- Alta definitiva de negocios pendiente de aprobación.
- `AuditLog` con `tenantId` si se requiere trazabilidad.
- Multi-sucursal: modelar `Location` dentro de `Tenant`.
- HTTPS en producción con cookies `Secure`.

## Fuera de alcance

Productos, carrito, tienda pública, landings, editor visual, WhatsApp, chatbot, pedidos, inventario, pagos y redes sociales.
