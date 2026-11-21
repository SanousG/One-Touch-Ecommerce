# Decisiones técnicas

| # | Decisión | Motivo |
|---|---|---|
| 1 | Rutas `/tienda/[tenantSlug]` en lugar de subdominios | Aísla por slug sin DNS ni proxy; preparado para dominios futuros mediante rewrite |
| 2 | Capa `src/lib/store/service.ts` separada del DAL administrativo | La tienda nunca depende de sesión ni de `activeTenantId` |
| 3 | Filtro `ACTIVE + storeVisible` en cada consulta pública | Evita filtrar borradores, archivados u ocultos |
| 4 | Variantes inactivas excluidas de la ficha y del carrito | No se puede comprar algo no ofrecido |
| 5 | Precio mínimo de variantes activas con etiqueta «Desde S/ …» | Precio representativo correcto sin inventar descuentos |
| 6 | Carrito en localStorage con clave por `tenantId` | Sin backend de carrito en esta fase; separación estricta entre tiendas |
| 7 | Carrito guarda solo `variantId` + cantidad | Los precios siempre se obtienen del servidor |
| 8 | Revalidación del carrito en cada carga y antes de WhatsApp | Cambios de precio/visibilidad se reflejan antes de consultar |
| 9 | `useSyncExternalStore` para el carrito | Evita estado duplicado y desincronización entre cabecera y carrito |
| 10 | WhatsApp solo Click to Chat (`wa.me`) | Sin API oficial ni chatbot en esta fase; el usuario pulsa Enviar |
| 11 | Mensajes construidos en servidor | No depender de datos manipulables del navegador |
| 12 | Teléfono por tenant, editable solo por OWNER | Configuración mínima sin RBAC avanzado |
| 13 | Sin teléfono = botones desactivados y aviso explícito | No usar números de prueba inventados |
| 14 | Imágenes públicas `no-store` | Una imagen que deja de estar autorizada deja de servirse |
| 15 | Páginas de tienda `force-dynamic` | Sin caché de HTML con datos públicos que pueden cambiar |
| 16 | Sin pruebas automatizadas | Validación manual/HTTP documentada |

## Cambios funcionales

- Se habilitó `/dashboard/configuracion` (antes deshabilitado) solo para el teléfono de WhatsApp.
- Se añadió el volumen de imágenes en fases anteriores; en 2B solo se endureció su política de caché.

## Recomendaciones

- Object storage para imágenes y CDN con invalidación por `tenantId` cuando se publique.
- Dominios personalizados mediante mapping host → slug.
- Cuando se implemente el chatbot, reutilizar SKU/cantidad de estos mensajes como contexto; no persistir conversaciones todavía.
- Inventario real para poder mostrar disponibilidad verificable en las tarjetas.
