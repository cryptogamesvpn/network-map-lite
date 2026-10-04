# Configuración y validación del MCP

## Objetivo dentro del aplicativo

Network Map Lite persiste contactos y conexiones en IndexedDB del navegador mediante Dexie.js. Durante el desarrollo es útil inspeccionar el contenido real de la base de datos sin abrir DevTools manualmente: verificar que los contactos se guardan con el esquema correcto (`contacts` con índice `[name+company]`), comprobar que las conexiones referencian contactos existentes (`connections` con `sourceId`/`targetId`), y diagnosticar por qué un filtro o una consulta no devuelve lo esperado. `voidwalker-mcp` cubre exactamente esa necesidad.

## Servidor seleccionado y razón de la elección

**Servidor:** `voidwalker-mcp` (MCP local, transporte stdio, servidor + extensión de navegador).

**Razón:** Es el único MCP encontrado que expone IndexedDB directamente a agentes de IA sin requerir un backend ni modificar el código del aplicativo. Sus herramientas `query_indexeddb` y `search_indexeddb` permiten leer el almacén de objetos `contacts` y `connections` de Network Map Lite en tiempo real, lo que encaja con el requisito de diagnosticar la capa de persistencia local.

**Alternativa descartada:** Chrome DevTools MCP es más general pero requiere evaluar JavaScript en el contexto de la página, lo que introduce más superficie de permisos y no está especializado en IndexedDB.

## Herramientas que se utilizarán

| Herramienta | Uso en Network Map Lite |
|---|---|
| `query_indexeddb` | Leer todos los registros del almacén `contacts` o `connections` para verificar el estado real tras una operación CRUD. |
| `search_indexeddb` | Buscar registros por patrón de valor (por ejemplo, contactos cuyo nombre coincida con un filtro aplicado). |

Las demás herramientas del servidor (`set_storage`, `delete_storage`, `delete_indexeddb`, `navigate_tab`, `request_snapshot`, `clear_server_state`) están deshabilitadas en la configuración de Kiro para evitar escrituras accidentales durante el desarrollo.

## Prerrequisitos

- Node.js >= 18 instalado.
- Extensión de navegador Voidwalker instalada en Chrome o Firefox.
- Acceso a la pestaña de Network Map Lite abierta en el navegador.

## Instalación desde PowerShell

```powershell
# 1. Verificar Node.js
node --version

# 2. Instalar el servidor MCP globalmente
npm install -g voidwalker-mcp

# 3. Clonar y construir la extensión (necesario mientras la extensión
#    no esté aprobada en la Chrome Web Store)
git clone https://github.com/mohi-devhub/voidwalker
cd voidwalker
npm install
npm run build

# 4. Volver a la raíz del proyecto Network Map Lite
cd ..

# 5. Iniciar el servidor (genera token en ~/.voidwalker/token)
voidwalker-mcp
```

## Configuración externa o web

**Extensión Chrome:**

1. Abrir `chrome://extensions`
2. Activar "Modo de desarrollador" (esquina superior derecha)
3. Clic en "Cargar descomprimida"
4. Seleccionar `voidwalker/packages/extension/dist/`

**Extensión Firefox:**

1. Abrir `about:debugging#/runtime/this-firefox`
2. Clic en "Cargar complemento temporal"
3. Seleccionar `voidwalker/packages/extension/dist-firefox/manifest.json`

**Autenticación de la extensión:**

1. Abrir el archivo `~/.voidwalker/token` y copiar el token generado.
2. Hacer clic en el icono de Voidwalker en la barra de herramientas del navegador.
3. Pegar el token y guardar.
4. El punto de estado debe ponerse verde cuando la conexión con el servidor MCP esté activa.

## Variables de entorno y secretos

El servidor genera automáticamente un token de autenticación de 256 bits en `~/.voidwalker/token` (permisos 0600). Este token se pega manualmente en la extensión del navegador; no debe incluirse en ningún archivo de configuración ni en el repositorio.

Variables opcionales:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `VOIDWALKER_PORT` | `3695` | Puerto WebSocket/HTTP local. |

No se requieren credenciales de servicios externos.

## Activación en Kiro

1. Abrir la paleta con `Ctrl + Shift + P` en Windows/Linux o `Cmd + Shift + P` en macOS.
2. Elegir `Kiro: Open workspace MCP config (JSON)`.
3. Verificar que el archivo `.kiro/settings/mcp.json` contenga la configuración de `voidwalker` (ya generada en el archivo anterior de este punto).
4. Guardar el archivo. Kiro intentará reconectar los servidores automáticamente.
5. Abrir el panel `MCP servers` en Kiro y comprobar que `voidwalker` aparece como conectado.
6. Ante errores, hacer clic derecho en el servidor y usar `Show MCP Logs` para revisar detalles.

## Prueba funcional

1. Abrir Network Map Lite en el navegador (`index.html`).
2. Registrar al menos dos contactos y crear una conexión entre ellos para poblar IndexedDB.
3. En Kiro, ejecutar un prompt como:

   > Usa voidwalker para consultar el almacén `contacts` y muéstrame todos los contactos registrados.

4. Verificar que el resultado devuelve los contactos con sus campos (`name`, `company`, `interest`) tal como se guardaron en la aplicación.

## Resultado esperado

El agente debe poder listar los registros del almacén `contacts` y `connections` de IndexedDB, mostrando los datos reales que Network Map Lite ha persistido. Esto confirma que el MCP está conectado y que el esquema de Dexie está funcionando correctamente.

## Seguridad y permisos

- Todo el tráfico del servidor MCP es local (`ws://127.0.0.1:3695`); ningún dato sale del equipo.
- El token de autenticación se genera localmente y se almacena con permisos restringidos.
- Las herramientas de escritura (`set_storage`, `delete_storage`, `delete_indexeddb`) están deshabilitadas en la configuración de Kiro para este proyecto.
- El servidor redacta automáticamente valores sensibles (claves que coincidan con `token`, `auth`, `session`, `jwt`, `password`, `secret`).

## Solución de problemas

| Problema | Causa probable | Solución |
|---|---|---|
| La extensión no se conecta | Token no pegado o servidor no iniciado | Verificar que `voidwalker-mcp` esté corriendo y que el token en la extensión coincida con `~/.voidwalker/token`. |
| Kiro no ve el servidor | `mcp.json` mal formado o ruta incorrecta | Validar el JSON y confirmar que el archivo está en `.kiro/settings/mcp.json`. |
| No aparecen registros de IndexedDB | Network Map Lite no está abierto en el navegador | Abrir la aplicación y registrar al menos un contacto. |
| Error de conexión en Kiro | Puerto 3695 ocupado | Cambiar `VOIDWALKER_PORT` o detener el proceso que use el puerto. |

## Desinstalación o reversión

1. Detener el servidor `voidwalker-mcp` (cerrar el proceso en la terminal).
2. Desinstalar el paquete global: `npm uninstall -g voidwalker-mcp`.
3. Eliminar la extensión desde `chrome://extensions` o `about:debugging`.
4. Opcionalmente, eliminar el token generado: `Remove-Item ~/.voidwalker/token`.
5. Eliminar la entrada `voidwalker` de `.kiro/settings/mcp.json` si ya no se desea usar.
