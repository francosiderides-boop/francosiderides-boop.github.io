# Portfolio de Franco Gonzalez

Sitio web de portfolio para un filmmaker: portada con reel, página de trabajos con filtros, una página por cada proyecto (video, galería y ficha técnica), "Sobre mí" y contacto con formulario y WhatsApp.

Esta guía está pensada para alguien **sin conocimientos técnicos**. Seguí los pasos en orden y no te saltees ninguno.

---

## Índice

1. [Lo que necesitás instalar (una sola vez)](#1-lo-que-necesitás-instalar-una-sola-vez)
2. [Ver el sitio en tu computadora](#2-ver-el-sitio-en-tu-computadora)
3. [Agregar un proyecto nuevo](#3-agregar-un-proyecto-nuevo)
4. [Cambiar textos, colores y datos de contacto](#4-cambiar-textos-colores-y-datos-de-contacto)
5. [Activar el formulario de contacto](#5-activar-el-formulario-de-contacto)
6. [Importar tus proyectos desde Behance](#6-importar-tus-proyectos-desde-behance)
7. [Publicar el sitio en internet](#7-publicar-el-sitio-en-internet)
8. [Conectar tu propio dominio](#8-conectar-tu-propio-dominio)
9. [Si algo no funciona](#9-si-algo-no-funciona)

---

## 1. Lo que necesitás instalar (una sola vez)

1. **Node.js**: es el programa que arma el sitio. Entrá a [nodejs.org](https://nodejs.org), descargá la versión que dice **LTS** e instalala como cualquier programa (siguiente, siguiente, finalizar).
2. **Visual Studio Code** (opcional, pero recomendado): un editor para abrir y modificar los archivos del sitio. Se descarga gratis en [code.visualstudio.com](https://code.visualstudio.com).

> **¿Qué es "la terminal"?** Es una ventana donde se escriben órdenes. En Mac: abrí la app **Terminal**. En Windows: abrí **PowerShell**. En Visual Studio Code también hay una: menú **Terminal → Nueva terminal** (ya se abre dentro de la carpeta del sitio).

## 2. Ver el sitio en tu computadora

1. Abrí la terminal **dentro de la carpeta del sitio**. Lo más fácil: abrí la carpeta con Visual Studio Code y usá **Terminal → Nueva terminal**.
2. La primera vez, escribí esto y apretá Enter (descarga lo necesario; tarda uno o dos minutos):

   ```bash
   npm install
   ```

3. Para ver el sitio, escribí:

   ```bash
   npm run dev
   ```

4. Abrí el navegador en **http://localhost:4321**. Cada vez que guardes un cambio en un archivo, la página se actualiza sola.
5. Para apagarlo, volvé a la terminal y apretá **Ctrl + C**.

## 3. Agregar un proyecto nuevo

Cada proyecto es **una carpeta** dentro de `content/proyectos/`. Adentro va un archivo `index.md` con los datos y las imágenes del proyecto. No hace falta tocar nada más: el sitio crea la página, la tarjeta en "Trabajos" y los enlaces de anterior/siguiente solo.

**Paso a paso:**

1. Entrá a `content/proyectos/` y **copiá** una carpeta de ejemplo (por ejemplo `lumbre`).
2. Cambiale el nombre a la copia. Usá minúsculas y guiones, sin espacios ni tildes: `mi-nuevo-videoclip`. Ese nombre va a ser la dirección de la página: `tusitio.com/trabajos/mi-nuevo-videoclip/`.
3. Reemplazá las imágenes de adentro por las tuyas (JPG o PNG; idealmente de 1920 px de ancho o más). El sitio las achica y optimiza solo.
4. Abrí `index.md` y cambiá los datos. Así se ve:

```yaml
---
titulo: Mi nuevo videoclip
slug: mi-nuevo-videoclip       # igual que el nombre de la carpeta
anio: 2026
categorias: [Videoclips]       # una o varias: [Videoclips, Comerciales]
rol: Director · Editor
cliente: Nombre de la banda
duracion: "3:42"               # si tiene dos puntos, ponelo entre comillas
destacado: true                # true = aparece en la portada
publicado: true                # false = borrador (solo lo ves vos en tu computadora)

sinopsis: Una o dos frases que cuenten de qué se trata.

video: https://vimeo.com/123456789   # enlace de Vimeo o YouTube

miniatura: ./miniatura.jpg            # imagen de la tarjeta
stills:                               # galería (podés poner las que quieras)
  - src: ./still-1.jpg
    alt: Descripción corta de lo que se ve en la imagen
  - src: ./still-2.jpg
    alt: Otra descripción

ficha:
  camara: Sony FX6
  equipo: Nombre (producción), Nombre (sonido)
fichaExtra:                           # opcional: más datos para la ficha técnica
  - dato: Formato
    valor: 4K · 2.39:1
---

Opcional: lo que escribas acá abajo aparece en la página, después de la sinopsis.
```

**Reglas importantes:**

- Respetá los dos guiones y los espacios del principio de cada línea: son parte del formato.
- Las **categorías** tienen que escribirse igual que en `config/sitio.json` (con mayúscula y tilde: `Ficción`).
- El **texto `alt`** describe la imagen para personas ciegas y para Google. Escribí qué se ve, en pocas palabras.
- La **primera imagen de `stills`** se muestra grande y en formato panorámico (2.39:1).
- Para que un proyecto deje de mostrarse sin borrarlo, poné `publicado: false`.
- El orden en "Trabajos" es automático: del más nuevo al más viejo según `anio`.

> Los 3 proyectos de ejemplo usan **imágenes de muestra** y videos de prueba. Reemplazalos o borrá esas carpetas cuando cargues los tuyos.

## 4. Cambiar textos, colores y datos de contacto

Todo está en **un solo archivo**: `config/sitio.json`. Lo que cambies ahí se actualiza en todo el sitio.

| Qué querés cambiar | Dónde, dentro de `sitio.json` |
| --- | --- |
| Tu nombre y especialidad | `"nombre"`, `"especialidad"` |
| Frase y texto de la portada | `"hero"` → `"frase"`, `"disponibilidad"` |
| Imagen de fondo de la portada | `"hero"` → `"imagen"` (archivo dentro de `config/imagenes/`) |
| Video de fondo (opcional) | `"hero"` → `"video"`: un `.mp4` corto, sin sonido, guardado en `public/` (ej. `"/reel.mp4"`) |
| **Color de acento** | `"colorAcento"`: un color en formato `#RRGGBB` (ej. `"#FF5A36"`). El texto de los botones se ajusta solo para que se lea. |
| Bordes redondeados | `"radioBordes"`: `0` = rectos, `4` = apenas redondeados, `12` = bien redondeados |
| Tema al entrar | `"temaPorDefecto"`: `"oscuro"`, `"claro"` o `"sistema"` (usa el de la computadora del visitante) |
| WhatsApp | `"contacto"` → `"whatsapp"`: el número con código de país, **solo números** (Argentina: `549` + código de área + número, ej. `5493511234567`) |
| Número de WhatsApp que se ve | `"contacto"` → `"whatsappVisible"` |
| Mensaje que se escribe solo en WhatsApp | `"contacto"` → `"mensajeWhatsapp"` |
| Email | `"contacto"` → `"email"` |
| Redes sociales | `"redes"`: nombre, usuario y enlace de cada una. Podés agregar o quitar. |
| Categorías de trabajos | `"categorias"` |
| Servicios de la portada | `"servicios"` |
| Textos de "Sobre mí" | `"sobreMi"` → `"titulo"`, `"parrafos"`, `"columnas"` |
| Tu foto | `"sobreMi"` → `"foto"` (archivo dentro de `config/imagenes/`) |
| Dirección final del sitio | `"url"`: tu dominio, ej. `"https://francogonzalez.com"` (se usa para Google y para compartir en redes) |

**Cuidado con el formato:** cada texto va entre comillas `"así"`, y entre un dato y el siguiente va una coma. Si el sitio deja de funcionar después de un cambio, casi siempre es una coma o una comilla que falta. Podés pegar el contenido en [jsonlint.com](https://jsonlint.com) para encontrar el error.

## 5. Activar el formulario de contacto

El formulario usa **Formspree**, que tiene un plan gratuito con un límite de mensajes por mes (alcanza para un portfolio). Funciona igual en Netlify y en Vercel.

1. Creá una cuenta en [formspree.io](https://formspree.io) con tu email.
2. Tocá **New Form**, ponele un nombre (ej. "Portfolio") y elegí el email donde querés recibir los mensajes.
3. Formspree te muestra una dirección como `https://formspree.io/f/abcdwxyz`. Copiá **solo la parte final** (`abcdwxyz`).
4. Pegala en `config/sitio.json` → `"contacto"` → `"formspreeId": "abcdwxyz"`.
5. Publicá el sitio, mandate un mensaje de prueba y confirmá el email que te envía Formspree la primera vez.

> Mientras `formspreeId` esté vacío, el botón "Enviar" abre el programa de correo del visitante con el mensaje ya escrito, para que no se pierda ninguna consulta.

## 6. Importar tus proyectos desde Behance

El sitio puede traer tus proyectos de Behance y convertirlos en proyectos del portfolio. Lo corrés vos, desde tu computadora, cuando quieras.

### Cómo correrlo

1. Revisá que en `config/sitio.json` → `"behance"` → `"usuario"` esté tu usuario de Behance (el que aparece en la dirección de tu perfil: `behance.net/francosiderides` → `francosiderides`).
2. Con la terminal abierta en la carpeta del sitio, escribí:

   ```bash
   npm run importar:behance
   ```

3. Esperá a que termine. Va despacio a propósito (una página cada 2 segundos) para no sobrecargar Behance. Al final te muestra un resumen.
4. Abrí el archivo **`IMPORTACION.md`**: ahí está la lista de lo que tenés que revisar en cada proyecto.
5. Corré `npm run dev` y mirá los proyectos importados en tu computadora.

### Qué hace

- Lee la lista de proyectos desde el feed público de tu perfil (no usa tu contraseña ni inicia sesión).
- De cada proyecto trae: título, descripción, año, etiquetas, portada, imágenes de la galería y videos de Vimeo o YouTube.
- Descarga las imágenes a `public/proyectos/<nombre-del-proyecto>/` y las convierte a WebP en tres tamaños (teléfono, tablet y computadora).
- Crea un archivo por proyecto en `content/proyectos/`, igual que los que hacés a mano.
- Lo que Behance no tiene (rol, cliente, cámara, equipo, duración) queda vacío y marcado con `# COMPLETAR`. **No inventa datos.**

### Los proyectos entran como borrador

Cada proyecto importado tiene `publicado: false`: **lo ves en tu computadora, pero no se publica** hasta que lo revises y cambies esa línea a `publicado: true`. En la tarjeta vas a ver la etiqueta roja "BORRADOR".

### Categorías

Las etiquetas de Behance se pasan a tus categorías según la lista `"mapeoEtiquetas"` de `config/sitio.json` (por ejemplo, `"music video": "Videoclips"`). Si una etiqueta no encaja, el proyecto queda en **"Sin categoría"** y la etiqueta aparece en `IMPORTACION.md` para que decidas. Para que la próxima vez se asigne sola, agregala a la lista:

```json
"mapeoEtiquetas": {
  "music video": "Videoclips",
  "cinematography": "Comerciales"
}
```

### Volver a importar es seguro

Podés correrlo las veces que quieras:

- **No duplica proyectos**: los reconoce por su número de Behance (el dato `behance:` al final de cada archivo; no lo borres).
- **No pisa lo que editaste a mano.** Si cambiaste un campo (por ejemplo, reescribiste la sinopsis), se respeta tu versión y en `IMPORTACION.md` se avisa que Behance tiene una versión distinta.
- Los campos que nunca toca después de crear el proyecto: rol, cliente, duración, ficha técnica, `destacado` y `publicado`.

### Opciones

| Escribí | Para |
| --- | --- |
| `npm run importar:behance` | Importar normalmente |
| `npm run importar:behance -- --sin-cache` | Volver a descargar las páginas (el importador guarda una copia por 24 horas en `.cache-behance/`) |
| `npm run importar:behance -- --sin-feed` | No leer el feed; usar solo `behance-urls.txt` y `behance-paginas/` |
| `npm run importar:behance -- --prueba pagina.html` | Ver qué datos saca de una página guardada, sin crear nada |

### Si faltan proyectos o Behance bloquea la lectura

- **El feed puede no traer todos tus proyectos** (a veces muestra solo los más recientes). Abrí `behance-urls.txt`, pegá la dirección de cada proyecto que falte (una por línea) y volvé a correr el importador.
- **Si Behance bloquea la lectura automática**, el importador se detiene y no insiste (no intenta saltearse bloqueos ni captchas). En ese caso:
  1. Creá una carpeta llamada `behance-paginas` dentro de la carpeta del sitio.
  2. Abrí cada proyecto en tu navegador y guardalo con **Archivo → Guardar página como…**, formato **"Página web, solo HTML"**, dentro de esa carpeta.
  3. Corré `npm run importar:behance -- --sin-feed`.

## 7. Publicar el sitio en internet

Todas estas opciones son **gratis**. Este sitio ya está preparado para **GitHub Pages** (recomendado): se publica solo cada vez que subís cambios y no necesita otra cuenta además de GitHub.

### Opción recomendada: GitHub Pages (gratis) — ya está funcionando

El sitio está publicado en **https://francosiderides-boop.github.io**.

**Para actualizarlo** (después de editar un proyecto, los textos o importar de Behance), abrí la terminal en la carpeta del sitio y escribí:

```bash
npm run publicar
```

Ese comando arma el sitio y lo sube a GitHub. En 1 o 2 minutos los cambios están online.

**Para guardar una copia del código en GitHub** (recomendado, así no perdés nada si se rompe la computadora):

1. Instalá [GitHub Desktop](https://desktop.github.com) (gratis) e iniciá sesión con tu cuenta de GitHub.
2. **File → Add local repository** y elegí la carpeta del sitio (solo la primera vez).
3. Escribí un resumen del cambio abajo a la izquierda, tocá **Commit to main** y después **Push origin**.

> GitHub Pages gratis exige que el repositorio sea **público**: cualquiera puede ver el código del sitio. Es normal y no expone nada privado (no hay contraseñas en estos archivos).

### Alternativa: Netlify (gratis, permite uso comercial)

1. Creá una cuenta gratis en [netlify.com](https://www.netlify.com) entrando con GitHub.
2. **Add new site → Import an existing project → GitHub** → elegí el repositorio. La configuración ya está en `netlify.toml`. Tocá **Deploy**.
3. Cambiá `"url"` en `config/sitio.json` por la dirección que te dé Netlify (ej. `https://francogonzalez.netlify.app`).

> **Sobre Vercel:** su plan gratis (Hobby) es solo para uso personal **no comercial**. Como un portfolio para conseguir clientes puede considerarse comercial, conviene GitHub Pages o Netlify.

## 8. Conectar tu propio dominio

> **Esto no es gratis.** Un dominio propio (ej. `francogonzalez.com`) se paga por año. Si querés mantener todo en $0, usá la dirección gratuita `francosiderides-boop.github.io` y salteá esta sección.

**En GitHub Pages:**

1. En GitHub → tu repositorio → **Settings → Pages → Custom domain**, escribí tu dominio y tocá **Save**.
2. En el panel DNS de donde compraste el dominio, cargá los registros que indica la [guía de GitHub](https://docs.github.com/es/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site): un **CNAME** para `www` que apunte a `francosiderides-boop.github.io`, y los registros **A** que figuran ahí para el dominio sin `www`.
3. Cuando GitHub muestre el dominio como verificado, marcá **Enforce HTTPS**.

Para Netlify o Vercel: primero comprá el dominio (por ejemplo en [nic.ar](https://nic.ar) para `.com.ar`, o en Namecheap, Porkbun o GoDaddy para `.com`).

**En Netlify:**

1. Entrá a tu sitio → **Domain management → Add a domain** y escribí tu dominio (ej. `francogonzalez.com`).
2. Netlify te va a mostrar los datos para configurar. La forma más simple es elegir **Set up Netlify DNS**: te da 4 direcciones de "nameservers" (ej. `dns1.p01.nsone.net`).
3. Entrá al panel de donde compraste el dominio, buscá la opción **DNS / Nameservers / Delegación** y reemplazá los que hay por los de Netlify.
4. Esperá (puede tardar desde minutos hasta 48 horas). Netlify activa el candado de seguridad (HTTPS) solo.

**En Vercel:**

1. Entrá al proyecto → **Settings → Domains** → escribí tu dominio → **Add**.
2. Vercel te muestra qué registros cargar: normalmente un registro **A** para `francogonzalez.com` y un **CNAME** para `www`. **Copiá los valores exactos que te muestra Vercel** en esa pantalla.
3. Cargalos en el panel DNS de donde compraste el dominio. Esperá a que Vercel muestre "Valid Configuration".

**Al terminar**, poné el dominio en `config/sitio.json` → `"url"` y volvé a publicar. Así Google y las redes sociales usan la dirección correcta.

## 9. Si algo no funciona

- **"npm: command not found" o "npm no se reconoce"**: Node.js no está instalado o hay que reiniciar la terminal (cerrala y abrila de nuevo).
- **El sitio muestra un error en rojo después de editar un proyecto**: el error dice qué archivo y qué dato está mal. Lo más común: una categoría escrita distinto, un año con letras, o una sangría (los espacios del principio) que no coincide.
- **No aparece una imagen**: revisá que el nombre del archivo en `index.md` sea exactamente igual al archivo (mayúsculas y extensión incluidas: `.jpg` no es lo mismo que `.JPG`).
- **Un proyecto no aparece en el sitio publicado**: fijate si tiene `publicado: false`.
- **El video no se reproduce**: tiene que ser un enlace de Vimeo o YouTube. Si en Vimeo es privado, en su configuración permití que se pueda insertar en otros sitios.

---

### Para quien sepa programar

- Hecho con [Astro](https://astro.build) 7 y Tailwind CSS 4. Sitio 100 % estático; el JavaScript del navegador se limita a filtros, menú, tema, lightbox, video y formulario.
- Esquema de proyectos: `src/content.config.ts`. Componentes: `src/components/`. Páginas: `src/pages/`.
- Imágenes de `/content` y `/config/imagenes`: las optimiza `astro:assets` (WebP 480/960/1600). Imágenes de `/public/proyectos` (importadas): ya vienen optimizadas por el importador; `src/lib/imagenes.ts` arma el `srcset` con sus variantes.
- Importador: `scripts/importar-behance.mjs` y `scripts/behance/`. Respeta `robots.txt`, se identifica como `PortfolioImporter/1.0` y se detiene ante 401/403/429 o captcha. El estado de cada proyecto importado se guarda en `.importado-behance.json`, dentro de su carpeta, para comparar en tres vías y no pisar lo editado a mano.
- Publicación: `npm run publicar` (`scripts/publicar.mjs`) arma el sitio y lo sube con push forzado a la rama `gh-pages`, que GitHub Pages sirve tal cual (con `.nojekyll`). Alternativa: `netlify.toml`.
- Comprobado con Lighthouse en modo móvil: 99 de rendimiento y 100 en accesibilidad, buenas prácticas y SEO.
