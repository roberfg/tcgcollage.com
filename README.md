# tcgcollage.com

Aplicación web para generar collages de cartas TCG (Pokémon y Magic: The Gathering) a partir de listas de deck. Permite descargar el resultado como imagen JPG.

Creada por un grupo de amigos aficionados a Magic: The Gathering y los juegos de cartas coleccionables, construida en nuestro tiempo libre con mucho cariño.

## Funcionalidades

- Generador de collages para **Magic: The Gathering** y **Pokémon TCG**
- Búsqueda de cartas por nombre exacto usando APIs públicas
- Configuración del collage: columnas, espaciado, color de fondo, badge y borde
- Badges de cantidad sobre cada carta (formas: círculo, diamante, hexágono)
- Descarga del collage como JPG con nombre automático y fecha
- Preview en tiempo real del collage generado
- Progreso visible al procesar listas (`Procesando 4/12...`)
- i18n: interfaz en **Español** 🇨🇱 e **Inglés** 🇺🇸 con selector de bandera
- Idioma persistido en localStorage entre sesiones

## Páginas

| Ruta | Estado | Descripción |
|---|---|---|
| `/` | Completa | Página principal con selector de juego |
| `/collage-magic` | Completa | Generador de collages Magic: The Gathering |
| `/collage-pokemon` | Completa | Generador de collages Pokémon TCG |
| `/help` | Completa | Guía visual de uso con capturas de pantalla |
| `/about` | Completa | Sobre el equipo y agradecimientos a servicios |
| `/database` | En desarrollo | Explorador de cartas |
| `/collection` | En desarrollo | Colección personal |

## Formato de listas

**Magic: The Gathering**
```
1 Lightning Bolt
2 Counterspell
1,"Black Lotus"
```

**Pokémon TCG** — soporta tres formatos:
```
4 Teal Mask Ogerpon ex TWM 25   ← cantidad nombre SET número
4 Applin (SCR-12)                ← cantidad nombre (SET-número)
2 Air Balloon                    ← cantidad nombre (trainers/energías sin set)
```
Los tres formatos se pueden mezclar en la misma lista. El buscador prioriza coincidencia exacta de nombre para evitar falsos positivos (ej. buscar "Dawn" no retorna "Dawn Wings Necrozma-GX"). Los IDs de set se cachean en localStorage para acelerar búsquedas futuras.

## APIs e imágenes

- [Scryfall API](https://scryfall.com/docs/api) — Magic: The Gathering (búsqueda por nombre exacto)
- [Scrydex](https://scrydex.com) — Imágenes de alta calidad de cartas Magic
- [Pokémon TCG API](https://docs.pokemontcg.io/) — Pokémon Trading Card Game (cartas e imágenes)

## Tech Stack

- [Nuxt 4](https://nuxt.com/) — Framework Vue con SSR
- [Vue 3](https://vuejs.org/) — Framework UI
- [Tailwind CSS](https://tailwindcss.com/) — Estilos
- [html-to-image](https://github.com/bubkoo/html-to-image) — Exportación del collage como JPG
- Nitro server routes — Proxy de imágenes para CORS
- [Vercel](https://vercel.com) — Hosting y deploy

## Requisitos

- Node.js (LTS)
- Yarn

## Desarrollo

```bash
# Instalar dependencias
yarn install

# Iniciar servidor de desarrollo
yarn dev

# Construir para producción
yarn build

# Vista previa de producción
yarn preview
```

## Deploy

El proyecto está configurado para desplegarse en **Vercel** en modo SSR. Los server routes (`/api/image-proxy`) se despliegan automáticamente como Vercel Functions.

## Roadmap

### Collage
- [ ] **Tooltip con preview de carta** — Al hacer hover sobre una carta en la lista del deck, mostrar la imagen flotante.
- [ ] **Ordenar cartas en el collage** — Dropdown para ordenar por orden de entrada, nombre A-Z, cantidad descendente, tipo (Magic).
- [ ] **Importar deck desde archivo `.txt`** — Botón para subir un archivo de texto con la lista de cartas.
- [ ] **Exportar deck como `.txt`** — Botón para descargar la lista procesada como archivo de texto.
- [ ] **Soporte >4 copias en Magic** — Lands y básicas pueden ir a 60+ copias.
- [ ] **Exportar collage como PDF** — Grid 3x3 fijo, una página por cada 9 cartas, JPEG 0.80.

### Búsqueda
- [ ] **Buscador de cartas con autocomplete** — Input que busque en Scryfall/Pokémon TCG API mientras escribes.
- [ ] **Filtros: por set, por rareza, por tipo** — Complemento del buscador para refinar resultados.

### Páginas pendientes
- [ ] `/database` — Explorador de cartas con búsqueda, filtros y autocomplete.
- [ ] `/collection` — Colección personal persistida en localStorage o base de datos.
- [ ] **One Piece TCG** — Desbloquear la tarjeta de One Piece cuando haya API disponible.

### UX / Visual
- [ ] **Botón "Limpiar todo"** — Resetear textarea, deck, canvas y status de una vez.
- [ ] **Toast de confirmación al descargar** — Notificación visual al descargar JPG/PDF.
- [ ] **Guardar configuración en localStorage** — Que cols, gap, bg, badgeColor, borderColor, badgeShape persistan entre sesiones.
- [ ] **Skeleton loading en deck list** — Placeholders grises mientras se procesan las cartas.
- [ ] **Mensaje cuando el collage está vacío** — Invitar a pegar una lista cuando no hay cartas cargadas.
- [ ] **Modo claro / oscuro** — Toggle light/dark.

### Mobile
- [ ] **Tabs (Controles / Preview)** — En pantallas <640px, alternar entre controles y preview.
- [ ] **Botones +/- más grandes** — Inputs de columnas y filas más táctiles en móvil.
- [ ] **Web Share API** — Botón "Compartir" que use el share nativo del móvil.

### Técnico / Calidad
- [ ] **Componente `DeckInput`** — Extraer textarea + botón procesar + lista de cartas en componente reutilizable.
- [ ] **Componente `CollageSettings`** — Extraer panel de configuración en componente propio.
- [ ] **Límite de cartas con aviso** — Si el usuario pega 200+ cartas, mostrar un warning antes de procesar.

### Orden recomendado de implementación
1. **[P1] API propia de imágenes** — Crear un server route (`/api/card-images`) que almacene localmente las imágenes de cartas descargadas. Al buscar una carta, ir primero a este cache local antes de consultar las APIs públicas (Scryfall / Pokémon TCG API). Reduciría drásticamente la latencia y el consumo de APIs externas.
2. Guardar configuración en localStorage
2. Botón "Limpiar todo"
3. Tooltip preview de carta
4. Toast de confirmación
5. Importar deck desde `.txt`

## Reportar problemas

Si encuentras algún problema, repórtalo en [GitHub Issues](https://github.com/roberfg/webapp-tcg-nuxt/issues).
