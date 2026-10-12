# Menú JD — contexto del proyecto

PWA de nutrición con **varios perfiles** (actualmente Juan David y Cristina): menú o plan por perfil + registro diario de comidas, cada uno con su propio registro.
Debe funcionar en Android e iOS, instalable desde el navegador y sin conexión.
Idioma de la interfaz y del código de cara al usuario: español de España.

## Arquitectura multi-perfil
- Todo vive en `data.js` bajo `const PROFILES = { jd: {...}, cristina: {...} }`. Cada perfil tiene: `id`, `label`, `proteinTarget`, `gymDays`, `dayTypes`, `slots`, `menu`, `recipes`, `notes`, `weight` (kg de referencia), y opcionalmente `weightGoal`, `defaultType(date)`, `builder`, `calendar`. Cada tipo de día puede llevar `steps` (pasos que ya incluye su objetivo de kcal).
- Selector de perfil fijo arriba de la app (`#profileSelect`, fuera de las vistas). Al cambiar de perfil se recarga el registro, el menú y las recetas; cada perfil usa su propio `localStorage["menujd.log.<id>.v1"]`, así que nunca se mezclan datos entre perfiles.
- `builder` (opcional): `{ main: ["D","C","N"], snackSlot: "S" }`. Solo lo define JD — habilita la sección "Monta tu día" en Menú; si un perfil no lo define, esa sección se oculta.
- `calendar` (opcional): `{ enabled: true }`. Solo lo define JD — habilita el botón 📅 de Google Calendar en Hoy; si un perfil no lo define, el botón y la sección de ajustes de calendario en Recetas se ocultan.
- `defaultType(date)` (opcional): tipo de día propuesto para una fecha sin registro aún. Si no se define, se usa `dayTypes[0].id`.
- Enlace `?perfil=<id>` (o el nombre, p. ej. `?perfil=cristina`): fija ese perfil como activo al abrir y limpia la URL; sirve para instalar la app en el móvil de otra persona ya en su perfil.
- La importación de copias va siempre al perfil del archivo (`profile` en v2, o el id del nombre `menujd-registro-<id>-…json` en v1), cambiando de perfil si hace falta; si el archivo no lo indica, va al perfil activo y se avisa.
- Los datos no se comparten entre móviles: cada dispositivo tiene su propio localStorage (se pasan con exportar/importar).
- Nuevo perfil = añadir una entrada a `PROFILES` con esa forma; no hace falta tocar `app.js`.

## Perfil "jd" — Juan David
- Perder grasa manteniendo o ganando músculo. 180 cm, ~87 kg. Objetivo 80 kg y luego ~75–76 kg.
- Proteína objetivo: 160 g/día todos los días.
- Prefiere quedarse en déficit aunque la proteína quede algo corta.
- Calorías por tipo de día:

| Tipo de día      | id            | kcal  | snacks |
|------------------|---------------|-------|--------|
| Trabajo + gym    | trabajo-gym   | 2500  | 3      |
| Trabajo sin gym  | trabajo       | 2325  | 2      |
| Libre + gym      | libre-gym     | 2400  | 2–3    |
| Libre sin gym    | libre         | 2300  | 2      |

- Va al gym lunes, martes, jueves y viernes (`profile.gymDays = [1,2,4,5]`, 0 = domingo). Sus semanas van de domingo a sábado.
- Trabaja 5 días con turnos variables (no hay horario fijo); por eso el tipo de día se elige a mano y por defecto se propone según si es día de gym.
- Días de trabajo ≈ 15.000 pasos.

## Sistema de menú intercambiable (regla clave)
Cualquier combinación desayuno + comida + cena debe dar lo mismo:
- Desayuno (D): ~500 kcal y ~40 g proteína
- Comida (C): ~750 kcal y ~55 g proteína
- Cena (N): ~750 kcal y ~55 g proteína
- Base del día: ~2.000 kcal / ~150 g proteína
- Snack (S): ~155 kcal y 13–21 g proteína. Se suman 2 o 3 según el tipo de día.
- Tolerancia de cada plato respecto a su franja: ±15 kcal y ±3 g de proteína.
  Al añadir o modificar platos, recalcular cantidades para cumplirla (ajustar gramos, no inventar macros).
- Pesos de pasta, arroz, pollo y merluza siempre en COCINADO.
- Verduras libres (lechuga, pepino, tomate fresco, pimiento, calabacín, champiñón, cebolla, rúcula) no se cuentan.
- El aceite cuenta siempre que se usa para cocinar (5 g = 1 cucharadita).

## Preferencias de comida
- Leche semidesnatada (no entera). Toma café americano con un chorrito (~30 ml ≈ 15 kcal).
- Huevos siempre talla L (~60 g sin cáscara, 86 kcal, 7,5 g P).
- Proteína en polvo: Myprotein Impact Whey, sabor vanilla (377 kcal, 72 P, 9,1 C, 5,8 G /100 g).
- Compra en Mercadona (marca Hacendado). Buscar valores reales de etiqueta antes de estimar.
- Cuando registra comidas quiere kcal, proteína, carbohidratos, grasa y coste por comida.

## Base de datos de ingredientes (por 100 g; kcal, P, C, G)
```
avena molida            372  13.5  58.7  7.0
leche semi               46   3.1   4.7  1.6
arándanos congelados     57   0.7  14.5  0.3
queso batido 0%          46   8.0   3.6  0.2
queso Burgos 0%          67  12.0   4.0  0.2
cottage Hacendado        99  14.0   1.7  4.0
huevo L (sin cáscara)   143  12.5   0.7  9.5
jamón cocido            110  18.0   1.5  3.5
pechuga de pavo 92%      95  19.5   1.5  1.2
panecillo (45 g/ud)     243   8.2  53.0  1.1
maxi tortilla (60 g/ud) 294   8.0  49.0  6.5
pan mini bocados (20 g) 269   9.0  48.0  4.0   # paquete 8 uds 160–165 g
miel                    304   0.3  82.0  0.0
mozzarella+gouda rall.  326  22.0   3.3 25.0
mozzarella rallada      300  22.0   1.5 23.0
gouda lonchas (20 g)    345  23.4   0.0 27.9
pollo pechuga cocida    165  31.0   0.0  3.6
contramuslo cocido      180  25.0   0.0  9.0
burger de pollo (90 g)  148  16.0   4.3  7.5
carne picada de pollo   144  17.0   3.0  7.0
merluza                  72  16.0   0.0  0.9
atún claro natural      100  23.0   0.0  1.0   # lata escurrida ≈ 56 g
arroz cocido            130   2.7  28.5  0.3
pasta cocida            150   5.3  30.0  0.9
gnocchi                 174   4.5  37.6  0.4
patata                   77   2.0  17.0  0.1
tomate triturado         26   0.8   5.1  0.1
aceite de oliva         900   0.0   0.0 100
base pizza extrafina    283   6.5  57.4  4.4   # 140 g/ud
postre +Proteínas        54   8.3   5.4  0.2   # 120 g/ud
griego ligero            60   5.8   4.7  2.0
Clear Whey              352  80.0   6.0  0.0
anacardos               580  18.0  30.0 46.0
ketchup sin azúc. añad.  83   1.7  17.8  0.0
mayonesa ligera         261   0.5   5.0 27.0
pan brioche Hacendado   340  11.0  46.0 12.0   # 75 g/ud (ya no se usa)
muffin casero (1 ud)    111   9.5   9.4  3.8   # por unidad, ver receta
tarta de queso (1/6)    166  14.9   5.3  8.1   # por porción
```

## Recetas de lote
- Muffins (18 uds): 400 g cottage, 6 huevos L, 184 g harina de avena, 60 g Impact Whey vainilla, 45 g eritritol, 16 g levadura química, 300 g arándanos. Horno 180 °C, 18–22 min. 111 kcal / 9,5 g P por muffin.
- Tarta de queso La Viña (6 raciones): 230 g queso crema light, 200 g cottage batido, 4 huevos L, 150 g yogur griego, 35–40 g eritritol, 1 g sal, 8 g maicena. Air fryer 155–160 °C 32–38 min (aluminio desde el min 20) u horno 180 °C 40–45 min; nevera ≥6 h. ~993 kcal / 89 g P entera; 166 kcal / 14,9 g P por porción.

## Perfil "cristina" — Cristina
- 27 años, 170 cm, 75 kg. Entrena fuerza. Gastritis erosiva en proceso de recuperación (ver plan de su dietista).
- Plan de **Lorena González** (dietista-nutricionista), centrado en tolerancia digestiva y recuperación, no en un déficit calculado. 5 comidas/día: Desayuno, Media mañana, Comida, Merienda, Cena — son las franjas (`slots`) de su perfil, con ids `D, M, C, Me, N`.
- El menú de este perfil son los 70 platos reales de su plan (14 días × 5 comidas, semana 1 y semana 2, repetible), no un sistema de intercambio por macros como el de JD. Cada plato lleva en el nombre la etiqueta "S1/S2 · día" para trazabilidad con el documento original.
- Las kcal/P/C/G de cada plato son **estimaciones propias** (no de la dietista) calculadas a partir de las cantidades exactas de su plan y una base de ingredientes genérica/típica — no son etiquetas reales de Mercadona como en el perfil de JD. Si se ajustan con valores reales, recalcular el plato entero.
- `dayTypes` tiene un único tipo ("estandar", 1580 kcal) = la media real de los 70 platos (~1581 kcal / ~111 g P), usado como objetivo orientativo porque el plan no fija un número cerrado. No tiene `builder` (sus comidas son fijas por día, no pensadas para recombinarse libremente) ni `calendar` (no hay variación de tipo de día).
- Documento fuente: `Plan nutricional Cristina.pdf` (en la raíz del proyecto, no se sube a `data.js`, solo sirvió de referencia para construir el menú).
- Notas del plan (alimentos recomendados/a limitar, pautas de ritmo de comida, hidratación, entrenamiento, creatina) están en `PROFILES.cristina.notes`.

## Stack y arquitectura
- HTML + CSS + JavaScript vanilla, sin build ni dependencias. Mantenerlo así salvo que el usuario pida migrar (su stack habitual: React, Java 17/Spring Boot, PostgreSQL, Docker).
- Sin fuentes ni recursos externos (todo debe funcionar offline), **excepto** la integración opcional con Google Calendar (ver abajo, solo perfil JD): esa sí carga un script externo, pero solo bajo demanda al pulsar el botón correspondiente, nunca en el arranque.
- Archivos:
  - `index.html`: selector de perfil (`#profileSelect`) fuera de las vistas, cuatro vistas (`#view-hoy`, `#view-menu`, `#view-semana`, `#view-recetas`), tab bar inferior de 4 pestañas, hoja modal para añadir, toast.
  - `styles.css`: tokens en `:root`, modo oscuro con `prefers-color-scheme`, safe areas (`env(safe-area-inset-*)`), regla `[hidden]{display:none!important}` (necesaria: `.sheet` usa display:grid, `.builder`/`.profile-bar` dependen de ella para ocultarse).
  - `data.js`: `const PROFILES = { jd, cristina }` — ver "Arquitectura multi-perfil" arriba. Cada plato: `{id, n, i:[ingredientes], k, p, c, f, t?}`.
  - `app.js`: `profile` = perfil activo (variable reasignada por `switchProfile()`); render de vistas, registro, calculadora, export/import JSON, registro del service worker, integración con Google Calendar. No quedan constantes globales tipo `MENU`/`DAY_TYPES`: todo cuelga de `profile.*`.
  - `sw.js`: caché `menujd-vN`, estrategia red primero con fallback a caché para peticiones del propio origen. Subir N en cada despliegue, y también `APP_VERSION` en `app.js` (se muestra en Recetas para comprobar qué versión tiene cargada el móvil). Las peticiones a otros orígenes (Google) se dejan pasar sin interceptar ni cachear.
  - `manifest.webmanifest` + `icons/` (192, 512, maskable 512, apple-touch-icon 180).
- Persistencia, con clave por perfil: `localStorage["menujd.log.<profileId>.v1"]` =
  `{ "YYYY-MM-DD": { type: "trabajo-gym", steps?: 12000, items: [{ slot:"D|C|N|S", ref?:"D4", m?: 1.5, n, k, p, c, f }] } }`.
  Perfil activo en `localStorage["menujd.profile.v1"]`. El registro antiguo de antes de los perfiles (`menujd.log.v1`) se migra automáticamente a `menujd.log.jd.v1` la primera vez que carga `app.js`.

## Integración opcional con Google Calendar
- Solo disponible en perfiles con `calendar: { enabled: true }` en `data.js` (hoy, solo JD). El botón y la sección de ajustes se ocultan en perfiles sin esta clave.
- Botón 📅 junto al selector de tipo de día (vista Hoy): consulta el calendario principal ("primary") de Google del día mostrado y propone "trabajo" si algún evento de ese día contiene la palabra clave configurada (por defecto "turno"); si no, propone "libre". El gimnasio sigue decidiéndose por `profile.gymDays`, no por el calendario.
- No hay sincronización automática en segundo plano: el usuario pulsa el botón cuando quiere detectar/actualizar.
- Client ID por defecto en `PROFILES.jd.calendar.clientId` (no es secreto; el secreto del cliente nunca se usa ni se sube). Si el usuario guarda otro en ajustes, manda el guardado. Orígenes autorizados en Google Cloud: `https://juaandix.github.io` y `http://localhost:8080`.
- Ajustes en Recetas → "Calendario de turnos": Client ID de OAuth (lo crea el usuario en Google Cloud Console, tipo "Aplicación web", scope `calendar.readonly`, orígenes de JavaScript autorizados = origen exacto donde se sirve la app) y la palabra clave.
- Almacenamiento, con clave por perfil: `localStorage["menujd.gcal.cfg.<profileId>.v1"]` = `{ clientId, keyword }`; `sessionStorage["menujd.gcal.tok.<profileId>.v1"]` = `{ token, exp }` (token de acceso de corta duración, se pierde al cerrar la pestaña).
- El script `accounts.google.com/gsi/client` se inyecta dinámicamente solo al usar la función; si no hay conexión o no está configurado el Client ID, falla con un toast y el usuario sigue pudiendo elegir el tipo de día a mano como siempre.

## Integración opcional con Google Health (Fitbit)
- Solo en perfiles con `health: { enabled: true }` (hoy, solo JD, que usa un Fitbit Air). Botones "⟳ Fitbit" en Hoy (día abierto) y "⟳ Traer pasos y peso de Fitbit" en Semana (los 7 días, nunca días futuros).
- API: Google Health API v4 (la Fitbit Web API antigua se apaga el 30/10/2026). Mismo Client ID y mismo script GIS que el calendario, pero token aparte en `sessionStorage["menujd.ghealth.tok.<id>.v2"]` = `{ token, exp, weight }`.
- Permisos: `googlehealth.activity_and_fitness.readonly` (pasos, obligatorio) y `googlehealth.health_metrics_and_measurements.readonly` (peso, opcional: si no se concede, se salta el peso). Son permisos restringidos: la app de Google Cloud debe seguir en modo "Prueba" con la cuenta del usuario en "Usuarios de prueba".
- `include_granted_scopes: false` en los dos token clients: si no, GIS mezcla el permiso del calendario en el token de Health y la API responde 403 `DISALLOWED_OAUTH_SCOPES`.
- Pasos: `POST https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp` con `range` civil (fecha local, intervalo cerrado-abierto) y `windowSizeDays: 1`; se lee `rollupDataPoints[].steps.countSum` (string) y `civilStartTime.date`. Se guarda en `day.steps` (sobrescribe lo escrito a mano).
- Peso: `GET .../weight/dataPoints?filter=weight.sample_time.physical_time >= "…Z" AND … < "…Z"`; `dataPoints[].weight.weightGrams` y `sampleTime.{physicalTime, utcOffset}`; se guarda el último de cada día local en `menujd.weight.<id>.v1`.
- Actualización automática (`autoHealth()`): al arrancar, al volver la app a primer plano (`visibilitychange`) y al recuperar conexión, si la última sincronización (`localStorage["menujd.ghealth.last.<id>.v1"]`) tiene más de 3 h o es de otro día, trae los últimos 3 días **solo si el token de la sesión sigue vivo**; sin token no se puede pedir otro sin pulsación (GIS abre ventana emergente), así que el botón ⟳ Fitbit se resalta y Hoy muestra "última actualización…". Sin servidor no hay sincronización en segundo plano (iOS no lo permite a una PWA).
- El botón de Hoy sincroniza el día abierto y los dos anteriores.
- Confirmado funcionando con la cuenta real de JD desde el iPhone (12/10/2026).

## Requisitos de plataforma
- iOS: Safari 16.4+, metas `apple-mobile-web-app-*` y `apple-touch-icon`. Nada de APIs no soportadas en iOS (Web Bluetooth, Background Sync…).
- Android: Chrome, instalable vía manifest + service worker.
- HTTPS obligatorio (GitHub Pages: https://juaandix.github.io/menu-jd/).
- Diseño mobile-first, objetivos táctiles ≥ 44 px, sin scroll horizontal.

## Probar
```
python3 -m http.server 8080   # http://localhost:8080
```
Probar a 390×844, añadir platos, recargar y comprobar que el registro persiste y que no hay errores en consola.

## Semana, peso, pasos, compra y costes
- **Pasos** (vista Hoy, campo `steps` del día): si el tipo de día tiene `steps` (JD: los de trabajo = 15.000), el objetivo de kcal se ajusta con `(pasos − referencia) × 0,0004 × kg` (≈0,035 kcal/paso a 87 kg), redondeado a 10 y limitado a ±400. Sin `steps` en el tipo de día solo se informa. kg = último peso registrado hasta esa fecha, o `profile.weight`.
- **Vista Semana** (domingo–sábado): media de kcal/proteína vs objetivo (con ajuste por pasos), balance semanal, pasos medios, peso medio vs semana anterior, coste; una fila por día que abre ese día en Hoy.
- **Peso**: `localStorage["menujd.weight.<id>.v1"] = { "YYYY-MM-DD": 86.4 }`; gráfica SVG de los últimos 60 registros con línea de `weightGoal`.
- **Lista de la compra**: suma los ingredientes de los platos registrados en la semana (× ración). Los ingredientes son texto libre: `parseIng()` en `app.js` saca la cantidad y los asigna al catálogo `SHOP` de `data.js` (compartido entre perfiles, la primera regex que coincide gana, así que el orden importa). Pasta/arroz/pollo cocidos se pasan a seco/crudo (factores de las notas: ÷2,5, ÷2,6, ×1,3). Al añadir platos con ingredientes nuevos, comprobar que caen en la entrada correcta del catálogo. Marcas por semana en `menujd.shopcheck.<id>.v1`.
- **Precios**: los introduce el usuario (€/kg, €/l o €/ud) en Semana → Precios; `localStorage["menujd.prices.v1"]`, comunes a todos los perfiles. No hay precios por defecto (no inventarlos). Coste de plato/día/semana/lista = suma de lo que tenga precio; "≥" si falta alguno.
- Las entradas nuevas del registro guardan `m` (ración); en las antiguas se deduce de las kcal.
- "Monta tu día" añade el plan al día abierto en Hoy (no siempre a hoy), para poder planificar días futuros.
- Copia de seguridad v2: `{ app:"menujd", version:2, profile, log, weight, prices }`; la importación acepta también el formato antiguo (objeto de días).

## Ideas pendientes (no implementadas)
- Sincronización entre dispositivos con backend Spring Boot + PostgreSQL.
- Integración con Hevy (solo exporta tipo de entreno, duración y kcal estimadas).
