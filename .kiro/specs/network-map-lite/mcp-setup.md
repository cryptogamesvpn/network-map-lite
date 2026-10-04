# Configuración y validación del MCP

## Objetivo dentro del aplicativo

Network Map Lite persiste contactos y conexiones en IndexedDB del navegador mediante Dexie.js (almacenes `contacts` y `connections`, versión 1 del esquema). Durante el desarrollo es necesario inspeccionar el contenido real de la base de datos sin abrir DevTools manualmente: verificar que los contactos se guardan con el esquema correcto (`contacts` con índice compuesto `[name+company]`), comprobar que las conexiones referencian contactos existentes (`sourceId`/`targetId`), y diagnosticar por qué una consulta de filtro o una operación de cascada no produce el resultado esperado.

El servidor MCP `voidwalker-mcp` cubre exactamente esa necesidad: expone IndexedDB directamente a Kiro sin requerir un backend ni modificar el código del aplicativo.

## Servidor seleccionado y razón de la elección

**Servidor:** `voidwalker-mcp` (MCP local, transporte `stdio`, arquitectura servidor Node.js + extensión de navegador).

**Razón:** Es el único servidor MCP encontrado que expone IndexedDB directamente a agentes de IA sin requerir un backend, sin modificar el código del aplicativo y sin necesitar un servidor de desarrollo corriendo. Sus herramientas `query_indexeddb` y `search_indexeddb` permiten leer los almacenes `contacts` y `connections` de Network Map Lite en tiempo real, lo que encaja con el requisito de diagnosticar la capa de persistencia local (Req 6.1).

**Alternativa descartada:** `chrome-devtools-mcp` — más general pero requiere evaluar JavaScript arbitrario en el contexto de la página, lo que introduce más superficie de permisos y no está especializado en IndexedDB.

## Herramientas que se utilizarán

| Herramienta | Estado en Kiro | Uso en Network Map Lite |
|---|---|---|
| `query_indexeddb` | `autoApprove` | Leer todos los registros de `contacts` o `connections` para verificar el estado real tras una operación CRUD |
| `search_indexeddb` | `autoApprove` | Buscar registros por patrón de valor (ej. contactos cuyo nombre coincida con un filtro activo) |
| `set_storage` | `disabledTools` | No necesario — la app gestiona escrituras a través de Dexie |
| `delete_storage` | `disabledTools` | No necesario — riesgo de borrado accidental durante diagnóstico |
| `delete_indexeddb` | `disabledTools` | No necesario — operación destructiva irreversible |
| `navigate_tab` | `disabledTools` | Fuera del alcance del MVP |
| `request_snapshot` | `disabledTools` | Fuera del alcance del MVP |
| `clear_server_state` | `disabledTools` | Fuera del alcance del MVP |

## Prerrequisitos

- Node.js >= 18 instalado y accesible desde PowerShell (`node --version`).
- npm >= 9 (`npm --version`).
- Kiro IDE con soporte de MCP (v1.0.288 o superior).
- Navegador Chrome o Firefox con la extensión Voidwalker instalada.
- Network Map Lite abierto en el navegador con al menos un contacto registrado.

## Instalación desde PowerShell

```powershell
# 1. Verificar versión de Node.js (debe ser >= 18)
node --version

# 2. Instalar el servidor MCP globalmente
npm install -g voidwalker-mcp

# 3. Verificar que el ejecutable quedó disponible en PATH
voidwalker-mcp --version

# 4. Iniciar el servidor por primera vez
#    Genera el token de autenticación en $HOME\.voidwalker\token
voidwalker-mcp

# 5. Leer el token generado (para pegarlo en la extensión del navegador)
Get-Content "$HOME\.voidwalker\token"
```

> **Nota:** el paso 4 mantiene el proceso corriendo. Abrir una terminal separada para los pasos siguientes o usar `Start-Job { voidwalker-mcp }` si se prefiere ejecutarlo en segundo plano.

## Configuración externa o web

### Extensión Chrome

```
1. Abrir chrome://extensions en el navegador
2. Activar "Modo de desarrollador" (esquina superior derecha)
3. Clic en "Cargar descomprimida"
4. Seleccionar la carpeta dist/ de la extensión Voidwalker
   (ver README-mcp.md §Instalación para pasos de build desde fuente)
```

### Extensión Firefox

```
1. Abrir about:debugging#/runtime/this-firefox
2. Clic en "Cargar complemento temporal"
3. Seleccionar voidwalker/packages/extension/dist-firefox/manifest.json
```

### Autenticación de la extensión

```
1. Copiar el token desde $HOME\.voidwalker\token
2. Hacer clic en el icono de Voidwalker en la barra de herramientas del navegador
3. Pegar el token y guardar
4. El indicador de estado debe ponerse verde cuando la conexión esté activa
```

## Variables de entorno y secretos

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `VOIDWALKER_PORT` | `3695` | Puerto WebSocket/HTTP local del servidor |

El token de autenticación se genera automáticamente en `$HOME\.voidwalker\token` con permisos restringidos. **No incluir este token en ningún archivo de configuración ni en el repositorio.**

La variable `VOIDWALKER_PORT` se referencia como `${VOIDWALKER_PORT}` en `network-graph-power/mcp.json` y como valor literal `"3695"` en `.kiro/settings/mcp.json`.

## Activación en Kiro

```
1. Abrir la paleta de comandos: Ctrl + Shift + P (Windows/Linux)
2. Ejecutar: Kiro: Open workspace MCP config (JSON)
3. Verificar que .kiro/settings/mcp.json contiene la entrada "voidwalker"
4. Guardar el archivo — Kiro reconecta los servidores automáticamente
5. Abrir el panel "MCP servers" en Kiro
6. Confirmar que "voidwalker" aparece con estado "Connected"
```

El archivo `.kiro/settings/mcp.json` ya está configurado en este proyecto con las herramientas correctas en `autoApprove` y `disabledTools`.

## Prueba funcional

```
1. Abrir Network Map Lite en el navegador (abrir index.html)
2. Registrar al menos dos contactos y crear una conexión entre ellos
3. En Kiro, ejecutar el siguiente prompt:

   "Usa voidwalker para consultar el almacén contacts de la base de datos
    network-map-lite y muéstrame todos los contactos registrados."

4. Verificar que el resultado incluye los contactos con sus campos
   (name, company, interest) tal como se guardaron en la aplicación
```

## Resultado esperado

El agente debe listar los registros del almacén `contacts` mostrando:
- `id` (número autoincremental)
- `name` (string, trimmed)
- `company` (string, trimmed)
- `interest` (string, puede ser vacío)

Y los del almacén `connections` mostrando:
- `id`
- `sourceId` y `targetId` (números que referencian `contacts.id` existentes)
- `reason` (string, puede ser vacío)

Esto confirma que el MCP está conectado y que el esquema Dexie v1 está funcionando correctamente.

## Seguridad y permisos

- Todo el tráfico del servidor MCP es local (`ws://127.0.0.1:3695`). Ningún dato sale del equipo.
- El token de autenticación se genera localmente y se almacena con permisos de solo lectura para el usuario actual.
- Las herramientas de escritura (`set_storage`, `delete_storage`, `delete_indexeddb`) están deshabilitadas en `.kiro/settings/mcp.json` para evitar modificaciones accidentales a los datos del aplicativo.
- `voidwalker-mcp` redacta automáticamente los valores de claves que coincidan con patrones sensibles (`token`, `auth`, `session`, `jwt`, `password`, `secret`) en las respuestas al agente.
- El Power `network-graph-power` no incluye herramientas de escritura en su `mcp.json`.

## Solución de problemas

| Problema | Causa probable | Solución |
|---|---|---|
| `voidwalker-mcp: command not found` | Instalación global no en PATH | Ejecutar `npm install -g voidwalker-mcp` y reiniciar la terminal |
| La extensión no conecta (indicador rojo) | Servidor no iniciado o token incorrecto | Verificar que `voidwalker-mcp` está corriendo; copiar token fresco de `$HOME\.voidwalker\token` |
| Kiro muestra el servidor como "Disconnected" | `mcp.json` mal formado o servidor no iniciado | Validar el JSON en `.kiro/settings/mcp.json`; iniciar `voidwalker-mcp` |
| No aparecen registros en la consulta | Network Map Lite no está abierto en el navegador | Abrir `index.html` en el navegador y registrar al menos un contacto |
| Puerto 3695 en uso | Otro proceso ocupa el puerto | Cambiar `VOIDWALKER_PORT` en `.kiro/settings/mcp.json` y reiniciar el servidor |
| Error `access denied` al leer el token | Permisos de archivo | Ejecutar `voidwalker-mcp` una vez para regenerar el token con permisos correctos |

## Desinstalación o reversión

```powershell
# 1. Detener el servidor si está corriendo
#    (cerrar la terminal o terminar el proceso)

# 2. Desinstalar el paquete global
npm uninstall -g voidwalker-mcp

# 3. Eliminar el token generado
Remove-Item -Path "$HOME\.voidwalker\token" -ErrorAction SilentlyContinue
Remove-Item -Path "$HOME\.voidwalker" -Recurse -ErrorAction SilentlyContinue

# 4. Desinstalar la extensión del navegador
#    Chrome: chrome://extensions → buscar Voidwalker → Eliminar
#    Firefox: about:addons → buscar Voidwalker → Eliminar

# 5. Eliminar la entrada del servidor en la configuración de Kiro
#    Abrir .kiro/settings/mcp.json y eliminar el bloque "voidwalker"
```
