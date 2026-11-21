# Decisiones técnicas

| # | Decisión | Motivo / consecuencia |
|---|---|---|
| 1 | Next.js 16.4.6 con App Router, `src/`, alias `@/*`, TypeScript estricto y ESLint | Versión estable actual; se usó `proxy.ts` en lugar de `middleware.ts` (renombrado en Next 16) |
| 2 | Tailwind CSS 4 con tokens `@theme` | Configuración mínima; los colores del diseño quedan como utilidades semánticas |
| 3 | Prisma 7.10.1 + `@prisma/adapter-pg` + `pg` | Compatible con Better Auth 1.7.27; Prisma 7 exige driver adapter y `prisma.config.ts` |
| 4 | Override de `effect` a 3.22.5 | Corrige el aviso de ReDoS de `@prisma/config` sin cambiar de ORM; `npm audit` queda en 0 vulnerabilidades |
| 5 | Better Auth 1.7.27 con `disableSignUp: true` | La incorporación de negocios está pendiente de aprobación; no se expone registro público |
| 6 | Hash de contraseñas con la primitiva de Better Auth (`ctx.password.hash`, scrypt) | Evita implementar criptografía propia |
| 7 | `cookieCache` desactivado | El negocio activo se lee siempre de la BD; evita selections obsoletas tras `switchTenant` |
| 8 | Rate limiting global 30/min y regla `/sign-in/email` 5/min | Protección básica contra fuerza bruta; en producción conviene `secondaryStorage` |
| 9 | Route Handlers para mutaciones en esta fase | Simples de probar por HTTP; los servicios quedan desacoplados y reutilizables desde Server Actions |
| 10 | `activeTenantId` en `users` con `input: false` en Better Auth | El servidor controla el cambio; el cliente no puede enviarlo |
| 11 | Guardas puras en `guards.ts` | Permiten probar autorización sin montar Next ni React |
| 12 | Vitest 5.1.1 + BD de pruebas real | Pruebas de integración contra PostgreSQL aislado, sin mocks de prisma |
| 13 | Sin E2E de navegador | Vitest no soporta Server Components asíncronos; se cubre la lógica del `proxy` con `NextRequest` y se complementó con prueba de humo HTTP local |
| 14 | `server-only` instalado y condición `react-server` en el seed | Necesario para ejecutar módulos del servidor desde Node/tsx |
| 15 | Estados vacíos en lugar de métricas | El panel no debe inventar cifras de módulos no implementados |

## Cambios de requisitos previstos

- El procedimiento definitivo de alta de negocios está pendiente de aprobación; cuando se autorice, se podrá activar `disableSignUp` o crear un flujo de invitación sin tocar los servicios tenants.
- Si se requiere auditoría de accesos, añadir un modelo `AuditLog` con `tenantId`.
- Si se requiere multi-sucursal, modelar `Location` dentro de un `Tenant` y mover el selector.

## Fuera de alcance de esta fase

Productos, carrito, tienda pública, landings, editor visual, WhatsApp, chatbot, pedidos, inventario, pagos y publicación en redes. No se crearon tablas ni rutas para ellos.
