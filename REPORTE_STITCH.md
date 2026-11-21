# Reporte de verificación de diseños UI/UX — One-Touch-Ecommerce

> Fecha de verificación: 2026-11-20  
> Fuente: Google Stitch MCP (`https://stitch.googleapis.com/mcp`)  
> Estado: **SOLO VERIFICACIÓN**. No se generó código, no se inicializó Next.js, no se instalaron dependencias y no se modificó ningún diseño en Stitch.

---

## 0. Nota crítica sobre la conexión MCP (leer primero)

El MCP de Stitch está configurado en `opencode.json` con:

```json
"stitch": {
  "type": "remote",
  "url": "https://stitch.googleapis.com/mcp",
  "oauth": false,
  "headers": { "X-Goog-Api-Key": "{env:STITCH_API_KEY}" }
}
```

La variable `STITCH_API_KEY` **sí existe** en el entorno (53 caracteres, prefijo `AQ.Ab8RN...`). Sin embargo, **todas las herramientas invocadas a través del harness de OpenCode devuelven HTTP 401**:

```
Request is missing required authentication credential.
Expected OAuth 2 access token, login cookie or other valid authentication credential.
```

Esto afectó a `list_projects`, `get_project`, `list_screens`, `get_screen`, `list_design_systems` y `download_file`. **No es un problema de Stitch ni de la API key**: al realizar una llamada JSON-RPC directa al mismo endpoint MCP enviando el header `X-Goog-Api-Key`, la respuesta es HTTP 200 y los datos se obtienen correctamente.

**Conclusión:** el transporte MCP del harness no está propagando el header de autenticación. Toda la información de este reporte se obtuvo mediante llamadas JSON-RPC directas al endpoint oficial del MCP con la misma API key. Esto debe resolverse antes de automatizar cualquier flujo desde el agente.

---

## 1. Proyecto de Stitch seleccionado

| Campo | Valor |
|---|---|
| **Nombre** | `Editor Visual de Flujos` |
| **ID completo** | `projects/1619124812250481064` |
| **ID corto** | `1619124812250481064` |
| **Tipo** | `TEXT_TO_UI_PRO` |
| **Origen** | `WEB` |
| **Visibilidad** | `PRIVATE` |
| **Dispositivo** | `DESKTOP` |
| **Creado** | `2026-11-20T11:50:33.719125Z` |
| **Actualizado** | `2026-11-20T22:49:14.485832Z` |

### Por qué este proyecto y no otro

Es el **único proyecto que contiene simultáneamente las dos vistas solicitadas**:

1. **Inicio de sesión de la plataforma** → `Iniciar sesión — Panel de ventas`.
   El propio HTML incluye el texto: *"Si tienes acceso a más de un negocio, podrás elegirlo después de ingresar"*, lo que confirma el enfoque **multi-negocio / multi-tenant**.
2. **Dashboard / panel principal de Ganga Online** → `Inicio del panel — Ganga Online`, con selector de tienda `Ganga Online / Sucursal Central`, navegación (Inicio, Productos, Tienda y landings, Conversaciones, Pedidos, Inventario, Configuración) y estado `WhatsApp Sincronizado`.

Además contiene el resto del ecosistema operativo: carrito, catálogo, ficha de producto, landing, conversaciones, inventario, pedidos, editor de producto, editor de landing y editor visual de flujos.

> **Advertencia:** el título del proyecto (`Editor Visual de Flujos`) es engañoso; proviene aparentemente de la última pantalla generada (`Editor visual de flujos — Barra LED recargable`). El contenido real es un panel de operaciones e-commerce multi-negocio.

### Proyectos similares descartados

| Proyecto | ID | Pantallas | Motivo del descarte |
|---|---|---:|---|
| *(sin título)* | `17744271390739862945` | 0 | Proyecto vacío. |
| `WhatsApp Commerce UI/UX Prototype` | `6898429945450228748` | 5 | Tiene `Panel Privado — Ganga Online`, **pero no tiene pantalla de inicio de sesión**. Usa un sistema visual distinto (`Ganga Editorial OS`, verde azulado `#0f4c5c` + tipografía Newsreader). Es un prototipo paralelo, no la fuente de verdad de las dos vistas pedidas. |
| `Commerce SaaS Admin Dashboard` | `13874730587997489426` | 34 | Sistema genérico `Commerce Operational System` (verde `#176b4d`). Menciona "multi-tenant B2B", pero **no contiene Ganga Online ni login**. |
| `B2B Commerce Admin Dashboard` | `4588129243879558020` | 1 | Una sola pantalla `ADM-001 - Administrative Dashboard`; mismo sistema verde, sin Ganga Online ni login. |

**Recomendación antes de implementar:** confirmar con el equipo de diseño si `Ganga Editorial OS` (proyecto 689842...) debe unificarse con `Lumina Flow Canvas` (proyecto 161912...). Hoy coexisten dos lenguajes visuales para la misma marca "Ganga Online".

---

## 2. Cantidad de pantallas encontradas

**19 pantallas en total** en el proyecto seleccionado:

- **14** de tipo `DESIGN`
- **5** de tipo `IMAGE` (fotografías de producto usadas como assets)

---

## 3. Listado de pantallas con sus IDs

 prefijo completo: `projects/1619124812250481064/screens/`

| # | Título | ID de pantalla | Tipo | Dimensiones exportadas |
|---:|---|---|---|---|
| 1 | Carrito web — Ganga Online | `1653e502de0441bfbaabdf3cf12eaa50` | DESIGN | 2560 × 2088 |
| 2 | Clean product studio shot... LED light bar (USB-C) | `392d00b415024e2b80d671db9908a6ff` | IMAGE | 1024 × 1024 |
| 3 | **Inicio del panel — Ganga Online** | `5483e3738b1949a3a85e23d772853fb8` | DESIGN | 2560 × 2128 |
| 4 | Minimalist modern product photography... LED night light | `6e8fc3d5bc1e4ea7a856c7db5823fa48` | IMAGE | 1024 × 1024 |
| 5 | Catálogo web — Ganga Online | `7bfbd07fc1f047cb9853ca8f3d5a4bfe` | DESIGN | 2560 × 2088 |
| 6 | Ficha web — Barra LED recargable | `4f2a579343394d369953c3190022349e` | DESIGN | 2560 × 2090 |
| 7 | Modern product studio photography... USB flexible LED strip | `c367ad0291204ad2a2fca3766ef20640` | IMAGE | 1024 × 1024 |
| 8 | Conversaciones — Ganga Online | `57c27d3d12a14d199637ff5bd18597e0` | DESIGN | 2560 × 2048 |
| 9 | Minimalist modern product photography... LED under cabinet | `ef24021ec9cb4d4f86fda94c6914f33a` | IMAGE | 1200 × 896 |
| 10 | Inventario — Ganga Online | `9480b983804d47a9bcec8f7c79b5af0d` | DESIGN | 2560 × 2106 |
| 11 | Editar landing — Barra LED recargable | `e1f3cbf73ce04cfe9db20ad656cd1fa4` | DESIGN | 2560 × 3168 |
| 12 | Editar producto — Barra LED recargable | `03eda08376f746aabb1f7f2e245f1ef0` | DESIGN | 2560 × 3168 |
| 13 | Landing web — Barra LED recargable | `7e9e9371db934b4ba3f468514a03675e` | DESIGN | 2560 × 5068 |
| 14 | Productos — Ganga Online | `927f207470fb440f99b269fd030ca478` | DESIGN | 2560 × 2048 |
| 15 | Pedido #1042 — Revisar adelanto | `45955c0b898e4ca58d85d84a1991285f` | DESIGN | 2560 × 2148 |
| 16 | Nuevo pedido manual — Ganga Online | `f81c96c596084c52b627a3e6b017c8a3` | DESIGN | 2560 × 2048 |
| 17 | **Iniciar sesión — Panel de ventas** | `47969c62b0b846f896c019fd3337c4ab` | DESIGN | 2560 × 2212 |
| 18 | Minimalist modern product photography... LED desk lamp | `88ef7a3dfcb8426abed512de2b81951b` | IMAGE | 1024 × 1024 |
| 19 | Editor visual de flujos — Barra LED recargable | `ea3b60ae3862415ca13bffd4b4a355a4` | DESIGN | 2560 × 2048 |

### Vistas clave (foco de la fase 1)

| Vista | ID | Resource name completo |
|---|---|---|
| Login de la plataforma | `47969c62b0b846f896c019fd3337c4ab` | `projects/1619124812250481064/screens/47969c62b0b846f896c019fd3337c4ab` |
| Dashboard de Ganga Online | `5483e3738b1949a3a85e23d772853fb8` | `projects/1619124812250481064/screens/5483e3738b1949a3a85e23d772853fb8` |

---

## 4. Confirmación de acceso a los diseños

**Acceso verificado correctamente** para todas las operaciones de lectura:

| Operación | Resultado |
|---|---|
| `list_projects` | ✅ 5 proyectos |
| `get_project` | ✅ Metadatos, tema y `designMd` completo (9,132 chars) |
| `list_screens` | ✅ 19 pantallas |
| `get_screen` (login y dashboard) | ✅ Título, tipo, `htmlCode.name`, `screenshot.name` |
| `list_design_systems` | ✅ 1 sistema de diseño |
| `download_file` (HTML y screenshot) | ✅ Contenido real descargado |

### Evidencia concreta

**Login** (`47969c62...`):
- HTML: `projects/1619124812250481064/files/17694102883767334487` — `text/html`, **15,521 caracteres**.
- Screenshot: `projects/1619124812250481064/files/8603842698865311061` — imagen base64 de 97,444 chars.
- `meta name="shell-type" content="web_blank"`, `lang="es"`.
- Textos extraídos: *"Panel de ventas"*, *"Acceso Operativo"*, *"Inicia sesión"*, *"Accede al panel de tu negocio"*, *"Correo electrónico"*, *"Contraseña"*, *"Ingresar"*, *"Si tienes acceso a más de un negocio, podrás elegirlo después de ingresar"*, *"Tus ventas por WhatsApp, en un solo panel"*, ejemplo de pedido `#PV-4892`, *"Modalidad: Contraentrega"*, *"Stock reservado (-2 un.)"*.

**Dashboard** (`5483e373...`):
- HTML: `projects/1619124812250481064/files/10068648890626801204` — `text/html`, **31,943 caracteres**.
- Screenshot: `projects/1619124812250481064/files/13951688657512684572` — imagen base64 de 157,964 chars.
- `meta name="shell-type" content="web_dashboard"`, `lang="es"`.
- Textos extraídos: *"Ganga Online"*, *"Sucursal Central"*, menú *Inicio / Productos / Tienda y landings / Conversaciones / Pedidos / Inventario / Configuración*, *"WhatsApp Sincronizado"*, *"Carlos Vendedor · Online"*, *"Actualizado hace 2m"*, *"Resumen de hoy"*, *"Lima, PE · Miércoles, 23 de octubre"*, *"Requiere atención · 3 pendientes"*, *"Nuevo pedido manual"*, alertas de chat, comprobante de adelanto del pedido `#1042` por `S/ 40.00` de `S/ 89.90`, pedido `#1041` listo para preparar vía Olva Courier.

> Nota: las URLs `downloadUrl` de los archivos requieren credenciales y devuelven un wrapper JSON; **siempre usar `download_file` con el `name` del archivo**, nunca hacer fetch directo.

---

## 5. Sistema visual identificado

Existe **un sistema de diseño compartido** en el proyecto seleccionado:

| Campo | Valor |
|---|---|
| Nombre | **`Lumina Flow Canvas`** |
| Resource | `assets/5a0b4aecaaaa4dba87d7ad533bf40ffc` |
| Versión | `1` |
| Modo de color | `LIGHT` |
| Variante | `FIDELITY` |
| Roundness | `ROUND_EIGHT` (8 px) |
| Spacing scale | `2` |
| Color semilla / primary override | `#4f46e5` |
| Overrides | secondary `#10b981`, tertiary `#8b5cf6`, neutral `#0f172a` |

### Colores (tokens `namedColors`)

| Token | Valor | Token | Valor |
|---|---|---|---|
| `primary` | `#3525cd` | `background` | `#faf8ff` |
| `primary-container` | `#4f46e5` | `surface` | `#faf8ff` |
| `on-primary` | `#ffffff` | `surface-container-lowest` | `#ffffff` |
| `inverse-primary` | `#c3c0ff` | `surface-container` | `#eaedff` |
| `secondary` | `#006c49` | `surface-variant` | `#dae2fd` |
| `secondary-container` | `#6cf8bb` | `on-surface` | `#131b2e` |
| `tertiary` | `#571ac0` | `on-surface-variant` | `#464555` |
| `tertiary-container` | `#6f3dd9` | `outline` | `#777587` |
| `error` | `#ba1a1a` | `outline-variant` | `#c7c4d8` |
| `error-container` | `#ffdad6` | `surface-tint` | `#4d44e3` |

### Paleta de marca del `designMd` (segunda fuente, ojo con la discrepancia)

- Lienzo base `#F8FAFC`, matriz de puntos `#CBD5E1` (paso 16 px).
- Superficies `#FFFFFF`, bordes `#E2E8F0`.
- Texto primario `#0F172A`, secundario `#64748B`, atenuado `#94A3B8`.
- Interactivo primario **Indigo `#4F46E5`**, hover `#4338CA`, tint activo `#EEF2FF`.
- Semántica de nodos: Start `#10B981`, Action `#4F46E5`, Decision `#F59E0B`, Checkout `#8B5CF6`, Resolution `#64748B`.

### Tipografía

| Rol | Familia | Escala |
|---|---|---|
| Headline / Body / Label | **Inter** | `headline-lg` 1.5rem/600, `headline-md` 1.25rem/600, `headline-sm` 1rem/600, `body-lg` 0.9375rem/400, `body-md` 0.875rem/400, `body-sm` 0.8125rem/400, `label-md` 0.75rem/600, `label-sm` 0.6875rem/500 |
| Código | **JetBrains Mono** | `code-sm` 0.75rem/400 |

- Uso obligatorio de `font-variant-numeric: tabular-nums` para SKUs, montos y telemetría.
- Las fuentes se cargan vía Google Fonts: `Inter:wght@400;500;600;700` y `JetBrains+Mono:wght@400;500`.

### Radios, espaciado y elevación

- Radios: `sm` 0.25rem, `DEFAULT` 0.5rem, `md` 0.75rem, `lg` 1rem, `xl` 1.5rem, `full` 9999px.
- Spacing: `space-xs` 0.25rem, `space-sm` 0.5rem, `space-md` 0.75rem, `space-lg` 1rem, `space-xl` 1.5rem; `gutter/margin` 1rem (desktop 1.5rem).
- Elevación definida en 4 niveles: 0 lienzo plano, 1 tarjetas con borde `#E2E8F0` + sombra `0 1px 3px rgba(15,23,42,.04)`, 2 estados activos/modales, 3 toolbars flotantes con `backdrop-filter: blur(8px)`. Se prohíben sombras pesadas y skeuomorfismo.

### Componentes documentados en el sistema

`Flow Nodes` (tarjetas de 280 px con acento superior por tipo), `Buttons` (primary/secondary/outline/destructive, alturas 36/32 px), `Inputs & Inspector Controls` (34 px, foco con ring indigo), `Status Chips & Badges` (20 px, pill), `Canvas Navigation Cluster`. Además, en las pantallas de Ganga Online aparecen: sidebar de navegación, topbar con búsqueda/notificaciones/ayuda, selector de tienda/sucursal, tarjetas de métricas, listas de alertas y estados (chips ámbar/esmeralda/índigo).

### Implementación técnica de las pantallas (útil para migración)

- HTML con **Tailwind CSS vía CDN** (`https://cdn.tailwindcss.com`) y un bloque `<script id="tailwind-config">` que inyecta los `namedColors` como colores personalizados de Tailwind. Mismo patrón en login y dashboard.
- Iconos: **Material Symbols Outlined** cargados desde Google Fonts (`material_symbols` usados como `span` con ligaduras, p. ej. `store`, `inventory_2`, `chat`, `receipt_long`).
- `darkMode: "class"` configurado, aunque el proyecto es `LIGHT`.
- `meta[name="shell-type"]`: `web_blank` (login) y `web_dashboard` (dashboard) → pista de los layouts a crear.

---

## 6. Posibles problemas o limitaciones de integración

1. **Autenticación MCP rota en el harness (bloqueante para automatización).** Las herramientas de OpenCode devuelven 401 aunque la API key existe. Hubo que usar JSON-RPC directo. Debe corregirse el transporte o la propagación del header `X-Goog-Api-Key`.
2. **Nombre de proyecto engañoso.** `Editor Visual de Flujos` no describe el contenido real (panel multi-negocio Ganga Online). No buscar el proyecto por título en el futuro.
3. **Sistema de diseño no alineado con las pantallas.** `Lumina Flow Canvas` describe un editor de flujos (canvas de nodos, inspector lateral de 340 px), mientras que las pantallas son un back-office de tienda. Además coexisten **dos paletas**: la de tokens (`#3525cd`, `#faf8ff`, `#006c49`) y la del `designMd` (`#4F46E5`, `#F8FAFC`, `#0F172A`). El campo `components` del tema está vacío (los componentes solo están en prosa dentro de `styleGuidelines`). **Hay que elegir una paleta canónica antes de crear tokens en Tailwind.**
4. **Dos dashboards "Ganga Online" con sistemas visuales distintos.** El proyecto `6898429945450228748` tiene `Panel Privado — Ganga Online` con `Ganga Editorial OS` (teal `#0f4c5c`, Newsreader + Plus Jakarta Sans, RUC, "Modo Producción"). Riesgo de mezclar estilos. Decidir fuente de verdad.
5. **Resolución exportada al doble.** Las imágenes/pantallas son 2560 px de ancho, pero los `screenInstances` indican tamaño lógico de **1280 × 1106** (login) y **1208 × 1037** (dashboard). Trabajar con el tamaño lógico; el 2560 es escala 2x de exportación.
6. **Tailwind por CDN no es apto para producción.** Es código de maqueta: hay que reemplazarlo por Tailwind compilado (PostCSS) y mover los colores custom al config real. Los `span` con Material Symbols requieren la fuente; considerar paquete local o `lucide-react`/`material-symbols`.
7. **Datos de ejemplo estáticos.** Montos en `S/` (PEN), fecha "Miércoles, 23 de octubre", pedidos `#1042`/`#PV-4892`, teléfonos peruanos. No hay contratos de API, estados de carga, errores ni validaciones en los diseños. Habrá que definirlos en la arquitectura.
8. **Evidencia de multi-tenant solo a nivel UI.** No hay un `designMd` que especifique modelo de tenants, roles o permisos. Solo se infiere del texto del login ("más de un negocio") y del selector `Ganga Online / Sucursal Central`. Requiere definición funcional antes de modelar datos.
9. **Pantallas muy largas.** Algunas (landing 5068 px, editores 3168 px) son capturas de página completa; no representan un viewport real. Segmentar en componentes/secciones.
10. **Proyecto vacío** `17744271390739862945` (0 pantallas) — ignorar.

---

## 7. Recomendaciones para la implementación en Next.js + TypeScript + Tailwind

1. **No pegar el HTML de Stitch directamente en componentes.** Usarlo como referencia visual y extraer solo estructura, textos y tokens. El HTML usa CDN y clases utilitarias generadas para maqueta.
2. **Fijar primero la fuente de verdad visual.** Elegir entre `Lumina Flow Canvas` y `Ganga Editorial OS`, y unificar la paleta duplicada. Recomendación: usar los `namedColors` del sistema de diseño como base canónica y documentar las decisiones en un `DESIGN.md` propio.
3. **Crear los design tokens en Tailwind/CSS variables** desde el manifest: colores `primary`, `primary-container`, `surface*`, `on-*`, `outline*`, `error*`; escala tipográfica Inter/JetBrains Mono; radios 8 px; spacing 4/8/12/16/24 px. Configurar `darkMode: 'class'` solo si se implementará modo oscuro (el proyecto es LIGHT).
4. **Usar `next/font`** para Inter y JetBrains Mono (evita dependencia de Google Fonts en runtime) e iconos locales (`lucide-react` o paquete de Material Symbols) en vez de `<link>` a fonts.googleapis.com.
5. **Estructura sugerida (solo propuesta, aún no ejecutar):**
   - `app/(auth)/login/page.tsx` → basada en `47969c62...`
   - `app/(app)/dashboard/page.tsx` → basada en `5483e373...`
   - `app/(app)/productos`, `/tienda`, `/conversaciones`, `/pedidos`, `/inventario`, `/configuracion`
   - `components/ui/` → `Button`, `Input`, `Badge/StatusChip`, `Card`, `Sidebar`, `Topbar`, `StoreSwitcher`, `DataTable`, `AlertItem`
   - `lib/design-tokens.ts` o `tailwind.config.ts` como única fuente de tokens.
6. **Normalizar el canvas a 1280 px lógicos** y diseñar responsive real (sidebar colapsable < 1024 px, según el propio `styleGuidelines`), en lugar de replicar el export de 2560 px.
7. **Guardar copias locales de referencia** de los HTML/screenshots obtenidos con `download_file` en una carpeta de documentación (por ejemplo `docs/design-reference/`), nunca como código fuente. Mantener el mapeo ID de pantalla ↔ ruta de la app.
8. **Extraer los textos de ejemplo a fixtures** (`tenant: Ganga Online`, `sucursal: Central`, pedidos, montos PEN) para no hardcodear datos en JSX y facilitar pruebas.
9. **Resolver la autenticación del MCP** antes de cualquier fase automatizada: verificar por qué el header `X-Goog-Api-Key` no llega al endpoint remoto (config `oauth: false`, sustitución `{env:...}`, o versión del cliente MCP). Idealmente añadir una prueba de humo `list_projects` al inicio de cada fase.
10. **Validar con ChatGPT (supervisor de arquitectura)** estos tres puntos antes de escribir código: (a) paleta canónica, (b) modelo multi-tenant y selector de negocio/sucursal, (c) alcance real de la fase 1 (solo login + dashboard o las 14 pantallas DESIGN).

---

### Anexo: cómo se obtuvo la información (para reproducir)

Endpoint: `POST https://stitch.googleapis.com/mcp`  
Header: `X-Goog-Api-Key: <STITCH_API_KEY>`  
Body JSON-RPC:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": { "name": "list_projects", "arguments": { "pageSize": 100 } }
}
```

Métodos usados: `list_projects`, `get_project`, `list_screens`, `get_screen`, `list_design_systems`, `download_file`.  
Los resultados crudos quedaron en `%TEMP%\opencode\` (`projects.json`, `screens_*.json`, `proj_*.json`, `ds_*.json`, `screen_login.json`, `screen_dashboard.json`, `login_html.html`, `dashboard_html.html`).
