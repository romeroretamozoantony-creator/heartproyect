# Arquitectura de Mobile Heart

## Principios

- `src/app` define rutas, layouts y puntos de entrada de servidor.
- `src/features` contiene la lógica agrupada por funcionalidad.
- `src/components/ui` contiene componentes de shadcn/ui.
- `src/components/layout` contiene estructuras compartidas de página.
- `src/components/shared` se creará cuando existan componentes reutilizados por varias funcionalidades.
- `src/lib` contiene integraciones y utilidades sin interfaz.
- `src/config` contiene configuración estática de la aplicación.
- `src/types` contiene tipos realmente compartidos entre módulos.
- `src/hooks` se creará cuando aparezcan hooks reutilizables.

## Grupos de rutas

- `(auth)` agrupa las pantallas públicas de acceso sin modificar sus URL.
- `(private)` agrupa las pantallas que requieren una sesión válida.
- El layout raíz mantiene metadatos, idioma y estilos globales.
- El proxy y el layout privado verifican la sesión de Supabase Auth. Cada operación valida la identidad y RLS controla los datos. La demostración local utiliza sesiones emitidas y revocables; el nombre del grupo no constituye una medida de seguridad.

## Rutas funcionales previstas

| Ruta | Responsabilidad |
| --- | --- |
| `/login` | Acceso del estudiante |
| `/register` | Registro del estudiante |
| `/activities` | Actividades y calendario |
| `/schedule` | Cronograma, tiempos, alertas y archivos |
| `/plan` | Plan de estudio y Pomodoro |
| `/progress` | Seguimiento, resultados y bienestar |

Las seis rutas funcionales están implementadas; las evaluaciones con IA corresponden a una fase posterior.

## Reglas de dependencias

1. Las rutas pueden importar componentes, configuración y funciones de una funcionalidad.
2. Los componentes compartidos no deben depender de un módulo funcional concreto.
3. Las integraciones externas se encapsulan en `src/lib` o dentro del módulo que las utiliza.
4. Los módulos no deben acceder directamente a detalles internos de otros módulos.
5. La validación y las reglas de negocio deben permanecer fuera de los componentes visuales.
6. El código del cliente y los secretos del servidor deben mantenerse separados.
