# Menú JD — contexto del proyecto

PWA de nutrición con **varios perfiles** (actualmente Juan David y Cristina): menú o plan por perfil + registro diario de comidas, cada uno con su propio registro.
Debe funcionar en Android e iOS, instalable desde el navegador y sin conexión.
Idioma de la interfaz y del código de cara al usuario: español de España.

## Arquitectura multi-perfil
- Todo vive en `data.js` bajo `const PROFILES = { jd: {...}, cristina: {...} }`. Cada perfil tiene: `id`, `label`, `proteinTarget`, `gymDays`, `dayTypes`, `slots`, `menu`, `recipes`, `notes`, `weight` (kg de referencia), y opcionalmente `weightGoal`, `defaultType(date)`, `builder`, `calendar`. Cada tipo de día puede llevar `steps` (pasos que ya incluye su objetivo de kcal).
- Selector de perfil fijo arriba de la app (`#profileSelect`, fuera de las vistas). Al cambiar de perfil se recarga el registro, el menú y las recetas; cada perfil usa su propio `localStorage["menujd.log.<id>.v1"]`, así que nunca se mezclan datos entre perfiles.
- `builder` (opcional): `{ main: ["D","C","N"], snackSlot: "S" }`. Solo lo define JD — habilita la sección "Monta tu día" en Menú; si un perfil no lo define, esa sección se oculta.
- `calendar` (opcional): `{ enabled: true }`. Solo lo define JD — habilita el botón 📅 de Google Calendar en Hoy; si un perfil no lo define, el botón y la sección de ajustes de calendario en Ajustes se ocultan.
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
- **Preentreno** (franja `P`, `gymOnly: true`): solo sale en Hoy los días cuyo tipo de día tiene `gym: true` (Trabajo + gym, Libre + gym) o si ya tiene algo registrado (`daySlots(day)`, que también filtra "Mover a" y el selector de franja de Menú → Productos). No tiene platos (`menu.P = []`) ni objetivo, así que no sale en el Menú ni "Con lo que tengo"; se registran productos sueltos. A Google Health va como `SNACK` a las 18:30 si no tiene hora.

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
- Documento fuente: `privado/referencias/Plan nutricional Cristina.pdf` (no se sube a `data.js`, solo sirvió de referencia para construir el menú).
- Notas del plan (alimentos recomendados/a limitar, pautas de ritmo de comida, hidratación, entrenamiento, creatina) están en `PROFILES.cristina.notes`.

## Stack y arquitectura
- HTML + CSS + JavaScript vanilla, sin build ni dependencias. Mantenerlo así salvo que el usuario pida migrar (su stack habitual: React, Java 17/Spring Boot, PostgreSQL, Docker).
- Sin fuentes ni recursos externos (todo debe funcionar offline; la fuente Barlow Condensed va alojada en `fonts/` con su licencia OFL y precacheada en `sw.js`), **excepto** la integración opcional con Google Calendar (ver abajo, solo perfil JD): esa sí carga un script externo, pero solo bajo demanda al pulsar el botón correspondiente, nunca en el arranque. Igual con **Open Food Facts** (escáner de códigos de barras): solo se consulta al escanear.
- Archivos:
  - `index.html`: selector de perfil (`#profileSelect`) fuera de las vistas, cinco vistas (`#view-hoy`, `#view-menu`, `#view-semana`, `#view-recetas`, `#view-ajustes`), tab bar inferior de 5 pestañas, hoja modal para añadir, toast.
  - `styles.css`: tokens en `:root`, modo oscuro con `prefers-color-scheme`, safe areas (`env(safe-area-inset-*)`), regla `[hidden]{display:none!important}` (necesaria: `.sheet` usa display:grid, `.builder`/`.profile-bar` dependen de ella para ocultarse).
  - `data.js`: `const PROFILES = { jd, cristina }` — ver "Arquitectura multi-perfil" arriba. Cada plato: `{id, n, i:[ingredientes], k, p, c, f, t?}`.
  - `app.js`: `profile` = perfil activo (variable reasignada por `switchProfile()`); render de vistas, registro, calculadora, export/import JSON, registro del service worker, integración con Google Calendar. No quedan constantes globales tipo `MENU`/`DAY_TYPES`: todo cuelga de `profile.*`.
  - `sw.js`: caché `menujd-vN`, estrategia red primero con fallback a caché para peticiones del propio origen. Siempre saltando la caché HTTP del navegador (`cache: "reload"` al instalar, `cache: "no-cache"` al pedir), porque GitHub Pages da `max-age=600` y si no, tras un despliegue se mezclaban `index.html` y `app.js` de versiones distintas. Solo se guardan respuestas `ok`. Subir N en cada despliegue, y también `APP_VERSION` en `app.js` (se muestra en Ajustes para comprobar qué versión tiene cargada el móvil). Las peticiones a otros orígenes (Google) se dejan pasar sin interceptar ni cachear.
  - `manifest.webmanifest` + `icons/` (192, 512, maskable 512, apple-touch-icon 180).
  - `fonts/`: Barlow Condensed 500/600/700 (woff2, latin) + `OFL-BarlowCondensed.txt`. `img/p/`: fotos del catálogo + `credits.json`.
  - `privado/` (no se sube, `.gitignore`): `tickets-mercadona/`, `referencias/` (plan de la dietista, zip original de la app) y `capturas/`. Los documentos personales nuevos van ahí, nunca en la raíz (la raíz es lo que publica GitHub Pages).
- Persistencia, con clave por perfil: `localStorage["menujd.log.<profileId>.v1"]` =
  `{ "YYYY-MM-DD": { type: "trabajo-gym", steps?: 12000, items: [{ slot:"D|C|N|S", ref?:"D4", m?: 1.5, i?: [ingredientes por ración], t?: "14:32", n, k, p, c, f }] } }`. `t` = hora real: `addItem()` la pone solo si se registra en el propio día (en días pasados o futuros no se inventa; al copiar de otro día se quita); se cambia o borra en la hoja de la entrada (campo Hora). En Hoy sale delante de los macros; el código del plato (D1, C2…) ya no se muestra en la lista para no confundir la "C" de comida con la de carbohidratos. "editado" solo en platos (`ref`) con ingredientes cambiados, no en productos sueltos.
  Perfil activo en `localStorage["menujd.profile.v1"]`. El registro antiguo de antes de los perfiles (`menujd.log.v1`) se migra automáticamente a `menujd.log.jd.v1` la primera vez que carga `app.js`.

## Integración opcional con Google Calendar
- Solo disponible en perfiles con `calendar: { enabled: true }` en `data.js` (hoy, solo JD). El botón y la sección de ajustes se ocultan en perfiles sin esta clave.
- Botón 📅 junto al selector de tipo de día (vista Hoy): consulta el calendario principal ("primary") de Google del día mostrado y propone "trabajo" si algún evento de ese día contiene la palabra clave configurada (por defecto "turno"); si no, propone "libre". El gimnasio sigue decidiéndose por `profile.gymDays`, no por el calendario.
- No hay sincronización automática en segundo plano: el usuario pulsa el botón cuando quiere detectar/actualizar.
- Client ID por defecto en `PROFILES.jd.calendar.clientId` (no es secreto; el secreto del cliente nunca se usa ni se sube). Si el usuario guarda otro en ajustes, manda el guardado. Orígenes autorizados en Google Cloud: `https://juaandix.github.io` y `http://localhost:8080`.
- Ajustes → "Google: turnos y Fitbit": Client ID de OAuth (lo crea el usuario en Google Cloud Console, tipo "Aplicación web", scope `calendar.readonly`, orígenes de JavaScript autorizados = origen exacto donde se sirve la app) y la palabra clave.
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

### Enviar comidas a Google Health (solo JD: `health.food: true`)
- **Un envío por día**: cada comida registrada se manda como una entrada `nutrition-log` de alimento anónimo (`POST …/nutrition-log/dataPoints` con `foodDisplayName`, `mealType`, `energy.kcal`, `totalCarbohydrate`, `totalFat` y `nutrients:[{nutrient:"PROTEIN"}]`). Franjas → `BREAKFAST/LUNCH/SNACK/DINNER`, a la hora real (`x.t`) si la tiene; si no, hora nominal (8:00, 14:30, 17:30, 21:00; varias en la misma franja, +5 min cada una). `t` entra en la firma solo si existe (los días ya enviados no cambian).
- Los tres tokens (calendario, pasos/peso, comidas) se piden con `requestToken(key, scope, check)`, cada uno con su clave de sesión.
- Un solo envío de comidas a la vez (`foodAutoBusy`, compartido por el botón y `autoFood()`): si no, el mismo día se mandaba dos veces.
- Permiso `googlehealth.nutrition.writeonly`, con token propio (`sessionStorage["menujd.ghealth.food.tok.<id>.v1"]`), separado del de pasos y peso.
- **Por qué no hay "envío automático a las 23:59"**: sin servidor no se puede ejecutar nada a una hora fija (iOS no deja segundo plano a una PWA) y Google solo da un token nuevo tras una pulsación. Así que: botón en Hoy (bajo los pasos) para enviar el día por la noche; al abrir la app después (`autoFood()`: arranque, `visibilitychange`, `online`) los días ya terminados que falten se envían solos si el token sigue vivo; si no, el botón se resalta ("Enviar ayer" / "Enviar N días").
- El botón envía primero los días terminados pendientes; el de hoy solo cuando no queda nada atrás.
- Estado en `localStorage["menujd.ghealth.food.<id>.v1"] = { since, days: { "YYYY-MM-DD": { sig, names, at } } }`. `sig` = firma de las comidas: si cambia tras enviar, el día queda "cambiado" y al reenviarlo se borran las entradas anteriores (`:batchDelete` con `names`) y se crean de nuevo (las entradas anónimas no se pueden editar). Si un envío falla a medias se guarda lo creado (`sig: "partial"`) para borrarlo en el siguiente intento. Solo se reclaman días desde `since` (el primer envío) y como mucho 7 días atrás.
- Sin probar aún con la cuenta real (no sabemos si se ve en la app de Fitbit).

## Requisitos de plataforma
- iOS: Safari 16.4+, metas `apple-mobile-web-app-*` y `apple-touch-icon`. Nada de APIs no soportadas en iOS (Web Bluetooth, Background Sync…).
- Android: Chrome, instalable vía manifest + service worker.
- HTTPS obligatorio (GitHub Pages: https://juaandix.github.io/menu-jd/).
- Diseño mobile-first, objetivos táctiles ≥ 44 px, sin scroll horizontal.

## Herramientas de diseño y pruebas (solo en este Mac)
- Skills de terceros revisadas e instaladas en `.claude/skills/` (no se suben: `.claude/` está en `.gitignore`): `ui-ux-pro-max`, `design-taste-frontend` (Taste Skill), `impeccable`, `emil-design-eng`, `review-animations`, `improve-animations`, `animate`, `design-motion-principles`, `web-design-guidelines` (Vercel), `playwright-cli` y Ponytail (`ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`; de github.com/DietrichGebert/ponytail, MIT, commit 84740e3: solo los SKILL.md, sin los hooks de Node del plugin).
- `impeccable` descarga un binario de sus releases de GitHub la primera vez que se usa su CLI (con comprobación sha256): avisar antes de usarla así.
- `playwright-cli` (npm global `@playwright/cli@0.1.22`) usa el Chrome instalado: `playwright-cli open http://localhost:8080/ --browser=chrome`, `resize 390 844`, `screenshot --filename=…`, `console`, `eval "() => …"`, `close`. Deja una carpeta `.playwright-cli/` (ignorada).
- El tema oscuro azul/violeta y el sistema visual actual los decidió el usuario: las skills de diseño se usan para revisar y pulir, no para rehacer la estética sin preguntar.

## Probar
```
python3 -m http.server 8080   # http://localhost:8080
```
Probar a 390×844, añadir platos, recargar y comprobar que el registro persiste y que no hay errores en consola.
Tests: abrir `http://localhost:8080/tests.html` (carga la app en un iframe y prueba ajuste de cantidades (`fitMix`, `withGrams`, editor, Con lo que tengo), catálogo, ida y vuelta de `w`, franjas de JD, macros de platos vs ingredientes, `fitGramsFor`, `substitutes`, plan de Cristina, `weightTrend`, envío de comidas a Google Health con la API simulada). Sin dependencias; el título de la pestaña dice `OK n` o `FALLOS n`. Pasarlos tras tocar `SHOP`, platos o el editor. `tests.html` no se cachea en `sw.js`.

## Semana, peso, pasos, compra y costes
- **Pasos** (vista Hoy, campo `steps` del día): si el tipo de día tiene `steps` (JD: los de trabajo = 15.000), el objetivo de kcal se ajusta con `(pasos − referencia) × 0,0004 × kg` (≈0,035 kcal/paso a 87 kg), redondeado a 10 y limitado a ±400. Sin `steps` en el tipo de día solo se informa. kg = último peso registrado hasta esa fecha, o `profile.weight`.
- **Vista Semana** (domingo–sábado): media de kcal/proteína vs objetivo (con ajuste por pasos), balance semanal, pasos medios, peso medio vs semana anterior, coste; una fila por día que abre ese día en Hoy. Los días **futuros** con comidas son plan (etiqueta "plan", barra tenue): cuentan para la compra pero no para medias ni balance.
- **Planificar días vacíos** (Semana): rellena los días sin nada desde hoy hasta el sábado con "Repetir la semana anterior" (mismo día de hace 7 días, con su tipo), "Seguir el plan · semana N" (perfiles con etiquetas S1/S2: `planDishes()`) o "Menú variado" (perfiles con `builder`: rota D/C/N por día y añade los snacks de `type.mods`, saltando platos con algo que falta). Toast con Deshacer.
- **Peso**: `localStorage["menujd.weight.<id>.v1"] = { "YYYY-MM-DD": 86.4 }`; gráfica SVG de los últimos 60 registros con línea de `weightGoal` y media de 7 días. `weightTrend()`: regresión de los últimos 28 días (mín. 4 registros en ≥10 días) → kg/semana y fecha estimada para llegar a `weightGoal`.
- **Lista de la compra**: suma los ingredientes de los platos registrados en la semana (× ración). Los ingredientes son texto libre: `parseIng()` en `app.js` saca la cantidad y los asigna al catálogo `SHOP` de `data.js` (compartido entre perfiles, la primera regex que coincide gana, así que el orden importa). Pasta/arroz/pollo cocidos se pasan a seco/crudo (factores de las notas: ÷2,5, ÷2,6, ×1,3). Al añadir platos con ingredientes nuevos, comprobar que caen en la entrada correcta del catálogo. Marcas por semana en `menujd.shopcheck.<id>.v1`.
- **Catálogo ampliado** (15/10/2026): todos los alimentos de los tickets de Mercadona de mar–oct 2026 (`privado/tickets-mercadona/Receipt-*.pdf`; droguería y limpieza no) + fruta y verdura comunes. Los macros de esas entradas nuevas son **aproximados** (etiqueta Hacendado de memoria o tablas de composición), no verificados con la etiqueta: si se usan en un plato de JD, comprobar antes con la etiqueta real. Trampas de orden ya resueltas: pescado "en aceite" antes que `aceite`, `cereales` antes que `leche`, `jamoncitos` antes que `jamon`, `gnocchi` antes que `pasta`, `vinagre` antes que `vino`, `cottage` antes que `burgos`, pollo con `(?<!re)` para no coger "repollo", y `especias` (con `\bsal\b`) la última. Hay test con los nombres de los tickets.
- **Precios**: los introduce el usuario (€/kg, €/l o €/ud) en Semana → Precios; `localStorage["menujd.prices.v1"]`, comunes a todos los perfiles. No hay precios por defecto (no inventarlos). La lista muestra lo usado en platos, en lo registrado (`x.i`) y en Mis productos. Coste de plato/día/semana/lista = suma de lo que tenga precio; "≥" si falta alguno.
- Las entradas nuevas del registro guardan `m` (ración); en las antiguas se deduce de las kcal.
- "Monta tu día" añade el plan al día abierto en Hoy (no siempre a hoy), para poder planificar días futuros.
- Copia de seguridad v2: `{ app:"menujd", version:2, profile, log, weight, prices }`; la importación (`importBackup(data, fileName)`, con tests) acepta también el formato antiguo (objeto de días).

## Editor de platos y Mis productos
- Botón "✎ Cambiar" en cada tarjeta del Menú: cambiar, quitar o añadir ingredientes. Los macros se ajustan **por diferencia** (plato − ingrediente quitado + ingrediente nuevo), así el resto conserva sus valores originales.
- Macros por ingrediente: `nut: [kcal, P, C, G]` por 100 g en cada entrada de `SHOP` (y `cooked.nut` para pollo/pasta/arroz cocidos). Con ellos, los platos de JD se recalculan con ~0,1 % de desviación; los de Cristina ~7 % (sus macros son estimaciones con otros valores). `w` = texto con el que se escribe el ingrediente al usarlo como sustituto (`"<g> g de <w>"`), y tiene que volver a caer en la misma entrada del catálogo (hay test de ida y vuelta).
- Al **cambiar** un ingrediente, los gramos del nuevo se calculan solos (`fitGramsFor`): por defecto "Kcal + proteína" (mínimos cuadrados pesando ±15 kcal y ±3 g P) o, si la proteína es <20 % de las kcal del original (arroz, aceite, fruta), "Mismas kcal" (`defaultFit`). Botones para igualar kcal, proteína, carbohidratos o grasa; escribir gramos a mano lo pasa a manual. Se muestra la diferencia de los 4 macros con el original. Al **añadir**, 100 g o 1 unidad. Si el perfil tiene `slots[].target`, se avisa de si el plato sigue en su franja (±15 kcal, ±3 g P).
- **Sustitutos recomendados** (`substitutes()`): al cambiar, los 5 ingredientes del catálogo que mejor suplen al original. Solo del mismo grupo `r` de `SHOP` (más los afines de `ROLE_ALSO`), con preferencia por el mismo subgrupo (`prot:carne`, `hc:guarnicion`…) y por cocido ↔ cocido; puntúa el parecido de los 4 macros y descarta cantidades poco realistas y lo que falta en casa. Entrada nueva en `SHOP` = ponerle `r`.
- Guardado por perfil y por móvil en `localStorage["menujd.dishes.<id>.v1"] = { "D1": { i, k, p, c, f } }`; `rebuildIndex()` lo superpone a `data.js` (original en `profile._baseMenu`). "Restaurar original" lo borra. Lo ya registrado no cambia.
- Mis productos: `localStorage["menujd.products.v1"] = [{ key, n, nut, g?, r?, ean? }]` (`ean` = código de barras si se creó escaneando) (`r` = grupo elegido al crearlo; sin grupo se recomienda como sustituto de cualquier cosa), comunes a todos los perfiles; se reconocen en los ingredientes por su nombre y salen en la lista de la compra y en precios. Se crean desde el editor y se borran en Ajustes.
- La copia de seguridad incluye `dishes` (del perfil) y `products`.
- El editor tiene modos (`ed.mode`): `dish` (plato del Menú, guarda override), `log` (desde la hoja de añadir: "Cambiar ingredientes solo para hoy", registra con la ración elegida sin tocar el plato), `free` ("Montar con ingredientes": comida desde cero con macros automáticos) y `entry` (ingredientes de algo ya registrado).
- Entradas del registro con ingredientes propios guardan `i` (por 1 ración) y `m`; la compra y el coste usan `x.i` antes que el plato de `ref`.
- En Hoy, tocar una entrada abre su hoja: cambiar ración (recalcula desde los valores por ración = k/m), mover a otra franja, duplicar, ✎ ingredientes y borrar. Borrar (también con ✕) muestra un aviso con "Deshacer" (6 s).

## Fotos de productos
- Cada entrada de `SHOP` tiene foto genérica en `img/p/<key>.webp` (160×160, WebP q70, ~3–8 KB; ~530 KB las 145). Sacadas de Wikimedia Commons (solo CC0, dominio público, CC BY y CC BY-SA), recortadas al centro y reducidas; autor, licencia y enlace en `img/p/credits.json` (`{ key: { t, a, l, u } }`), visibles en Ajustes → Fotos de productos → Créditos. Nada de fotos de la web de Mercadona ni con marcas visibles (derechos de autor; el repo es público).
- **Entrada nueva en `SHOP` = añadir su foto y su crédito** (hay test que lo comprueba). Si se cambia una foto existente, subir `IMG_CACHE` en `sw.js`.
- `sw.js`: las fotos van en una caché aparte (`IMG_CACHE = "menujd-img-v1"`, caché primero) que no se borra al subir la versión; se descargan al mostrarse (`loading="lazy"`), no se precachean.
- Fotos propias: Ajustes → Fotos de productos → "Tu foto" (cámara o galería; `<input type=file accept=image/*>`). `shrinkPhoto()` recorta al centro y reduce a 160×160 JPEG 0,75 (~8 KB) en un canvas; se guardan en `localStorage["menujd.photos.v1"] = { key: dataURL }`, comunes a los perfiles, mandan sobre la genérica. No van en la copia de seguridad. Mis productos solo tienen foto si se la haces.
- `thumbHTML(c)` pinta la miniatura (o la inicial si no hay foto o no carga). Sale en: buscador de la hoja de añadir, editor (recomendados y lista), Me falta, lista de la compra, Mis productos y, en Hoy, las entradas de un solo ingrediente (`entryThumb`). Los platos no tienen foto.

## Rediseño P1 (crítica de Impeccable, 15/10/2026: 26/40)
- Tono "igual pero ordenado": se conserva el tema y la fuente; cambia la jerarquía.
- Hoy: el resumen (marcador) es la tarjeta principal; pasos, Fitbit y Google Health son una franja de estado sin tarjeta. Cada franja (Desayuno, Comida…) es un bloque propio (`section.slot`: fondo `--surface`, raya de acento a la izquierda) con sus comidas dentro de `.slot-body`; la franja vacía va sin fondo y con la raya gris (pedido del usuario: antes no se distinguía qué comida era de cada franja).
- Menú: cada plato es un `<details class="dish">` (código, nombre, kcal/P); ingredientes, nota, macros y botones al desplegarlo. `cardHTML()` sigue llamándose así.
- Ajustes: pestaña nueva con Mis productos, Fotos de productos, Copia de seguridad (y versión) y Google. Recetas queda solo con recetas y notas.
- Sin rótulos pequeños sobre los títulos (el texto va en `.lead`). `--faint` subido a `#7a8db2` (JD) y `#9c84b1` (Cristina): ≥4,5:1 sobre fondo y tarjetas.

## Estilo «marcador deportivo» (elegido por el usuario el 15/10/2026)
- Voz del marcador: `--score` = Barlow Condensed (500/600/700) para cifras grandes, encabezados de sección, cabecera de fecha, pestañas y etiquetas en mayúsculas con espaciado; el texto de lectura y los controles siguen en la fuente del sistema.
- Firma: barras segmentadas (`.seg`, máscara `repeating-linear-gradient`; el detector de Impeccable la marca como «stripes», es un falso positivo). Semana: fichas como panel de marcador (rejilla con líneas de 1 px, sin tarjetas dentro de tarjetas).
- JD pasó a negro grafito (15/10/2026); Cristina mantiene el violeta. `--ink-soft` = texto de listas de ingredientes por perfil. Revisado a 390 y 320 px sin scroll horizontal (`.date-wrap{grid-template-columns:minmax(0,1fr)}`).

## Ajuste automático de cantidades (`fitMix`)
- `fitMix(items, target, base, reg)`: mínimos cuadrados con límites (descenso por coordenadas) sobre los gramos; pesos por tolerancia (kcal 1/15², P 1/3², C y G con 0,3 de peso) + inercia hacia los gramos de partida (`reg`). Después redondea con `fitSpec()`: unidades enteras (fruta y caseros de ½ en ½), gramos de 5 en 5, de 1 en 1 en grasas, salsas, dulces y polvos y en cantidades <40 g; topes por grupo (`FIT_CAP`).
- `withGrams(raw, g)` reescribe una línea conservando el texto si empieza por la cantidad («300 g pasta cocida (macarrón o hélices)»); si no, `"<g> g de <w>"`. `slotTarget(slot)`: objetivo de la franja (JD: su `target`; snacks: punto medio de pMin–pMax; sin target: media de los platos), C y G de la media.
- **Con lo que tengo** (hoja de añadir): eliges productos del catálogo (sin los de "Me falta"), se calculan los gramos para el objetivo de la franja y se abre el editor en modo `free` con el resultado (lo que sale a 0 g se lista como "no hace falta").
- **Editor**: `ed.target` = macros del plato original (o de la franja en "montar"). Al cambiar, añadir o quitar un ingrediente, `afterIngredientChange()` reajusta todos los que tienen macros (`rebalanceEditor()`, macros por diferencia) si está activado "Recalcular las cantidades al cambiar ingredientes" (`localStorage["menujd.autofit.v1"]`, por defecto sí; en "montar" siempre). Botón "Ajustar cantidades" a mano y "Deshacer" del último ajuste.
- **Cantidad a mano** (editor): tocar un ingrediente abre su cantidad (`openQty` → pantalla de gramos sin cálculo de sustituto, `ed.qtyOnly`); se guarda con `withGrams` (conserva la redacción) y queda **fijada** (`ed.locked`, índices; se desplazan al quitar y se liberan al sustituir). El reajuste no toca lo fijado y, en platos existentes, mueve cada ingrediente solo entre ½× y 2× de su cantidad (sin cantidades absurdas; si no llega, avisa la franja).
- **Con lo que tengo** usa siempre pasta, arroz y carne en cocinado (`cookedOnly`: pasta, arroz, noodles y `r: "prot:carne"` con `cooked`). Versiones cocinadas añadidas a picada (pollo y mixta), lomo, jamoncitos, burgers, albóndigas, longaniza y noodles (valores típicos de tablas; `f` = cocinado → crudo para la compra). "Pavo a la plancha" ya es cocinado: valores de pavo cocinado.

## Hoja de añadir
- Cabecera con el día, la pista de la franja y lo que ya llevas en ella (`.add-ctx`). Cada plato (`.pick`) muestra sus ingredientes con cantidades como etiquetas; al elegirlo, el paso de ración lista los ingredientes de 1 ración.
- "Otra cosa con tus macros" queda plegado al final (`details.add-more`).

## Escanear código de barras
- Botón con icono de código de barras junto al buscador de la hoja de añadir (`data-scan` → `openScan()`): vídeo de la cámara trasera (`getUserMedia`, `playsinline`) y campo para escribir el número a mano. La cámara se apaga con `stopScan()` al cerrar la hoja, volver o encontrar un código.
- Lector: `BarcodeDetector` del navegador si existe y admite `ean_13` (Chrome Android); si no (iOS Safari), `lib/barcode/` = ponyfill de `barcode-detector` 3.0.8 + `zxing_reader.wasm` de zxing-wasm 2.2.4 (MIT, licencias en esa carpeta; ~1 MB), cargados solo al pulsar el botón (`barcodeDetector()`, `locateFile` apuntando a `lib/barcode/`). No están en el precacheo de `sw.js`; se guardan en la caché la primera vez que se usan.
- `lookupBarcode(code)`: si algún producto de Mis productos tiene ese `ean`, va directo a los gramos (sin conexión). Si no, `GET https://world.openfoodfacts.org/api/v2/product/<code>.json` (gratis, sin clave, con CORS) → `openWebForm(nombre, { ean, nut, note })` con los macros por 100 g ya puestos (`energy-kcal_100g`, o `energy_100g` kJ ÷ 4,184) para revisarlos con la etiqueta. Si no está, no tiene macros o no hay conexión, el formulario sale vacío con el aviso correspondiente. Al guardar, el producto lleva `ean`.
- Probado en Chrome de escritorio (búsqueda real, guardado, segundo escaneo y lector wasm con un EAN-13 dibujado); sin probar aún con la cámara del iPhone.

## Foto de la tabla nutricional (OCR gratis, en el móvil)
- El usuario eligió la versión **gratis** (16/10/2026): nada de API de pago. La IA con visión y búsqueda (API de Claude con su clave) se descartó por coste; su suscripción de Claude no incluye la API.
- Botón "Rellenar con una foto de la tabla" (`labelPhotoHTML`, `<input type=file accept=image/*>` sin `capture` para poder elegir de la galería) en el formulario de Mis productos (`openWebForm`: búsqueda en Google, escáner y Open Food Facts; si OFF trajo datos dice "¿No cuadra? Leer la tabla de la etiqueta" y conserva el `ean`) y en la vista del escáner ("Sin código"). Además, "O pega el texto de la etiqueta" (`#wfPaste`): en el iPhone, Texto en vivo lee mejor que el OCR.
- OCR: tesseract.js 7.0.0 + core 7.0.0 (Apache-2.0) + `spa.traineddata.gz` (best_int) en `lib/ocr/`, cargado solo al usarlo (`ocrWorker()`, `workerBlobURL: false`, rutas absolutas a `lib/ocr/`). El navegador baja una de las tres variantes del core (~4 MB) + el modelo (~2 MB); el modelo queda en IndexedDB. No están en el precacheo de `sw.js`.
- `parseLabel(text)` → `{ k, p, c, f, warn? }` por 100 g (primera columna): kcal de "N kcal", o del par "kJ/kcal", o kJ ÷ 4,184; líneas de grasa (sin saturadas…), hidratos (sin azúcares) y proteínas. El OCR lee "0,2 g" como "0,29" y "18 g" como "189" (la g como 9): si no hay "g" y el número acaba en 9, se toma sin el 9 salvo que con el 9 cuadre ≥15 kcal mejor por valor con 4·P + 4·C + 9·G. `warn` si los macros no cuadran con las kcal (±20 %). Tests en `tests.html`. Se enseña el texto leído para comprobarlo.
- Probado en Chrome de escritorio con tablas dibujadas (también giradas y borrosas): sin probar aún con fotos reales del iPhone.

## Menú → Productos
- Pestañas "Platos | Productos" justo bajo el título del Menú: control segmentado `.mtabs` (fijo arriba al hacer scroll, cada pestaña con su subtítulo y recuento: "24 recetas completas" / "153 alimentos sueltos"). Ojo: no usar la clase `.seg` para controles, es la barra segmentada del marcador (`setMenuTab()`; clases `dishes-only` / `products-only` y `#view-menu.show-products`). Productos = todo el catálogo con macros (`foodOptions()`: SHOP + Mis productos, también las versiones cocidas), agrupado por categoría de la compra (`SHOP_CATS`), con buscador, filtro por categoría y foto.
- Al tocar uno (`openProductSheet`) se abre la hoja de gramos/unidades (`openFoodGrams` con `sheetState.from = "menu"`) con selector de franja (`data-slot-pick`); se propone por la hora si el día abierto es hoy (`guessSlot()`), si no la primera. Se registra con `logFood` en el **día abierto en Hoy** (como "Monta tu día"), así que sirve para planificar días futuros.

## Despensa y atajos
- **Me falta** (Menú, arriba): `localStorage["menujd.missing.v1"] = [claves de SHOP]`, común a los perfiles. Los platos que lo llevan salen con ⚠ y "Sustituir" (Menú: guarda el plato; hoja de añadir: "Sustituir solo para hoy"), con ⚠ en Monta tu día, y no se proponen en "lo de siempre", sugerencias ni Menú variado. Marcarlo como comprado en la lista de la compra lo quita.
- **Copiar comidas de otro día** (Hoy): lista los 14 días anteriores con comidas; añade sin borrar, con Deshacer.
- **Productos rápidos** (Hoy, en cada franja): hasta 3 botones con foto, cantidad y kcal que registran con un toque (`quickProducts()`/`quickHTML()`, `data-quick-food`). Primero los productos sueltos (`x.i` de una línea, sin `ref`) que más has registrado en esa franja en 30 días, con la cantidad de la última vez; después los de `profile.quick` (clave de SHOP, `"|1"` = versión cocinada; JD: desayuno muffins y café con leche; comida pasta cocida, arroz cocido, picada de pollo y picada mixta cocinadas (pedido del usuario); snack postre +Proteínas, muffins y tarta; cena griego; preentreno plátano, café solo y tortitas de arroz). Las cervezas nunca salen (`QUICK_SKIP`, pedido del usuario), aunque se hayan registrado. Salen tantos como fijos tenga la franja (mínimo 3). Cantidad por defecto: `startGrams()` (1 ud, 200 g de pasta/arroz cocidos, 150 g de carne…) o lata de 330 ml (refresco). Nada de "Me falta".
- **Lo de siempre** (Hoy, franja vacía): el plato+ración más repetido en esa franja en los 30 días anteriores, si sale ≥3 veces (`favorite()`); si no, **Repetir**: el último plato de esa franja en esos 30 días (`last: true`). Nunca uno con algo de "Me falta".
- **Sugerencia de proteína** (resumen de Hoy): con ≥2 comidas, ≥10 g de proteína pendientes y ≥60 kcal libres, hoy desde las 15 h o días futuros: los 2 platos que más proteína cubren sin pasarse de kcal (`proteinSuggest()`).

- **Bebidas**: grupo `r: "bebida"` y categoría "Bebidas" en la compra, **todas en ml** (hay test). En `SHOP`: café con leche y café (`g: 200` = una taza, para que "1 café con leche" sean 200 ml; al registrarlos sale un contador de tazas), refresco zero, cerveza sin alcohol, cerveza, vino y zumo de naranja. Van antes que "leche" en `SHOP` (si no, "café con leche" caería en la leche); el zumo excluye "zumo de limón". Los de `u:"ml"` se registran en ml (`"330 ml de cerveza"`).
- **Unidades**: los ingredientes con `g` (peso por unidad: muffin, huevo, yogur, tarta…) muestran un contador "− n +" con atajos 1/2/3/4/6 (`unitsHTML`/`stepUnits`) al registrarlos sueltos y en el editor; rellena los gramos y se escribe `"228 g de muffins caseros (3 ud)"`. Para platos, "Otra cantidad" (`multHTML`) permite cualquier ración de 0,5 en 0,5 (hasta 10×) al añadir y al cambiar la ración de lo registrado.
- **Buscar en la hoja de añadir**: además de los platos, salen los ingredientes del catálogo y Mis productos que coinciden (`renderFoodRow`), que se registran por gramos (`logFood`: entrada con `i: ["<g> g de <w>"]`, así cuentan en la compra y el coste). Para lo que no esté, "🔎 Buscar en Google" abre `<texto> macros por 100 g` en otra pestaña y deja en la hoja un formulario (`openWebForm`): macros por 100 g + gramos comidos + tipo; al guardar crea o actualiza el producto en Mis productos y lo registra. No se consulta ninguna API: el usuario copia los números (sin servidor no hay forma gratuita de leer resultados de búsqueda).

## Interfaz
- Tema oscuro fijo por perfil, decidido por el usuario: JD en negro grafito neutro (`--bg:#0b0c0e`, superficies `#141518`/`#1b1c20`) con el azul solo como acento; Cristina en violeta. No seguir el modo claro del sistema.
- Sistema visual en `styles.css`: tokens en `:root` (JD por defecto) y `:root[data-profile="cristina"]` — `--bg/--bg-elev/--surface/-2/-3`, `--line/-2`, `--accent` (texto/trazos) y `--accent-strong` (rellenos y botones), colores de macro `--m-p/--m-c/--m-f`. Fuente del sistema (SF Pro) con `tabular-nums` en todo; `--mono` apunta a la misma fuente. Bordes finos sólidos (nada de discontinuos salvo "lo de siempre").
- Iconos: SVG en línea con `ico(nombre)` (`ICONS` en `app.js`) y copiados tal cual en `index.html`; no usar emojis en la interfaz (solo "⚠" dentro de `<option>`, que no admite SVG).
- Hoy: marcador (`scoreboard()`): kcal restantes en grande, % y barra segmentada (`.seg`, se llena animada solo la primera vez por sesión), comido/objetivo/ajuste por pasos; barras de macros (`macroBar()`; solo la proteína tiene objetivo, también segmentada).
- Números mostrados con coma decimal: `f1()` para mostrar, `r1()` solo para guardar/calcular.
- Nombres con "(S1 · Lunes)": `splitName()`/`nameHTML()` muestran la etiqueta aparte. En la hoja de añadir, "Toca hoy en el plan" lista los platos cuyo día de la etiqueta coincide con el día abierto (Cristina).
- Hoy: resumen compacto (kcal restantes, proteína que falta, barras, carbohidratos/grasa/coste en una línea), subtotal por franja, pasos en una línea. Semana: 4 fichas + gráfica SVG de barras (kcal vs objetivo por día). Iconos SVG en la barra inferior.

## Ideas pendientes (no implementadas)
- Sincronización entre dispositivos con backend Spring Boot + PostgreSQL.
- Integración con Hevy (solo exporta tipo de entreno, duración y kcal estimadas).
