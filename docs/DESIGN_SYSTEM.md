# Sistema visual (Stitch)

Fuentes consultadas mediante el MCP de Stitch (proyecto `projects/1619124812250481064`):

- Inicio de sesión: `screens/47969c62b0b846f896c019fd3337c4ab` — *Iniciar sesión — Panel de ventas*.
- Panel principal: `screens/5483e3738b1949a3a85e23d772853fb8` — *Inicio del panel — Ganga Online*.

No se copió el HTML generado: se reimplementaron componentes React con Tailwind CSS 4.

## Tokens base (según requisitos de la Fase 1)

| Token | Valor | Uso |
|---|---|---|
| Primary | `#4F46E5` | Botones, selección de navegación, acentos |
| Background | `#F8FAFC` | Fondo general |
| Surface | `#FFFFFF` | Tarjetas, barra lateral, cabecera |
| Text | `#0F172A` | Texto principal |
| Border | `#E2E8F0` | Bordes y separadores |
| Muted | `#64748B` | Texto secundario |
| Primary soft | `#EEF2FF` | Badges y fondos de acento |
| Tipografía | Inter | 400 / 500 / 600 / 700 |

Los tokens se declaran en `src/app/globals.css` con `@theme` de Tailwind 4 (`bg-primary`, `text-foreground`, `border-border`, etc.). Inter se carga desde Google Fonts mediante `@import` (sin fetch en tiempo de build).

## Login (diseño de referencia)

- Cabecera clara con logo de cuadrícula y texto “Panel de ventas”.
- Rejilla de 12 columnas: 5 para el formulario, 7 para el panel explicativo.
- Tarjeta izquierda: marca, título “Inicia sesión”, subtítulo, correo, contraseña con botón de visibilidad, botón “Ingresar” y nota sobre multi-negocio.
- Tarjeta derecha: badge “Ejemplo de venta”, titular “Tus ventas por WhatsApp, en un solo panel” y diagrama de tres pasos (mensaje → confirmación → pedido).
- pie con enlaces informativos.

## Panel (diseño de referencia)

- Barra lateral fija de 240 px: selector de negocio, navegación de 7 entradas, estado de WhatsApp y usuario con logout.
- Cabecera fija de 56 px: búsqueda, notificaciones, ayuda y avatar.
- Contenido: “Resumen de hoy”, sección “Requiere atención”, 3 tarjetas de métricas y tabla “Pedidos recientes”.

## Diferencias deliberadas

| Diseño Stitch | Implementación Fase 1 | Motivo |
|---|---|---|
| “Ganga Online” como negocio | Negocio activo resuelto desde la BD | Ganga Online es solo demostración, no identidad global |
| 3 pendientes, 42 conversaciones, 8 pedidos, S/ 719.20, tabla de 5 pedidos | Estados vacíos y guiones (`—`) | No inventar cifras ni datos inexistentes |
| “WhatsApp Sincronizado” en verde | “WhatsApp · próximamente” en gris | El módulo no existe todavía |
| Enlaces activos a productos, pedidos, etc. | Entradas deshabilitadas con etiqueta “Pronto” | Alcance de Fase 1 |
| Material Symbols Outlined | Iconos SVG propios (`src/components/ui/icon.tsx`) | Evitar dependencia de fuente externa en runtime |
| Paleta Stitch `#faf8ff` / `#3525cd` | Paleta base `#F8FAFC` / `#4F46E5` | Requisito explícito del usuario |
| Diagrama de pedido con importes en el login | Diagrama simplificado sin importes inventados | Coherencia con estados vacíos |

Los archivos de captura/HTML de Stitch no se guardaron en el repositorio.
