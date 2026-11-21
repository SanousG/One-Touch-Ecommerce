# Motor de flujos de venta (contrato y semántica)

Este documento separa claramente el **editor** implementado en Fase 3B del **motor de ejecución real** que se construirá en una fase posterior. Hoy no se envían mensajes reales, no hay webhooks, pedidos ni reservas.

## Tipos de bloques

| Tipo | Entrada | Salidas | Configuración |
|---|---|---|---|
| `START` | No | 1 | Etiqueta. Contexto del producto precargado por el piloto |
| `MESSAGE` | 1 | 1 |plantillas ordenadas |
| `DECISION` | 1 | Una por opción + `fallback` | Pregunta, opciones (id estable + etiqueta), fallback |
| `GLOBAL_FLOW` | 1 | 1 | Referencia a flujo global publicado del mismo tenant |
| `CHECKOUT` | 1 | 1 | Una plantilla de tipo Checkout y campos previstos |
| `END` | 1 | 0 | Modo: `FINISH`, `HANDOFF`, `FINISH_AFTER_CONFIRMATION`; plantilla final opcional |

## Estructura persistida

`SalesFlowVersion` guarda `nodes`, `edges`, `templates` y `globalFlows` como JSON **validado** por `normalizeDiagram()` y `validateForPublish()`. No se acepta HTML, JS, CSS ni URLs arbitrarias. Límites: 60 nodos, 120 conexiones, 6 plantillas por bloque, 6 opciones por decisión.

Un nodo: `{ id, type, position:{x,y}, config:{...} }`.
Una conexión: `{ id, source, target, sourceHandle?, label? }`. Los `sourceHandle` de una decisión son los IDs de opción y `fallback`.

## Plantillas

`MessageTemplate` pertenece al tenant, tiene tipo `MESSAGE` o `CHECKOUT`, contenido de texto plano, imagen opcional de los recursos autorizados del negocio y estado activo/inactivo. El contenido puede incluir variables dinámicas en el futuro (`{{producto}}`, `{{precio}}`, `{{negocio}}`), hoy no se interpolan.

Al guardar/publicar un flujo se copia el contenido de cada plantilla usada dentro del snapshot `templates`. Editar una plantilla después **no** cambia un flujo publicado.

## Decisiones

Cada opción tiene un identificador inmutable y una salida visual independiente. No pueden repetirse IDs dentro de una decisión. La salida `fallback` representa la respuesta no reconocida; es obligatoria para publicar y será la ruta que el futuro clasificador use cuando no entienda la intención. No hay clasificación IA en esta fase.

## Flujos globales

Un `SalesFlow` con `scope=GLOBAL` pertenece al tenant y puede referenciarse desde varios flujos de producto. Reglas:

- Solo flujos globales publicados son utilizables.
- Al guardar/publicar, se fija `versionId`, `version` y una copia del diagrama del flujo global en `globalFlows` del snapshot. Cambios posteriores en el global no afectan al flujo publicado.
- Retorno: la arista de salida del nodo `GLOBAL_FLOW` indica el destino al que vuelve el flujo cuando el global llega a un `END`. El simulador implementa este retorno con una pila.
- Se prohíben referencias circulares entre flujos globales (incluida autorreferencia). La validación recorre el grafo de referencias antes de publicar.
- Límite de profundidad del simulador: 3 niveles de globales y 30 pasos totales.

## Checkout

Checkout selecciona una plantilla de tipo `CHECKOUT` y muestra los campos previstos: producto, variante, cantidad, nombre, teléfono, entrega, modalidad, pago, adelanto y confirmación explícita. **Mostrar la plantilla no confirma una venta**, no crea pedidos, no reserva stock y no registra pagos. La ejecución real se implementará con el motor de conversación.

## Cierre

`FINISH` termina la rama. `HANDOFF` representa derivación futura a un asesor (solo configuración; no transfiere WhatsApp). `FINISH_AFTER_CONFIRMATION` exige, en el futuro motor, una confirmación válida antes de finalizar. Ningún modo registra ventas automáticamente.

## Validación previa a publicar

1. Exactamente un `START`, sin entrantes y con salida.
2. Ninguna conexión a nodos eliminados.
3. Todas las opciones de decisión y `fallback` con destino.
4. Bloques `MESSAGE` con plantillas válidas del snapshot.
5. `CHECKOUT` con una plantilla de tipo Checkout.
6. Flujos globales referenciados existentes, del tenant y publicados.
7. Sin referencias entre tenants (todo se resuelve con `tenantId`).
8. Sin ciclos entre flujos globales.
9. Al menos un `END` alcanzable desde `START`.
10. Sin nodos inalcanzables.
11. Los ciclos de ejecución solo se permiten si contienen una decisión cuya salida `fallback` sale del ciclo o llega a un `END`.

Los borradores incompletos se guardan; la publicación devuelve 422 con la lista de incidencias y el nodo implicado.

## Simulador

El botón **Probar flujo** abre una simulación local en el inspector. Recorre el borrador desde `START`, muestra plantillas, permite elegir ramas de decisión, ejecuta la representación de flujos globales con retorno, muestra Checkout y Cierre, y permite reiniciar. Está limitado a 30 pasos y 3 niveles de globales. No llama a APIs de WhatsApp, no crea pedidos ni conversaciones y marca visualmente que es una simulación.

## Contrato previsto para el chatbot (futuro)

Al iniciar una conversación se resolverán: `tenantId`, `productId`, `variantId` (cuando corresponda), `flowId`, `publishedVersionId`, y el origen (`landing`, `ficha`, `carrito` o mensaje de WhatsApp). La conversación deberá fijar `publishedVersionId` para continuar con la misma versión aunque se publique otra. Este contrato existe como función de servicio (`getPublishedFlowForProduct`) pero no hay conversaciones ni sesiones ficticias en esta fase.
