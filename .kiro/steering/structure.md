---
inclusion: always
---
# Structure Steering

## Árbol del proyecto

```
network-map-lite/
├── index.html
├── app.js
├── styles.css
├── tests/
│   └── contact-rules.property.test.js
└── .kiro/
    ├── specs/network-map-lite/
    │   ├── requirements.md
    │   ├── design.md
    │   └── tasks.md
    ├── steering/
    │   ├── product.md
    │   ├── tech.md
    │   └── structure.md
    ├── hooks/
    ├── agents/
    └── settings/
        └── mcp.json
```

## Responsabilidades

- **`index.html`:** contenedor único de la SPA. Carga las CDN (Vue, Tailwind, Dexie, Cytoscape), monta el elemento raíz `#app` e incluye `app.js`.
- **`app.js`:** toda la lógica del cliente. Contiene la instancia Vue, el módulo Dexie, los composables y el wrapper de Cytoscape.
- **`styles.css`:** estilos complementarios que no cubra Tailwind (por ejemplo, ajustes del contenedor del grafo). Mantenerlo mínimo.
- **`tests/`:** pruebas property-based ejecutables con Node. No se sirven al navegador.
- **`.kiro/`:** artefactos de Kiro (specs, steering, hooks, agentes, MCP). No forma parte del runtime de la SPA.

## Convenciones

- Nombres de archivos en minúsculas con kebab-case.
- Funciones y variables en `camelCase`; constantes en `UPPER_SNAKE_CASE`.
- Comentarios solo cuando aclaren intención o reglas de negocio; evitar comentarios obvios.
- Mensajes de error en español, en el idioma de la UI.
- Commits (si se usan) en presente, en español.

## Patrones

- **Estado reactivo centralizado:** un único `state` reactivo con `contacts`, `connections`, `filters` y `selectedContact`. Los componentes leen/escriben sobre él.
- **Acceso a datos encapsulado:** todas las operaciones Dexie viven en funciones nombradas (`addContact`, `updateContact`, `deleteContact`, `addConnection`, `listAll`). Vue nunca llama a Dexie directamente desde las plantillas.
- **Refresco del grafo único:** una sola función `refreshGraph()` es la única responsable de recalcular elementos y estilos del grafo. Cualquier cambio de datos la invoca.
- **Filtros puros:** los filtros son funciones puras sobre la lista de contactos; no mutan estado.

## Ubicación de pruebas

- Todas las pruebas en `tests/`.
- Nombres de archivo: `*.property.test.js` para property-based testing.
- Los tests importan la lógica de reglas (idealmente un pequeño módulo extraíble) y no dependen del DOM.

## Archivos que no deben tocarse

- `.kiro/specs/network-map-lite/*`: son fuente de verdad. Si hay que cambiarlos, se hace explícitamente como nueva tarea, no de forma colateral.
- `.kiro/steering/*`: aplican a todo el proyecto. Cambios requieren decisión explícita.
- `index.html` en su bloque de CDNs: si se cambia la versión de una librería, hacerlo de forma consciente y documentarlo.
