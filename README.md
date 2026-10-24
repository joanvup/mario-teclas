# Tecladoaventura: El Reino de las Teclas

Juego educativo de plataformas para aprender a usar el teclado, pensado para niños y niñas de 6 a 7 años. Tilo, un zorro explorador con una llave mágica, recorre doce mundos para recuperar las teclas del reino y aprender a escribir frases y párrafos.

El juego es 100 % local: no necesita backend, cuentas ni conexión a internet después de descargar el proyecto; se sirve como sitio estático. El arte, los fondos y el audio se generan por código; no se usan recursos de terceros ni personajes de otras franquicias.

## Contenido

- **12 mundos × 4 niveles = 48 niveles**, cada uno con recorrido, objetivos y dificultad propios.
- Movimiento, salto, plataformas móviles, monedas, obstáculos amistosos, banderines, portales y tres corazones indulgentes.
- Retos de teclado con teclado virtual, demostración visual, ayuda y refuerzo positivo.
- **Escritura de frases y párrafos completos** en los mundos 9 a 12, con mayúsculas, tildes, Ñ, comas y puntos.
- Progreso persistente en el navegador, varios perfiles, estrellas, errores por tecla y exportación/importación JSON.
- Menú completo: Jugar, Continuar aventura, Elegir mundo, Mi progreso, Practicar teclado, Configuración y Acerca del juego.
- Tutorial inicial interactivo y taller de Ñ y tildes dentro de **Practicar teclado**.
- Audio sintetizado que se activa tras la primera interacción, con volumen, silencio y reducción de animaciones.
- Diseño responsive con opciones de alto contraste, texto grande, controles táctiles y pistas de teclado.

## Requisitos

- Windows 10 u 11 (también funciona en macOS y Linux).
- Node.js 20.19 o superior (también 22.12 o superior) y npm.
- Chrome, Edge o Firefox actualizados. El navegador debe permitir `localStorage` y Web Audio.

## Instalación y ejecución en Windows

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
npm install
npm run dev
```

Luego abre <http://127.0.0.1:5173/> en el navegador. Para detener el servidor, pulsa `Ctrl + C`.

Si es la primera vez que vas a ejecutar las pruebas de navegador, instala Chromium para Playwright:

```powershell
npx playwright install chromium
```

## Cómo se juega

| Acción | Teclas |
| --- | --- |
| Caminar a la izquierda | `←` o `A` |
| Caminar a la derecha | `→` o `D` |
| Saltar | `Espacio`, `↑` o `W` |
| Pausa | `Esc` o `P` |
| Confirmar en menús | `Enter` |
| Ayuda en un reto de teclas | Botón de ayuda o `H` |
| Ayuda en una frase o párrafo | Botón de ayuda o `F1` |
| Aceptar la frase o párrafo | `Enter` o botón **Comprobar** |
| Borrar un carácter | `Retroceso` |

Las burbujas mágicas piden una tecla, una secuencia, una palabra o, en los mundos altos, una frase o un párrafo completo. La tecla correcta se ilumina en el teclado virtual. Un error solo muestra una pista amable: no se pierden vidas por equivocarse en un reto.

En los retos de escritura se compara el texto completo. Si el niño olvida una tilde, usa minúsculas de más o escribe N en lugar de Ñ, el juego acepta la coincidencia amable y le recuerda practicar esos detalles. La coincidencia exacta recibe un mensaje de celebración distinto.

Las vidas se usan al caer al vacío o al tocar un obstáculo. Al quedar sin corazones, el nivel se reinicia desde el último banderín sin castigos ni tiempos obligatorios.

### Estrellas

Las estrellas valoran el aprendizaje y la precisión, nunca la velocidad:

- **1 estrella**: completar el nivel.
- **2 estrellas**: completar todos los retos y monedas requeridas, con precisión de al menos 70 % (o sin datos de teclado).
- **3 estrellas**: además, precisión de al menos 88 % (o sin datos) y como máximo una ayuda.

Los niveles se pueden repetir libremente para practicar y mejorar.

## Progreso, perfiles y privacidad

El progreso se guarda en el `localStorage` del navegador con la clave `tecladoaventura.save.v1`; la configuración usa `tecladoaventura.settings.v1`. No se envía nada a internet.

- **Mi progreso** muestra niveles completados, estrellas, precisión promedio y las teclas con más errores.
- **Exportar** descarga un archivo JSON del perfil activo.
- **Importar** valida el archivo antes de reemplazar el perfil; los archivos inválidos se rechazan con un mensaje claro.
- **Reiniciar progreso** pide confirmación y conserva la configuración.

El archivo exportado no contiene datos personales. El progreso no se sincroniza entre equipos automáticamente.

## Pruebas

Todas las pruebas se ejecutan de verdad; no hay resultados simulados.

```powershell
npm run test         # pruebas unitarias con Vitest
npm run test:levels  # estructura y alcanzabilidad de los 48 niveles
npm run test:e2e     # recorrido real en Chromium con Playwright
npm run build        # compilación de producción
npm run test:build   # prueba del sitio compilado en http://127.0.0.1:4173/
```

Para ejecutar todo de una vez, usa `npm run test:all`. La variante rápida `npm run validate` omite solo la suite E2E.

Con el servidor de desarrollo activo, `node scripts/visual-review.mjs` guarda capturas de varios mundos, del taller y de una pantalla móvil en `artifacts/visual-review/`.

Resultados verificados el 23 de octubre de 2026:

| Comando | Resultado |
| --- | --- |
| `npm run test` | 6 archivos, 59 pruebas aprobadas |
| `npm run test:levels` | 48/48 niveles válidos, deterministas y con saltos alcanzables |
| `npm run test:e2e` | 45 pruebas aprobadas en 9 archivos |
| `npm run build` | compilación correcta |
| `npm run test:build` | 2 pruebas aprobadas sobre el build de producción |

La suite E2E comprueba, entre otras cosas:

- Portada, menú, tutorial y selección de mundos.
- Controles, física, plataformas móviles, obstáculos, monedas, banderines y victoria.
- Retos con teclado físico, teclado virtual, secuencias, palabras y la Ñ en una distribución US.
- Escritura de frases y párrafos con coincidencia exacta y amable, Retroceso, Enter, ayuda y botones de comprobación y borrado.
- Pausa, reanudación, reinicio y salida segura.
- Guardado, recarga, perfiles, exportación, importación válida e inválida y reinicio con confirmación.
- Preferencias, distribución, modo de aprendizaje, controles táctiles y diseño en pantallas pequeñas.
- Los 48 niveles se inician, sus retos se resuelven con teclado real y la victoria otorga 144 estrellas y el final de la aventura.
- Las frases y párrafos aceptan coincidencia exacta y amable, Retroceso, Enter, el teclado virtual y los botones de ayuda y comprobación.
- El sitio compilado carga sin errores de consola, sirve sus recursos y permite jugar un nivel completo.

## Compilación y despliegue

```powershell
npm run build
npm run preview
```

`npm run build` genera la carpeta `dist/`. Para publicarlo, sube **el contenido de `dist/`** a cualquier alojamiento estático (GitHub Pages, Netlify, Cloudflare Pages, IIS, un servidor Apache o una carpeta compartida con un servidor estático).

La configuración usa `base: './'`, así que el juego funciona tanto en la raíz del dominio como en una subcarpeta. Abrir `dist/index.html` directamente con doble clic puede fallar por las restricciones de módulos de los navegadores; usa `npm run preview` o un servidor estático local.

## Arquitectura

```text
.
├─ index.html
├─ package.json
├─ vite.config.js
├─ playwright.config.js          # pruebas E2E contra el servidor de desarrollo
├─ playwright.build.config.js    # pruebas contra el build de producción
├─ scripts/
│  ├─ completion-harness.mjs     # validación de los 48 niveles
│  └─ visual-review.mjs          # capturas para revisión visual manual
├─ src/
│  ├─ main.js                    # arranque y API de apoyo para pruebas
│  ├─ config/appConfig.js        # nombre, física, estrellas y textos globales
│  ├─ levels/levels.js           # datos de los 48 niveles
│  ├─ worlds/worlds.js           # temas visuales y educativos de los 12 mundos
│  ├─ game/
│  │  ├─ game.js                 # bucle, física, colisiones, retos y victoria
│  │  ├─ levelBuilder.js         # generación determinista y validación de saltos
│  │  ├─ renderer.js             # dibujo en Canvas 2D
│  │  └─ backgrounds.js          # fondos parallax procedurales
│  ├─ input/
│  │  ├─ keyboardManager.js      # event.code y event.key
│  │  ├─ layouts.js              # distribuciones latam, ES y US
│  │  └─ paragraph.js            # normalización y comparación de frases y párrafos
│  ├─ education/evaluator.js     # precisión, ayuda y estrellas
│  ├─ progress/
│  │  ├─ storage.js              # perfiles, desbloqueos y persistencia
│  │  └─ validate.js             # validación de importaciones y ajustes
│  ├─ audio/audioEngine.js       # sonido sintetizado con Web Audio
│  ├─ ui/
│  │  ├─ ui.js                   # pantallas, HUD, tutorial y taller
│  │  ├─ virtualKeyboard.js      # teclado virtual reutilizable
│  │  └─ art.js                  # ilustración SVG original de Tilo
│  └─ styles/                    # CSS modular y responsive
└─ tests/
   ├─ unit/                      # Vitest
   ├─ e2e/                       # Playwright
   └─ build/                     # Playwright sobre dist/
```

El motor es propio, sobre Canvas 2D y sin frameworks de juego. Los niveles se describen como datos y se transforman en recorridos mediante una semilla determinista.

## Añadir o modificar niveles

Los niveles viven en `src/levels/levels.js`. Cada entrada sigue este formato:

```js
{
  id: 'w9l1',              // único; por convención w<mundos>l<nivel>
  world: 9,                // id del mundo en src/worlds/worlds.js
  index: 1,                // 1 a 4
  name: 'Nombre del nivel',
  skill: 'Habilidad que enseña',
  intro: 'Instrucción breve para el niño.',
  objective: 'Objetivo visible en la pantalla de inicio.',
  seed: 9901,              // cambia el recorrido generado
  length: 3000,            // longitud aproximada en píxeles
  gap: [90, 120],          // hueco mínimo y máximo entre plataformas
  elevation: [0, 50],      // desnivel máximo hacia arriba
  moving: 2,               // plataformas móviles deseadas
  obstacles: 2,            // obstáculos amistosos deseados
  coins: 12,
  requiredCoins: 6,
  checkpoints: 2,
  phases: 1,
  demoKeys: ['ArrowRight', 'Space', 'KeyA'],
  gates: [
    gate('A', { at: 0.3 }),
    gate(['S', 'O', 'L'], { at: 0.6 }),
    gate(word('LUNA'), { at: 0.85 }),
    paragraph('Tilo escribe una frase. La ciudad despierta.'), // mundos 9–12
  ],
  extraChallenge: 'Reto adicional para la pantalla de victoria.',
}
```

Notas sobre los retos:

- `gate('A')` pide una tecla; `gate(['S', 'O', 'L'])` pide una secuencia; `gate(word('LUNA'))` pide una palabra y la muestra completa.
- `paragraph('Texto…')` pide escribir una frase o un párrafo completo. Conserva `keys` con cada carácter para las validaciones del arnés; el juego usa el texto para comparar mayúsculas, tildes, Ñ, comas, puntos y espacios.
- Los párrafos se clasifican como frase o párrafo según su longitud (más de 60 caracteres); conviene usar al menos dos frases en los niveles del mundo 12.
- `at` es la fracción del recorrido (0 a 1) donde aparece la burbuja.
- Las claves de `demoKeys` son códigos físicos: `ArrowRight`, `Space`, `Enter`, `Backspace`, `KeyA`, `Digit1`, `KeyÑ`.
- Para la Ñ se acepta la posición física `Semicolon`, de modo que un teclado US no bloquea el avance.
- Las tildes se practican en el taller de **Practicar teclado** y en las frases y párrafos de los mundos 9 a 12. El motor acepta `Á É Í Ó Ú` mediante `event.key` y composición, y también la escritura sin tilde como coincidencia amable.

Después de editar:

1. Ejecuta `npm run test:levels` para comprobar estructura, determinismo, retos y saltos alcanzables.
2. Ejecuta `npm run test` para las pruebas unitarias.
3. Ejecuta `npm run test:e2e` si cambiaste interacción o interfaz.

El generador limita los huecos y desniveles según la física del jugador, y `checkReachability` rechaza cualquier salto imposible, incluso con plataformas móviles. Si añades un mundo nuevo, actualiza también `src/worlds/worlds.js`, los fondos de `src/game/backgrounds.js` y la comprobación de cobertura del arnés de niveles.

## Accesibilidad y configuración

- Distribuciones latinoamericana (ISO), España (ISO) y US.
- Modo de aprendizaje por **carácter** (`event.key`) o por **posición física** (`event.code`).
- Alto contraste, texto grande, reducción de animaciones y controles táctiles.
- Pistas visuales en el teclado virtual y ayuda con la tecla correcta.
- Mensajes amables, sin castigos severos ni tiempos límite obligatorios.
- Audio desactivado hasta la primera interacción del usuario; volumen y silencio ajustables.

## Originalidad y créditos

Tilo, el Reino de las Teclas, los textos, los fondos, las ilustraciones SVG y los sonidos son originales de este proyecto. No se usan nombres, personajes, música ni recursos de Nintendo ni de otras franquicias.

## Limitaciones conocidas

- El progreso es local al navegador y al equipo; no hay cuentas ni sincronización en la nube.
- Borrar los datos del navegador elimina el progreso si no se exportó antes.
- La reproducción de audio depende de las políticas del navegador; se activa tras la primera interacción.
- La suite E2E usa Chromium. La compatibilidad con Chrome, Edge y Firefox se comprueba manualmente y mediante el uso de APIs estándar.
