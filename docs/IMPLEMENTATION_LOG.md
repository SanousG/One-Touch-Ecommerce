# Historial de implementación

## Fases anteriores (resumen)

Fase 1: multi-tenancy y Better Auth. Fase 1.1: Docker. Fase 2A: catálogo. Fase 2B: tienda, carrito y WhatsApp. Fase 3A: landings con versiones. Sin frameworks de testing.

## Fase 3B — Editor visual de flujos de venta

### A. Resultado general

**Completo.** Los negocios pueden crear flujos por producto o globales, editarlos visualmente con React Flow, guardar borradores, simular recorridos y publicar versiones válidas. La versión publicada no se altera al editar el borrador. El aislamiento multi-tenant y los permisos OWNER/OPERATOR se verificaron. No se enviaron mensajes reales ni se crearon pedidos o conversaciones.

### B. Archivos creados y modificados

**Creados**: migración `20261121043606_sales_flows`; `src/lib/flows/{types,validation,service,http}.ts`; `src/components/flows/{flow-editor,flow-node-card,flow-simulator,flows-list,template-manager}.tsx`; rutas `src/app/api/admin/flows/{route,[id]/route,[id]/publish/route}`, `src/app/api/admin/templates/{route,[id]/route}`; páginas `src/app/dashboard/flows/{page,[id]/page}`, `src/app/dashboard/templates/page`; `docs/SALES_FLOW_ENGINE.md`.

**Modificados**: `prisma/schema.prisma` (SalesFlow, SalesFlowVersion, MessageTemplate + relaciones), `src/lib/auth/permissions.ts`, `src/components/ui/icon.tsx`, `src/components/dashboard/sidebar.tsx`, `src/components/catalog/products-view.tsx`, `src/app/dashboard/products/page.tsx`, `package.json`/lockfile (`@xyflow/react`), documentación.

**Eliminados**: ninguno. MCP y volúmenes intactos.

### C. Tecnologías y dependencias

`@xyflow/react@13.0.2` (React Flow) — compatible con React 19; `npm audit` en 0 vulnerabilidades. Resto: Next.js 16.4.6, React 19.3.0, TypeScript 5.9.3, Prisma 7.10.1, Tailwind 4.3.3, PostgreSQL 16.

### D. Modelo de datos y migraciones

`MessageTemplate` (tenant, nombre, tipo MESSAGE/CHECKOUT, contenido, imagen opcional con FK Restrict, activo), `SalesFlow` (tenant, producto opcional, scope PRODUCT/GLOBAL, slug, punteros de borrador/publicado), `SalesFlowVersion` (JSON de nodos, conexiones, plantillas y flujos globales; `revision`). Migración aplicada: «5 migrations found» → «Applying migration 20261121043606_sales_flows» → «All migrations have been successfully applied».

### E. Funcionamiento del editor visual

Barra izquierda compacta para añadir los seis bloques, lienzo con cuadrícula de puntos, minimapa, zoom y ajuste a la vista, arrastre y conexión de nodos, eliminación de conexiones/nodos permitidos, inspector derecho de 320 px y guardado de posiciones. `useNodesState`/`useEdgesState` gestionan cambios; el DTO se serializa al guardar.

### F. Bloques implementados

Inicio único sin entradas; Mensaje con plantillas ordenadas; Decisión con opciones y `fallback` como salidas independientes; Flujo global con versión fijada; Checkout con plantilla y campos previstos; Cierre con tres modos y plantilla final. Ninguno ejecuta ventas.

### G. Gestión de plantillas

`/dashboard/templates` permite crear, editar, activar/desactivar y seleccionar imágenes del negocio. Las plantillas usadas se copian al snapshot del flujo; se verificó que editar una plantilla tras publicar no cambia el contenido publicado.

### H. Flujos globales reutilizables

Flujo global publicado «Datos de entrega» referenciado desde el flujo de producto. El snapshot fijó `versionId` y copia del diagrama. El retorno se define por la arista de salida del nodo `GLOBAL_FLOW`. Se rechazó la autorreferencia con 422.

### I. Borradores y versiones publicadas

Guardar sobre la versión publicada crea una nueva versión; publicar actualiza el puntero en transacción. En la validación: flujo publicado en v1, borrador editado en v2, `hasUnpublishedChanges=true`. Conflicto de revisión → 409. Historial de versiones conservado.

### J. Simulador y limitaciones

**Probar flujo** muestra el recorrido en el inspector: mensajes, decisiones, ejecución/retorno de globales, Checkout y Cierre, con límite de 30 pasos y 3 niveles. No envía WhatsApp, no crea pedidos, no reserva stock y no registra conversaciones. La interacción visual completa en navegador (arrastrar/conectar con ratón) **no pudo verificarse**: se validó el render del editor y los flujos HTTP, por lo que se reporta como pendiente.

### K. Seguridad multi-tenant y permisos

El negocio B recibió 404 al consultar/modificar/publicar el flujo de A, 400 al usar imagen o flujo global de A. OPERATOR recibió 403 al publicar. Los IDs del navegador se revalidan contra el tenant en servidor. Sin HTML/JS en el contenido; límites de nodos, conexiones y profundidad.

### L. Integración con productos y futuras conversaciones

`/dashboard/products` muestra estado real (Sin flujo/Borrador/Publicado/Cambios sin publicar) y acción Crear/Abrir flujo. La ficha y la landing conservan su Click to Chat actual. `getPublishedFlowForProduct` expone el contrato (flowId, versionId, diagrama) sin crear conversaciones.

### M. Pantalla de Stitch utilizada y diferencias

`projects/1619124812250481064/screens/ea3b60ae3862415ca13bffd4b4a355a4`. Se conservaron cabecera compacta, barra izquierda, lienzo protagonista, inspector de 320 px, controles de zoom y nodos por tipo con flechas y etiquetas. Diferencias: plantilla fija sin drag-and-drop de biblioteca externa; los datos mostrados son reales del catálogo; el simulador se implementó en el inspector; no se muestran stock ni estados de pedido del diseño. No se copió HTML literal.

### N. Validaciones ejecutadas y resultados reales

| Validación | Resultado |
|---|---|
| `npm run lint` | ✅ 0 errores, 0 advertencias |
| `npm run typecheck` | ✅ sin errores |
| `npm run build` | ✅ 42 rutas, sin errores |
| `docker compose up -d --build` | ✅ 5 migraciones, `app` healthy |
| Crear plantillas MESSAGE x2 y CHECKOUT | ✅ 201 |
| Crear flujo global y publicarlo | ✅ 200 |
| Crear flujo por producto | ✅ 201 |
| Publicar diagrama inválido | ✅ 422 con 3 incidencias |
| Guardar borrador incompleto | ✅ 200 |
| Guardar diagrama completo con 8 nodos | ✅ 200, revisión 3 |
| Snapshot de 3 plantillas y global versionado | ✅ |
| Publicar flujo válido | ✅ 200 |
| Editar borrador tras publicar | ✅ v2 pública, v1 publicada, cambios detectados |
| Conflicto de revisión | ✅ 409 |
| Editor visual carga con React Flow | ✅ 200 (canvas hidratado en cliente) |
| B consulta/modifica/publica flujo A | ✅ 404 |
| B usa imagen de A | ✅ 400 |
| B referencia flujo global de A | ✅ 400 |
| Autorreferencia global rechazada | ✅ 422 «referencia circular» |
| Plantilla editada no altera snapshot publicado | ✅ contenido original conservado |
| OPERATOR publica | ✅ 403 |
| Sin tabla de pedidos | ✅ 16 tablas, ninguna de pedidos |
| Logs de `app` | ✅ sin errores críticos |
| Persistencia tras rebuild | ✅ 8 nodos, publicada v1, borrador v2 |
| Drag-and-drop real en navegador | ⚠️ pendiente (sin navegador automatizado) |

### O. Estado de Docker Compose

`app` y `db` Up (healthy), `migrate` Exited correctamente, `seed`/`migrate-dev` perfil `tools`. Sin volúmenes borrados.

### P. Problemas encontrados y soluciones

1. React Flow 13 no exporta `applyNodeChanges`/`applyEdgeChanges`: se migró a `useNodesState`/`useEdgesState`.
2. `normalizeDiagram` rechazaba `globalFlowId` vacío con error 500: se corrigió para aceptar cadena vacía.
3. Generación de IDs con `Date.now`/`Math.random` dentro del componente fue marcada por ESLint: se movió a helper de módulo.
4. Primer intento de cross-tenant con revisión incorrecta dio 409: se repitió con la revisión real y devolvió 400.
5. Estado del flujo en Productos se alimenta desde PostgreSQL, nunca se inventa.

### Q. Decisiones arquitectónicas y propuestas de mejora

Ver `docs/SALES_FLOW_ENGINE.md` y `docs/DECISIONS.md`. Propuesto: motor de ejecución con fijación de versión por conversación, interpolación segura de variables, auditoría de publicaciones y editor de plantillas con vista previa de variables.

### R. Estado de Git

Commit de Fase 3B con mensaje «Fase 3B: editor visual de flujos de venta». `.env`, volúmenes e imágenes fuera del repositorio.

### S. Pendientes para la siguiente fase

Motor de ejecución real: API de WhatsApp, clasificación de intenciones, checkout con recolección de datos y confirmación, pedidos, inventario y reservas. Conversaciones con versión publicada fija. No se implementaron aquí.
