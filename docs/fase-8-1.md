# Mobile Heart — revisión e integración de la fase 8.1

Fecha: 10 de octubre de 2026.
Fuentes: código de `mobile-heart.rar` y documento de fases adjunto.

## Resultado de la revisión de las fases 1 a 7

Los módulos están presentes. Esto no equivale a afirmar que todos los requisitos
estén terminados o validados en un entorno real. El proyecto adjunto tenía
únicamente `DEMO_MODE=true` y `NEXT_PUBLIC_DEMO_MODE=true`; no incluía la URL ni
la clave pública de Supabase. El README también indica que no se ha enlazado
Supabase y que GitHub/Vercel se configurarán posteriormente.

**Código presente** significa que se encontró implementación. **Probado localmente**
significa que se ejecutó la demostración o la lógica correspondiente.
**Pendiente de entorno real** significa que no se pudo comprobar Supabase,
Storage, correo de confirmación o producción.

| Fase | Evidencia encontrada | Verificación y pendientes |
| --- | --- | --- |
| 1.1 Proyecto | Next.js App Router, TypeScript, Tailwind, shadcn/ui, Lucide y scripts en `package.json`. | Compilación y TypeScript comprobados. Se corrigió Tailwind en producción mediante PostCSS. |
| 1.2 Arquitectura | Grupos `(auth)` y `(private)`, layouts, navegación, componentes y carpetas `features`. | Rutas privadas y navegación comprobadas en demostración. |
| 1.3 Modelo de datos | Migraciones 001–007 con tablas, relaciones, restricciones, índices, RLS y Storage. | Código presente; aplicación del esquema y aislamiento con usuarios reales pendientes. |
| 1.4 Entornos | Clientes Supabase de servidor/navegador, `.env.example`, instalación documentada. | Conexión real, remoto de GitHub y despliegue inicial en Vercel pendientes. |
| 2.1 Acceso | Formulario, esquemas de validación, errores y enlace al registro. | Inicio de sesión de demostración probado. |
| 2.2 Registro | Formulario y `signUp`; trigger SQL para crear perfiles desde Auth. | Registro real, confirmación por correo y creación del perfil pendientes de Supabase. El registro demo no crea una cuenta real. |
| 2.3 Sesiones | Cookies, proxy, layout privado, cierre y redirección a actividades. | Acceso privado y cierre probados en demo. Auth/RLS de Supabase pendientes. |
| 3.1 Actividades | Título, categoría, fecha, horas y prioridad con Zod y React Hook Form. | Creación desde navegador y validaciones de horarios/categoría/prioridad comprobadas. |
| 3.2 CRUD | Acciones de creación, edición y eliminación con filtros por propietario. | Creación y persistencia entre ventanas/recargas comprobadas en demo. Acciones de edición/eliminación revisadas en código. CRUD real pendiente. |
| 3.3 Calendario | Formulario y calendario, navegación de fechas y colores por categoría. | Representación conectada con actividades; no se realizó una auditoría exhaustiva de todos los periodos o dispositivos. |
| 3.4 Prioridad/vista previa | Prioridades, vista previa y acceso al cronograma. | Código presente y prioridad guardada. La prioridad todavía no determina el orden del motor. |
| 4.1 Tabla semanal | Siete días, una actividad por día, selección y RPC transaccional. | Guardado y uso por el planificador comprobados en demo. No admite varias actividades en un mismo día desde esta interfaz. |
| 4.2 Tiempos y alertas | Minutos y preferencias de aviso previo/final almacenados. | Configuración presente; no existe un servicio que emita notificaciones del cronograma. |
| 4.3 Archivos | Storage privado, metadatos, relación con propietario/actividad y límite de 10 MB. | Archivo de 2 MB conservado en demo. Bucket, políticas y bytes en Supabase pendientes de entorno real. |
| 4.4 Preparación | Validación de días/tiempo, carga opcional y botón Diseñar plan bloqueado con cambios sin guardar. | Paso cronograma → plan comprobado. |
| 5.1 Motor | Algoritmo TypeScript que usa actividades, días y minutos; genera estudio y descanso. | Minutos y secuencia básica comprobados. No utiliza la prioridad ni resuelve de forma general conflictos entre varias actividades superpuestas. |
| 5.2 Estructura | Tipos y representación para estudio, descanso, repaso, pruebas y análisis. | El generador actual solo crea `study` y `break`; repaso, pruebas y análisis no tienen generación efectiva. |
| 5.3 Confirmación | Revisión, confirmación y persistencia por RPC/tabla. | Generación desde datos guardados y confirmación comprobadas en demo. Escrituras reales pendientes. |
| 5.4 Reestructuración | Cambio de estado, retorno al cronograma y conservación de configuración. | Código presente. Se impide reestructurar o generar mientras haya una sesión activa en el flujo normal. |
| 6.1 Temporizador | Inicio, pausa, reanudación, finalización y cancelación. | Flujo de navegador y pruebas de transiciones; finalización automática comprobada. |
| 6.2 Tiempo | Sesiones y marcas de tiempo en SQL; recuperación y separación estudio/descanso. | Recuperación tras recarga probada en demo. Migración 008 corrige el cierre inmediato que antes atribuía todo el tiempo planificado. SQL real pendiente de ejecutar. |
| 6.3 Cumplimiento | Estados de bloques, trigger de progreso y finalización del plan. | Bloque terminado → actividad al 100 % → progreso comprobado en demo. Trigger real pendiente. |
| 7.1 Actividades | Tarjetas con nombre, estado y porcentaje. | Cumplimiento al 100 % desde sesión ejecutada, con y sin archivo. |
| 7.2 Indicadores | Completadas, pendientes, Pomodoros, tiempo planificado/real, categorías y tendencia semanal. | Los indicadores demo ahora usan registros ejecutados. El resumen real usa los bloques del plan más reciente para evitar porcentajes heredados de un plan anterior. |
| 7.3 Escala | 0–11, 12–15 y 16–20; estructura de evaluaciones y lectura de notas existentes. | Límites de clasificación comprobados. No se generan exámenes o notas de IA; corresponden a la fase 10. |
| 7.4 Bienestar | Recomendaciones, recursos institucionales configurables y canales profesionales; aviso de herramienta de apoyo. | Código y representación presentes. URL institucional específica pendiente si se desea un acceso directo a la UCV. |

**Conclusión:** las fases 1 a 7 tienen una base implementada, pero no están
completas al 100 %. La configuración externa y las funciones señaladas en las
filas 4.2, 5.1 y 5.2 siguen pendientes. Esta entrega desarrolla la integración 8.1
sin declarar terminadas las fases 8.2–8.4, 9 o 10.

## Cambios de la fase 8.1

1. Una sesión de demostración independiente comparte actividades, cronograma,
   archivos, plan, bloques y sesiones entre todas las ventanas.
2. El estado se conserva al navegar y recargar en el servidor local. Antes,
   cada pantalla reconstruía datos fijos y descartaba las modificaciones.
3. Diseñar plan utiliza el cronograma guardado; abrir `/plan` ya no fabrica un
   plan a partir de constantes ni revierte automáticamente la confirmación.
4. El archivo opcional se guarda con sus bytes y metadatos en el modo local.
   El límite de Server Actions admite el archivo de 10 MB con margen para el
   formulario. El flujo real continúa usando Supabase Storage.
5. Las sesiones demo usan marcas de tiempo de servidor para pausar, reanudar,
   recuperar, cancelar y completar. El navegador calcula el tiempo restante a
   partir de esas marcas, incluso si la pestaña deja de actualizarse brevemente.
6. La finalización automática se registra antes de mostrarla como completada.
   Si falla, se muestra un error y se permite reintentar, sin aumentar el avance.
7. El progreso se calcula a partir de bloques y sesiones; se eliminaron los
   porcentajes, Pomodoros y minutos demo fijos.
8. Se invalidan las rutas dependientes después de modificar actividades,
   archivos, plan o sesiones. Se añadió Consultar progreso al temporizador.
9. Se bloquean nuevos planes y reestructuraciones durante una sesión activa en
   el flujo de aplicación para no perder el acceso a dicha sesión.
10. PostCSS procesa Tailwind en desarrollo y compilación de producción. Antes,
    `next build --webpack` dejaba directivas sin procesar y sin utilidades CSS.
11. Se añadió la migración 008 para conservar tiempo real al completar
    inmediatamente y evitar reiniciar un bloque completado en Supabase.

## Pruebas ejecutadas

| Prueba | Resultado |
| --- | --- |
| `npm run lint` | Sin errores ni advertencias. |
| `npm run typecheck` | Tipos de rutas generados y TypeScript válido. |
| `npm run test:integration` | 9 de 9 comprobaciones aprobadas. |
| `npm run build` | Compilación de producción completada. |
| `npm run test:e2e` | Recorrido de 8 pasos aprobado en Chromium sobre la compilación de producción en modo demo. |

Las nueve comprobaciones cubren validaciones, tiempos del plan, referencias a
actividades, pausa/recarga/reanudación, tiempo real en finalización inmediata,
bloques ya completados, sesión única en demo, cancelación/reinicio, cierre del
plan y límites de la escala.

La prueba de navegador cubre:

- Redirección de una ruta privada al login y acceso con credenciales demo.
- Actividad creada y recuperada después de recargar.
- Día y tiempo guardados usando esa nueva actividad.
- Archivo opcional de 2 MB guardado y recuperado al recargar.
- Generación de un plan y confirmación.
- Inicio, pausa, recarga, reanudación y finalización manual.
- Consulta del progreso y comprobación del 100 % de la actividad.
- CSS de producción aplicado.
- Eliminación del archivo y segunda ejecución sin material adjunto.
- Finalización automática de una sesión real de un minuto y progreso actualizado.
- Cierre de sesión y protección de la ruta Progreso.
- Ausencia de errores JavaScript durante el recorrido.

## Cómo utilizar esta entrega

Extrae el ZIP en una carpeta nueva y abre `mobile-heart` en Visual Studio Code.
Desde PowerShell:

```powershell
npm.cmd install
Copy-Item .env.example .env.local
```

Para la demostración, edita `.env.local` y establece:

```text
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
```

Luego:

```powershell
npm.cmd run dev
```

Acceso: `http://localhost:3000`. Correo `demo@mobileheart.local`, contraseña
`Demo1234!`. Se inicia con actividades y cronograma de ejemplo, pero sin archivos,
planes, sesiones ejecutadas, notas ni porcentajes de progreso inventados.
Los cambios se conservan durante la sesión demo, hasta ocho horas. Cerrar sesión
e iniciar otra crea una demostración nueva. Los datos temporales no son un
historial permanente ni un almacenamiento para Vercel.

Para repetir la prueba de navegador:

```powershell
npx.cmd playwright install chromium
npm.cmd run build
npm.cmd run test:e2e
```

Las variables DEMO deben estar activas **antes de compilar**. El script abre y
cierra un servidor propio en el puerto 3100. La prueba dura más de un minuto
porque espera una sesión completa con tiempo real.

Para Supabase, desactiva ambas variables DEMO, completa la URL y clave pública,
aplica las migraciones 001–008 en orden y utiliza `npm.cmd run check:supabase`.
La migración 008 se entrega preparada; no se aplicó a ninguna base real.

## Límites de la verificación

No se han probado ni declarado aprobados el registro real, el correo de
confirmación, las RPC sobre PostgreSQL, RLS entre dos cuentas, Storage remoto,
la recuperación del temporizador en Supabase ni Vercel. Tampoco se han aplicado
migraciones a servidores externos. Estas comprobaciones requieren el entorno
Supabase y corresponden a las fases 8.2, 8.3 y 8.4.

La demostración usa archivos temporales en un único servidor local y escrituras
secuenciales dentro de ese proceso. No debe confundirse con persistencia
transaccional distribuida. El código de conexión con Supabase se conserva como
ruta de funcionamiento real. Las verificaciones de concurrencia y aislamiento
en esa ruta siguen pendientes.
