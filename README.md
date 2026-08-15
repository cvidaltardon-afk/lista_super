# Mi Lista del Súper

App de lista de compras organizada por categorías, con modo "en casa" (armar la lista), modo "en el súper" (marcar lo comprado) e historial de compras guardadas. Los datos se guardan en el `localStorage` del navegador (quedan en tu celular/computador, no se comparten entre dispositivos).

Es una PWA instalable de verdad: tiene manifest, service worker y funciona offline una vez cargada la primera vez.

## Probarla en tu computador

Necesitas tener [Node.js](https://nodejs.org) instalado (versión 18 o superior).

```bash
npm install
npm run dev
```

Abre la URL que aparece en la terminal (normalmente `http://localhost:5173`).

## Subirla a GitHub

1. Crea un repositorio nuevo en GitHub (por ejemplo `lista-super`).
2. Dentro de esta carpeta, ejecuta:

```bash
git init
git add .
git commit -m "Primera versión de la lista del súper"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

## Publicarla (elige una opción)

### Opción A — GitHub Pages (gratis, incluida en este proyecto)

Ya viene un flujo de GitHub Actions (`.github/workflows/deploy.yml`) que publica la app automáticamente cada vez que subes cambios a `main`.

1. En GitHub, ve a **Settings → Pages** de tu repositorio.
2. En "Build and deployment", elige **GitHub Actions** como fuente.
3. Como GitHub Pages sirve el sitio en una subcarpeta (`tuusuario.github.io/tu-repositorio`), abre `vite.config.js` y agrega el nombre exacto de tu repositorio:

   ```js
   export default defineConfig({
     plugins: [react()],
     base: '/tu-repositorio/',
   })
   ```

4. Sube ese cambio (`git add . && git commit -m "config base" && git push`). En unos minutos la app queda disponible en `https://tuusuario.github.io/tu-repositorio/`.

### Opción B — Vercel (más simple, no requiere tocar `base`)

1. Entra a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. "Add New Project" → elige el repositorio recién subido.
3. Vercel detecta automáticamente que es un proyecto Vite/React — solo confirma y despliega.
4. Cada vez que hagas `git push`, Vercel actualiza el sitio solo.

## Agregarla a la pantalla de inicio del celular

Una vez publicada (con cualquiera de las dos opciones), abre la URL en el navegador de tu celular:

- **Android (Chrome):** debería aparecerte directamente el banner o la opción **"Instalar app"** en el menú (⋮), ya que ahora tiene manifest + service worker válidos — no un simple acceso directo.
- **iPhone (Safari):** botón compartir → "Agregar a pantalla de inicio" (iOS no ofrece un banner de instalación automática como Android, pero el resultado final es el mismo: ícono propio, pantalla completa).

## Estructura del proyecto

- `src/App.jsx` — toda la app (categorías, lógica de la lista, historial, estilos).
- `src/storage.js` — guardado de datos en `localStorage` del navegador.
- `vite.config.js` — configuración del plugin PWA (manifest, íconos, service worker).
- `public/icon-*.png` — íconos de la app (normal y "maskable" para Android).
- `.github/workflows/deploy.yml` — publicación automática a GitHub Pages.
