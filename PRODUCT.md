# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dos personas de la misma casa, cada una con su perfil: Juan David (quiere perder grasa sin perder músculo, con un objetivo de proteína diario) y Cristina (sigue el plan de su dietista). La usan desde el iPhone como app instalada, varias veces al día y sobre todo **cocinando o comiendo**: en casa, con luz normal, a menudo con una mano ocupada.

## Product Purpose

Registrar lo que se come en segundos y saber en todo momento cuánto queda del día (kcal y proteína), con el menú o plan de cada perfil a mano. Éxito = registrar una comida cuesta pocos toques y las cifras restantes se ven sin buscarlas.

## Positioning

No es un contador genérico con base de datos infinita: parte de **sus** platos (menú intercambiable de JD con cantidades ya calculadas, los 70 platos reales del plan de Cristina), sus productos de Mercadona, su despensa ("Me falta") y sus días (tipos de día con su objetivo, pasos de Fitbit, turnos del calendario). La app ajusta cantidades para que cuadren con la franja.

## Operating Context

- Vistas: Hoy (registro del día por franjas), Menú (platos y productos), Semana (medias, peso, compra, precios), Recetas, Ajustes.
- Añadir: hoja con buscador, platos, productos, escáner de códigos de barras (Open Food Facts), foto o captura de la tabla nutricional (OCR en el móvil), "Con lo que tengo", montar a mano.
- Integraciones opcionales (solo JD): Google Calendar (turnos), Google Health/Fitbit (pasos, peso, envío de comidas).
- Planificar días futuros, lista de la compra, costes con precios propios.

## Capabilities and Constraints

- PWA vanilla HTML/CSS/JS sin build ni dependencias, publicada en GitHub Pages; funciona sin conexión.
- iOS Safari 16.4+ y Chrome Android; objetivos táctiles ≥ 44 px, sin scroll horizontal, safe areas.
- Interfaz en español de España. Cifras con coma decimal.
- Sin recursos externos en el arranque (fuentes alojadas en el repo).
- Fotos de productos genéricas (Wikimedia, con licencia) o hechas por el usuario; nada con marcas visibles.

## Brand Commitments

- **Oscura siempre** (decisión del usuario): perderla sería un fracaso.
- Cada perfil tiene su propio tema de color, para saber de un vistazo en qué perfil estás.
- Nombre: "Menú JD".

## Evidence on Hand

Datos reales de uso en el móvil de cada perfil (no en el repo). Fotos de catálogo en `img/p/`. No hay capturas de marketing, testimonios ni métricas: no inventarlos.

## Product Principles

1. Registrar nunca cuesta más toques que hoy.
2. Lo que queda del día (kcal, proteína) siempre a la vista, sin buscarlo.
3. Las cifras son la información principal; todo lo demás las acompaña.
4. Cada perfil se reconoce al instante y nunca mezcla datos.
5. Funciona igual sin conexión.

## Accessibility & Inclusion

Contraste AA en todo el texto (también el secundario), objetivos táctiles ≥ 44 px, uso con una mano.
