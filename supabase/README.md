# Supabase

Este directorio contiene el esquema reproducible de Mobile Heart.

## Migraciones

Las migraciones deben aplicarse en orden:

1. `20261010000100_initial_schema.sql`: tipos, tablas, relaciones, restricciones, índices y triggers.
2. `20261010000200_security_and_storage.sql`: privilegios, RLS, políticas y bucket privado.
3. `20261010000300_auth_profile_trigger.sql`: creación automática del perfil al registrar un usuario de Auth.
4. `20261010000400_replace_activity_schedules.sql`: guardado transaccional del cronograma semanal del usuario autenticado.
5. `20261010000500_create_study_plan.sql`: creación atómica de borradores de planes y sus bloques Pomodoro.
6. `20261010000600_pomodoro_session_transitions.sql`: inicio, pausa, reanudación, finalización y cancelación atómica de sesiones Pomodoro.
7. `20261010000700_track_plan_progress.sql`: cálculo automático del progreso por actividad y finalización del plan.
8. `20261010000800_session_actual_time.sql`: conservar el tiempo real al cerrar inmediatamente y rechazar reinicios de bloques completados.

9. `20261010000900_phase_8_2_access_controls.sql`: rutas y metadatos de archivos, RPC controladas, transiciones de planes y una sesión activa por usuario.
10. `20261010001000_restrict_activity_file_types.sql`: limita los tipos MIME aceptados por el bucket `activity-files`.

Todavía no se ha enlazado un proyecto remoto ni se han agregado credenciales. Cuando exista un proyecto de Supabase se podrán aplicar mediante Supabase CLI o, de forma controlada, desde el SQL Editor.

## Storage

- Bucket: `activity-files`.
- Acceso: privado.
- Límite por archivo: 10 MB.
- Ruta esperada: `user_id/activity_id/nombre-seguro`.
- Tipos MIME permitidos: PDF, Word, PowerPoint, Excel, texto plano, PNG y JPG. La misma lista se valida en el cliente antes de subir.

## Seguridad

- Las tablas del esquema `public` tienen RLS activado.
- El rol `anon` no recibe permisos sobre los datos privados.
- Las relaciones compuestas incluyen `user_id` para evitar referencias cruzadas entre propietarios.
- `evaluation_answer_keys` no concede acceso al rol `authenticated`.
- Las claves de servicio nunca deben exponerse en el navegador.

## Configuración de Auth

Para el flujo SSR de confirmación por correo:

1. Configura `http://localhost:3000` como Site URL durante el desarrollo local.
2. En la plantilla **Confirm signup**, reemplaza el enlace por:
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
3. Mantén habilitada la confirmación de correo para el entorno real.

Supabase Auth inicia sesión mediante correo y contraseña. El nombre de usuario
y el código estudiantil se almacenan en `public.profiles` y no se usan como
identificadores de autenticación.

## Pruebas

`tests/schema_security.test.sql` valida el inventario básico de seguridad y el
trigger de perfiles. Requiere una instancia local o remota preparada para
ejecutar pruebas pgTAP. `npm run test:rls` ejecuta las diez migraciones y 23 pruebas con dos identidades
en PostgreSQL local mediante PGlite. `npm run test:supabase:live` verifica Auth y
Storage por HTTP al configurar dos cuentas reales de pruebas. Ver
`docs/fase-8-2.md` para las variables y el alcance de cada prueba.

La migración 009 debe ejecutarse con el rol propietario de las tablas. Revoca
escrituras directas del cliente en cronogramas, planes, bloques, sesiones y
progreso. Las RPC verifican `auth.uid()` y propiedad con `search_path` vacío.
Las restricciones nuevas validan los datos existentes y se detienen ante
rutas inválidas o duplicados; no eliminan datos silenciosamente.
