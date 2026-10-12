# Menú JD — PWA

Menú intercambiable + registro diario de comidas. Funciona en Android e iOS como app instalable (PWA), sin conexión.

## Estructura
```
index.html            Vistas: Hoy, Menú, Semana, Recetas
styles.css            Estilos (modo claro/oscuro, safe areas de iPhone)
data.js               Perfiles (platos, objetivos, recetas, notas) y catálogo de la compra
app.js                Lógica: registro diario, pasos, semana, peso, compra, costes, copia de seguridad
sw.js                 Service worker (offline). Sube CACHE = "menujd-vN" en cada cambio
manifest.webmanifest  Nombre, iconos, modo standalone
icons/                192, 512, maskable y apple-touch-icon
```

## Probar en local
```bash
python3 -m http.server 8080
# abre http://localhost:8080
```

## Publicar gratis en GitHub Pages (HTTPS obligatorio para PWA)
```bash
git init && git add . && git commit -m "Menú JD PWA"
git branch -M main
git remote add origin https://github.com/juaandix/menu-jd.git
git push -u origin main
```
En GitHub: Settings → Pages → Source: *Deploy from a branch* → `main` / `root`.
La app queda en `https://juaandix.github.io/menu-jd/`.

Alternativa: arrastrar la carpeta a Vercel o Netlify, o servirla en un subdominio de juandavidgildiaz.dev.

## Instalar en el móvil
- **Android (Chrome):** abre la URL → menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari, iOS 16.4+):** abre la URL en Safari → botón Compartir → *Añadir a pantalla de inicio*.

## Actualizar el menú
1. Edita `data.js`.
2. Sube la versión en `sw.js` (`menujd-v2`, `v3`…).
3. `git commit` + `git push`. Al abrir la app con conexión se descarga la versión nueva.

## Datos
El registro, los pesos y los precios se guardan solo en el móvil (localStorage). En Recetas → *Copia de seguridad* puedes exportar e importar un JSON.
En iOS, Safari puede borrar los datos de webs que no abres en semanas; la app instalada en pantalla de inicio no se ve afectada mientras la uses, pero exporta de vez en cuando.
