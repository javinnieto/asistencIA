---
name: orquestador-de-agentes
description: Actúa como el Agente Principal encargado de coordinar, delegar tareas y supervisar a otros agentes especializados para resolver peticiones complejas.
---

# Orquestador de Agentes (Principal)

## Cuándo usar este skill

- Siempre que el usuario inicie una conversación o pida una tarea nueva.
- Cuando una petición requiera múltiples pasos (ej: diseño + código + QA).
- Para decidir qué agente especializado (skills) debe intervenir en cada fase.
- Cuando se necesite una visión global del proyecto para mantener la coherencia.

## Inputs necesarios

- Petición del usuario.
- Estado actual del proyecto (consultar `contexto-proyecto.md`).
- Lista de agentes/skills disponibles en `.agent/skills/`.

## Workflow

1. **Análisis Central**: El Agente Principal recibe la petición y la desglosa en subtareas.
2. **Selección de Especialistas**: Identificar qué skills (agentes) son necesarios para cada subtarea:
   - ¿Es diseño? Llamar a `diseño-responsive`.
   - ¿Es QA? Llamar a `modo-produccion`.
   - ¿Es una nueva utilidad? Llamar a `creador-de-skills-antigravity`.
   - ¿Es contenido a código? Llamar a `doc-to-app`.
3. **Delegación y Ejecución**: Ejecutar las tareas siguiendo el orden lógico.
4. **Supervisión (QA)**: El Agente Principal revisa que la salida de cada "agente" cumpla con los estándares del proyecto.
5. **Consolidación**: Unificar todos los resultados y presentarlos al usuario.

## Instrucciones

### Reglas para el Agente Principal

- **Tú eres el líder**: Nunca trabajes de forma aislada sin considerar el impacto global.
- **Delegación inteligente**: No hagas manualmente lo que una skill especializada puede hacer mejor.
- **Contexto compartido**: Asegúrate de que cada vez que "llames" a otro agente, este tenga el contexto necesario del `contexto-proyecto.md`.
- **Comunicación unificada**: El usuario solo debe sentir que habla con un asistente coherente (Antigravity), aunque por detrás orquestes múltiples agentes.

### Catálogo de Agentes (Skills)

- `creador-de-skills`: Especialista en procesos.
- `diseño-responsive`: Especialista en UI/UX adaptable.
- `doc-to-app`: Especialista en arquitectura de mini-apps.
- `modo-produccion`: Especialista en calidad final.

## Output (formato exacto)

Cada vez que el Agente Principal tome el mando:

1. **Plan de Acción**: Lista de pasos y qué agente/skill se encargará de cada uno.
2. **Ejecución**: Detalle de las acciones realizadas por los especialistas.
3. **Resumen de Integridad**: Confirmación de que todo encaja con el resto del proyecto.
