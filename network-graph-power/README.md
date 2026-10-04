# Network Graph Power

## Propósito

Este Power empaqueta el conocimiento necesario para construir y mantener la capa de visualización de red de Network Map Lite: el grafo interactivo con Cytoscape.js y la persistencia local con Dexie.js. Incluye además un servidor MCP (`voidwalker`) para inspeccionar IndexedDB durante el desarrollo.

## Problema que resuelve

Network Map Lite depende de dos librerías con APIs específicas: Cytoscape.js (elementos, layouts, estilos, actualización incremental) y Dexie.js (esquemas, índices compuestos, transacciones). Escribir código correcto para ambas sin documentación a mano consume tiempo y produce errores evitables. Este Power pone esas pautas al alcance del agente en el momento en que se trabaja en el grafo o en la persistencia.

## Requisitos previos

- Kiro IDE con soporte de Powers (v1.0.288 o superior para formato Agent Plugins) .
- Node.js >= 18 (para el MCP `voidwalker` incluido).

## Instalación

**Opción 1: Desde carpeta local**

1. Abrir el panel de Powers en Kiro IDE.
2. Clic en **Add Custom Power**.
3. Seleccionar **Import power from a folder**.
4. Elegir la carpeta `network-graph-power/` (la que contiene `plugin.json`).
5. Clic en **Install**.

**Opción 2: Desde GitHub**

1. Abrir el panel de Powers en Kiro IDE.
2. Clic en **Add Custom Power**.
3. Seleccionar **Import power from GitHub**.
4. Pegar la URL del repositorio.

## Configuración

### MCP incluido: voidwalker

El Power incluye `mcp.json` con el servidor `voidwalker` para inspección de IndexedDB. Al instalar el Power, Kiro administra internamente este servidor .

**Variables de entorno requeridas:**

| Variable | Default | Descripción |
|---|---|---|
| `VOIDWALKER_PORT` | `3695` | Puerto WebSocket/HTTP local |

**Preparación del MCP:**

```powershell
# Instalar el servidor MCP globalmente
npm install -g voidwalker-mcp

# Iniciar el servidor (genera token en ~/.voidwalker/token)
voidwalker-mcp

# Instalar la extensión de navegador Voidwalker (Chrome/Firefox)
# Ver mcp-setup.md del proyecto para pasos detallados
```

La autenticación entre la extensión y el servidor usa un token generado automáticamente en `~/.voidwalker/token` . No incluyas este token en ningún archivo de configuración.

## Skills incluidos

### network-graph-builder

**Propósito:** Guiar la implementación del grafo con Cytoscape.js y la persistencia con Dexie.js.

**Condiciones de activación:** El usuario pide crear, modificar o depurar el grafo; pregunta cómo conectar Cytoscape.js con Vue; necesita definir o ajustar el esquema Dexie; trabaja en `app.js` en funciones relacionadas con `NetworkGraph`.

**Recursos incluidos:**
- `references/cytoscape-patterns.md` — Patrones de Cytoscape.js adaptados al proyecto.
- `references/dexie-schema.md` — Esquema Dexie y operaciones CRUD.

## Ejemplos de uso

**Prompt para generar el grafo:**
> Usa network-graph-builder para crear la función que inicializa el grafo de Network Map Lite con Cytoscape.js.

**Prompt para diagnosticar persistencia:**
> Usa voidwalker para consultar el almacén `contacts` y muéstrame todos los contactos registrados.

## Validación

1. Abrir el panel de Powers en Kiro IDE y confirmar que `network-graph-power` aparece listado.
2. Verificar que el Skill `network-graph-builder` se activa al mencionar términos como "cytoscape", "grafo" o "dexie".
3. Confirmar que el MCP `voidwalker` aparece conectado en el panel de MCP servers.

## Seguridad

- El MCP `voidwalker` usa transporte local (`ws://127.0.0.1:3695`). Ningún dato sale del equipo .
- El token de autenticación se genera localmente y se almacena con permisos restringidos (0600).
- Los valores de claves que coincidan con patrones sensibles (`token`, `auth`, `session`, `jwt`, `password`, `secret`) se redactan automáticamente en las lecturas .

## Limitaciones conocidas

- `voidwalker-mcp` está en desarrollo activo y puede presentar bugs o cambios rotundos .
- La extensión de navegador Voidwalker puede requerir carga manual mientras no esté aprobada en la Chrome Web Store .
- El Power no incluye scripts de escritura ni herramientas destructivas: el MCP queda en modo de solo lectura para las operaciones expuestas.
