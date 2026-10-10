# Mobile Heart

Aplicación web de organización académica, planificación Pomodoro, seguimiento del aprendizaje y bienestar estudiantil.

## Requisitos locales

- Visual Studio Code.
- Node.js 20.9 o superior.
- npm.
- Un proyecto de Supabase cuando se desee habilitar la persistencia.

## Preparación en Visual Studio Code

1. Abrir la carpeta `mobile-heart` en Visual Studio Code.
2. Abrir la terminal integrada.
3. Instalar dependencias:

   ```powershell
   npm install
   ```

4. Crear el archivo local de configuración:

   ```powershell
   Copy-Item .env.example .env.local
   ```

5. Copiar desde el panel **Connect** de Supabase los valores reales de:

   ```text
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   ```

6. Verificar la conexión:

   ```powershell
   npm run check:supabase
   ```

7. Iniciar la aplicación:

   ```powershell
   npm run dev
   ```

8. Abrir `http://localhost:3000`.

## Modo demostración local

Mientras Supabase no esté configurado, se puede recorrer el sistema con datos
ficticios agregando estas variables a `.env.local`:

```text
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
```

Credenciales de demostración:

```text
Correo: demo@mobileheart.local
Contraseña: Demo1234!
```

Los cambios se comparten entre actividades, cronograma, archivos, plan,
sesiones y progreso. Se conservan al navegar y recargar durante la sesión de
demostración (hasta ocho horas). Cerrar sesión revoca el identificador y elimina
el estado local de esa sesión. Las cookies no emitidas por el servidor se rechazan. Cada inicio de sesión crea una demostración
independiente con actividades y cronograma de ejemplo, sin calificaciones ni
porcentajes de avance simulados. Los archivos y el estado se guardan en el
directorio temporal del servidor local. Este almacenamiento no reemplaza Supabase
ni está diseñado para varios servidores o un despliegue en Vercel.

Para volver a Supabase, cambia ambas variables a `false`, completa la URL y clave
pública, aplica las nueve migraciones en orden y reinicia el servidor.

La demostración se desactiva en producción, salvo la excepción explícita
`ALLOW_DEMO_IN_PRODUCTION=true` destinada a pruebas de una compilación local.
Los arneses E2E configuran esa excepción en sus propios servidores.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor local de desarrollo |
| `npm run lint` | Revisión de código |
| `npm run typecheck` | Generar tipos de rutas y verificar TypeScript |
| `npm run test:integration` | Nueve comprobaciones de validación, planificación y sesiones |
| `npm run test:e2e` | Recorrido en Chromium contra la compilación local en modo demostración |
| `npm run test:security` | Sesiones, claves públicas y operaciones de archivos |
| `npm run test:rls` | 23 comprobaciones de aislamiento SQL con dos identidades |
| `npm run test:security:e2e` | Seguridad de rutas y sesiones en Chromium |
| `npm run test:supabase:live` | Auth/Storage reales con dos cuentas de pruebas configuradas |
| `npm run check:credentials` | Buscar claves privilegiadas en fuente y bundles |
| `npm run build` | Compilación local de producción |
| `npm run start` | Ejecutar la compilación generada |
| `npm run check:supabase` | Verificar URL y clave pública de Supabase |

## Base de datos

Las migraciones se encuentran en `supabase/migrations`. Deben aplicarse en el orden indicado en `supabase/README.md` cuando se conecte el proyecto Supabase.

## Seguridad

- `.env.local` está excluido del control de versiones.
- `.env.example` solo contiene nombres de variables, nunca credenciales.
- La clave publicable puede utilizarse en el navegador porque el acceso efectivo está limitado por RLS.
- No se utiliza ninguna clave secreta o `service_role` en esta configuración.

## Estado del despliegue

El proyecto funciona localmente. GitHub remoto y Vercel se configurarán al finalizar el MVP.

## Fase 8.1: integración general

Consulta `docs/fase-8-1.md` para ver la revisión de las fases 1 a 7, las
correcciones de integración y los límites de la verificación.

Para repetir la prueba completa de la demostración desde PowerShell:

```powershell
npm.cmd install
npx.cmd playwright install chromium
# Las pruebas habilitan DEMO únicamente en sus propios servidores locales.
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:integration
npm.cmd run build
npm.cmd run test:e2e
```

La prueba abre su propio servidor en el puerto 3100 y lo cierra al terminar.
Usa una sesión independiente de demostración. Incluye una sesión real de un
minuto para comprobar la finalización automática. No modifica Supabase.

La compilación de producción utiliza PostCSS para procesar Tailwind, igual que
el servidor de desarrollo. No deben entregarse `node_modules`, `.next` o
credenciales como parte del código fuente.

## Fase 8.2: seguridad

Consulta `docs/fase-8-2.md` para las correcciones, resultados y pasos de aceptación
en Supabase real. La migración 009 limita las escrituras de planes, sesiones y
progreso a RPC controladas y refuerza la propiedad de los archivos.
