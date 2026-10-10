# Fase 8.2 — Seguridad y validación de acceso

Fecha: 10 de octubre de 2026.

Estado: implementación terminada y verificación local aprobada. La aceptación
contra un proyecto real de Supabase queda pendiente de su configuración y de
dos cuentas de pruebas. No se ha desplegado la aplicación.

## Cambios y evidencia

| Área | Problema encontrado | Corrección | Verificación |
| --- | --- | --- | --- |
| Sesiones de demostración | Cualquier cookie UUID válida habilitaba las rutas privadas. Cerrar sesión no invalidaba el identificador. | Registro de sesiones emitidas por el servidor, vencimiento de ocho horas y revocación al cerrar sesión. Las cookies desconocidas no crean directorios. | Pruebas de utilidades y navegador con cookie inventada, vencida y reutilizada. |
| Configuración de demostración | Un solo indicador podía habilitar autenticación ficticia. | Ambos indicadores deben ser verdaderos; en producción se exige además una excepción explícita. Los componentes reciben el modo desde el servidor. | Prueba de producción sin excepción y pruebas de configuración. |
| Storage | La primera carpeta y el propietario coincidían, pero la actividad de la segunda carpeta podía ser ajena o inexistente. | INSERT/UPDATE comprueban actividad propia y ruta canónica; bucket privado y límite de 10 MB. SELECT/DELETE permiten al propietario limpiar objetos tras eliminar su actividad. | SQL con dos roles y casos de propietario/carpeta/actividad/ruta incorrectos. |
| Metadatos de archivos | Era posible asociar metadatos propios con una ruta arbitraria. | Restricción de ruta `usuario/actividad/nombre` y políticas que exigen un objeto propio existente. | Inserciones y modificaciones con rutas ajenas o sin objeto rechazadas. |
| Subida y borrado de archivos | El borrado confiaba en la ruta enviada por el componente. | Se consulta el registro propio por ID y se usa su ruta almacenada. La subida valida la actividad antes de enviar bytes. | Pruebas de código y Server Action con ID de archivo ajeno. |
| Planes, sesiones y progreso | Los permisos de escritura directa permitían fabricar estados o tiempos propios fuera de las transiciones. | SELECT para el cliente; escrituras mediante RPC con identidad obtenida de `auth.uid()`, referencias calificadas y `search_path` vacío. | Escrituras directas denegadas; flujo de RPC y trigger de progreso aprobado. |
| Sesiones simultáneas | Las comprobaciones de sesiones activas en la aplicación no eran atómicas. | Bloqueo transaccional por usuario, índice de una sesión activa e impedimento de crear o modificar planes mientras exista una. | Rechazos SQL y funcionamiento independiente entre dos identidades. |
| Credenciales públicas | La validación aceptaba claves largas sin distinguir claves privilegiadas. | Solo claves publishable o JWT anon; se rechazan secret/service_role, URL insegura y credenciales incluidas en la URL. Comprobación antes de compilar e iniciar desarrollo. | Pruebas con claves sintéticas y revisión de fuente y bundles del navegador. |

La migración nueva es `20261010000900_phase_8_2_access_controls.sql`.
Las ocho migraciones anteriores se conservan para mantener el historial.
Las acciones de confirmar y reestructurar utilizan ahora `transition_study_plan`.
Las funciones privilegiadas solo ejecutan operaciones del usuario autenticado;
no aceptan un `user_id` del cliente. El cliente tampoco puede crear objetos SQL
en el esquema `public`.

## Pruebas ejecutadas

- `npm run lint`: aprobado.
- `npm run typecheck`: aprobado.
- `npm run build`: aprobado, incluida revisión previa de credenciales.
- `npm run test:integration`: 9 pruebas aprobadas de lógica y validación.
- `npm run test:security`: 9 pruebas aprobadas de sesiones, claves y manejo de archivos.
- `npm run test:rls`: 23 comprobaciones aprobadas sobre las nueve migraciones.
- `npm run test:security:e2e`: 8 comprobaciones aprobadas en Chromium.
- `npm run test:e2e`: recorrido completo aprobado, incluida finalización automática después de un minuto real y sin errores de JavaScript.
- `npm run check:credentials`: sin claves secret/service_role ni claves privadas detectadas en fuente y bundles examinados.

Las pruebas SQL usan PostgreSQL ejecutado mediante PGlite, con roles `anon` y
`authenticated`, RLS y PL/pgSQL reales. El arnés reproduce las tablas auxiliares
mínimas de Auth/Storage y la función `auth.uid()`; aplica los archivos de
migración sin alterar su contenido. Esto valida la autorización SQL y sus
restricciones, pero no reproduce el servicio de autenticación, PostgREST ni la
transferencia HTTP de Storage. Tampoco constituye una prueba de concurrencia
entre conexiones reales; el índice y el bloqueo deben verificarse en Supabase.

La compilación final se realizó con los indicadores DEMO desactivados. El modo
se lee desde un módulo exclusivo del servidor durante la ejecución; no queda
fijado por la sustitución de variables públicas de Next.js.

Las pruebas de navegador usan sesiones de demostración independientes. Prueban
las cuatro rutas privadas, aislamiento de actividades y archivos, invocación
directa de una Server Action, caducidad, revocación y desactivación en producción.
Para producción real se debe compilar con ambos indicadores DEMO en `false`.

La revisión fue directa del código y las pruebas. No se presenta como un escaneo
formal de Codex Security: sus recursos auxiliares no estaban disponibles.
La comprobación de credenciales busca formatos específicos; no garantiza detectar
cualquier tipo de secreto arbitrario.

## Repetir las comprobaciones locales

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:integration
npm.cmd run test:security
npm.cmd run test:rls
npm.cmd run build
npm.cmd run check:credentials
npx.cmd playwright install chromium
npm.cmd run test:security:e2e
npm.cmd run test:e2e
```

Las pruebas de navegador habilitan la excepción de demostración únicamente en
los servidores locales que ellas crean. No hace falta dejar
`ALLOW_DEMO_IN_PRODUCTION=true` en `.env.local`. Utilizan los puertos 3110/3111
y 3100, respectivamente, y cierran sus servidores al finalizar.

## Verificación pendiente en Supabase real

1. Usar un proyecto de pruebas y aplicar las migraciones 001 a 009, en orden,
   con el rol propietario de las tablas (`postgres` en la configuración habitual).
   Si ya se aplicaron 001–008, aplicar solamente 009.
2. La migración 009 valida los registros existentes. Se detendrá si hay rutas
   inválidas, más de una sesión activa por usuario o días duplicados por usuario.
   Revisar y corregir esos registros antes de reintentar; no los elimina ni los
   modifica silenciosamente.
3. Configurar en `.env.local` la URL, una clave publishable/anon y dos cuentas
   de pruebas diferentes, ya registradas y confirmadas:

   ```text
   DEMO_MODE=false
   NEXT_PUBLIC_DEMO_MODE=false
   ALLOW_DEMO_IN_PRODUCTION=false
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   SECURITY_TEST_USER_A_EMAIL=
   SECURITY_TEST_USER_A_PASSWORD=
   SECURITY_TEST_USER_B_EMAIL=
   SECURITY_TEST_USER_B_PASSWORD=
   ```

4. Ejecutar `npm.cmd run check:supabase` y `npm.cmd run test:supabase:live`.
   El arnés inicia sesión en ambas cuentas, crea actividades y archivos aislados,
   prueba accesos cruzados, descarga, URL firmada y una RPC prohibida. Limpia sus
   archivos y actividades al terminar, sin reemplazar cronogramas ni usar claves
   de servicio. Si la limpieza falla, informa el ID de la actividad afectada.
5. Repetir el recorrido general con autenticación real: registro y confirmación
   de correo, cierre de sesión, caducidad, CRUD, subida/borrado, generación,
   confirmación, pausa/reanudación/finalización y consulta de progreso. Probar
   inicios simultáneos y cambios de plan desde dos conexiones de una misma cuenta.
6. El inventario pgTAP de `supabase/tests/schema_security.test.sql` requiere
   un entorno con pgTAP; no se ejecutó en esta sesión.

`test:supabase:live` se intentó en esta sesión y se detuvo antes de conectar por
falta de variables y cuentas. Por ello no se afirma que el proyecto remoto
esté configurado ni que Auth/Storage reales estén validados.

## Referencias técnicas

- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: Database functions](https://supabase.com/docs/guides/database/functions)
- [Supabase: Storage helper functions](https://supabase.com/docs/guides/storage/schema/helper-functions)
- [PostgreSQL: CREATE FUNCTION](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [PGlite: extensiones](https://pglite.dev/extensions/)
