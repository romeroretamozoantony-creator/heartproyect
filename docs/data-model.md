# Modelo de datos

## Entidades

| Tabla | Propósito |
| --- | --- |
| `profiles` | Datos mínimos del estudiante vinculados con `auth.users` |
| `activities` | Actividades académicas, laborales y personales |
| `activity_schedules` | Días, tiempo asignado y alertas por actividad |
| `uploaded_files` | Metadatos de documentos almacenados en Storage |
| `study_plans` | Planes generados y su estado |
| `plan_blocks` | Estudio, descanso, repaso, prueba y análisis |
| `pomodoro_sessions` | Estado recuperable y tiempo real de las sesiones |
| `activity_progress` | Cumplimiento porcentual de cada actividad |
| `evaluations` | Estado y calificación de una evaluación |
| `evaluation_questions` | Preguntas visibles para el estudiante |
| `evaluation_answer_keys` | Respuestas correctas, disponibles solo para backend |
| `evaluation_responses` | Respuestas entregadas por el estudiante |

## Relaciones principales

- Un usuario tiene un perfil y puede tener muchas actividades.
- Una actividad puede configurarse en varios días de la semana.
- Una actividad puede tener archivos privados.
- Un usuario puede confirmar varios planes de estudio.
- Un plan contiene bloques ordenados.
- Un bloque puede registrar una sesión Pomodoro recuperable.
- Una actividad tiene un registro de progreso.
- Un archivo puede originar una evaluación.
- Una evaluación contiene preguntas, claves privadas y respuestas del estudiante.

## Decisiones de integridad

- Todos los datos privados incluyen el identificador del propietario.
- Las claves foráneas compuestas impiden relacionar registros de usuarios diferentes.
- Las actividades exigen una fecha y un intervalo horario válido.
- Los porcentajes se restringen entre 0 y 100.
- Las calificaciones se restringen entre 0 y 20.
- La escala de presentación será: 0–11 necesita refuerzo, 12–15 satisfactorio y 16–20 destacado.
- El tiempo de concentración y descanso se distingue mediante `session_type`.
- Las claves correctas de las evaluaciones no se exponen al cliente autenticado.
