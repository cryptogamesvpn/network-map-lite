---
inclusion: always
---
# Tech Steering

## Stack y versiones

- **HTML5** como contenedor de la SPA.
- **Vue 3** (build global vía CDN): reactividad y plantillas declarativas. Sin build step.
- **Tailwind CSS** (CDN): estilos utilitarios. Sin compilación.
- **Dexie.js** (CDN): wrapper de IndexedDB para persistencia local.
- **Cytoscape.js** (CDN): renderizado del grafo interactivo de contactos y conexiones.
- **JavaScript ES2020+** en un único `app.js`.

## Dependencias externas

Todas se cargan por CDN estático. No hay `package.json` para la app en sí. Se acepta dependencia de red en tiempo de ejecución para cargar las librerías.

- `vue` (global build)
- `tailwindcss` (CDN de Play o build estático simple)
- `dexie`
- `cytoscape`

## Pruebas

Pruebas property-based sobre las reglas de negocio (no sobre UI):

- Framework propuesto: **fast-check**.
- Runner: **Jest** (o **Vitest**).
- Comando previsto: `npx jest` (o `npx vitest run`).
- Dependencias de desarrollo: `npm install --save-dev fast-check jest`.

Los archivos de test viven en `tests/` y no forman parte del bundle de la SPA: se ejecutan por separado en Node.

## Seguridad

- Sin backend, sin autenticación, sin secretos embebidos.
- Sin llamadas de red salientes (las CDN son recursos estáticos de solo lectura).
- Datos limitados al origen del navegador (same-origin IndexedDB).
- Las credenciales y variables sensibles, si alguna vez aparecen, se referencian con `${VARIABLE}` y nunca se embeben en el código.

## Comandos

- Abrir la app: abrir `index.html` directamente en el navegador.
- Pruebas: `npx jest` (desde la raíz del proyecto, una vez instaladas las devDependencies).

## Restricciones

- No introducir build tooling (Vite, Webpack) para la SPA.
- No introducir frameworks adicionales (React, Svelte, Alpine) ni librerías de UI completas.
- No introducir backend ni servicios remotos.
- No añadir librerías fuera de las listadas salvo aprobación explícita.
- Mantener un único archivo `app.js` como punto de entrada del cliente.

## Integraciones

- **Cytoscape.js ↔ Vue:** el grafo se alimenta desde el estado reactivo; se recrean o actualizan elementos con `cy.elements().remove()` + `cy.add(...)` o `cy.json({elements})` en cada cambio.
- **Dexie ↔ Vue:** las operaciones Dexie se exponen mediante un pequeño módulo y se consumen desde composables Vue. Tras cada operación, el estado reactivo se recarga y se refresca el grafo.
- **Filtros ↔ Cytoscape:** los filtros no eliminan nodos; se aplican estilos de atenuación por selector (clase temporal o `style` por elemento).
