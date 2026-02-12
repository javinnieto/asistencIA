---
name: creador-de-skills-antigravity
description: Experto en diseñar Skills predecibles, reutilizables y fáciles de mantener para el entorno de Antigravity, siguiendo una estructura clara y lógica de producción.
---

# CREADOR DE SKILLS PARA ANTIGRAVITY

## Cuándo usar este skill

- Cuando el usuario pida crear un skill nuevo.
- Cuando el usuario repita un proceso.
- Cuando se necesite un estándar de formato.
- Cuando haya que convertir un prompt largo en un procedimiento reutilizable.

## Inputs necesarios

- Objetivo o descripción de la tarea que el nuevo skill debe automatizar.
- Contexto sobre el nivel de libertad requerido (Alta, Media, Baja).
- Cualquier recurso o script adicional que deba integrarse.

## Workflow

1. **Plan**: Entender el objetivo final e identificar los inputs necesarios.
2. **Validación**: Definir el output exacto y aplicar restricciones de formato y lógica.
3. **Ejecución**: Generar la estructura de carpetas y el contenido de `SKILL.md`.
4. **Revisión**: Revisar coherencia, errores y cumplimiento de los estándares de Antigravity.

## Instrucciones

Eres un experto en diseñar Skills para el entorno de Antigravity. Tu objetivo es crear Skills predecibles, reutilizables y fáciles de mantener.

### 1) Estructura de carpeta

Cada Skill se crea dentro de: `.agent/skills/<nombre-del-skill>/`
Como mínimo debe existir `SKILL.md`. Opcionalmente: `recursos/`, `scripts/`, `ejemplos/`.

### 2) Principios de escritura

- **Claridad sobre longitud**: Pocas reglas, pero muy claras.
- **Sin relleno**: El skill es un manual de ejecución, evita explicaciones tipo blog.
- **Separación de responsabilidades**: Estilo a recursos, pasos a workflow.
- **Pedir datos**: Si falta un input crítico, pregunta.

### 3) Niveles de libertad

1. **Alta libertad (heurísticas)**: Brainstorming, ideas.
2. **Media libertad (plantillas)**: Documentos, estructuras.
3. **Baja libertad (pasos exactos)**: Operaciones frágiles, scripts técnicos.

### 4) Manejo de errores

Si el resultado no cumple el formato, vuelve al paso de Validación, ajusta restricciones y re-genera. Si hay ambigüedad, pregunta antes de asumir.

## Output (formato exacto)

Carpeta: `.agent/skills/<nombre-del-skill>/`

SKILL.md:

```markdown
---
name: ...
description: ...
---

# <Título del skill>

## Cuándo usar este skill

- ...

## Inputs necesarios

- ...

## Workflow

1. ...

## Instrucciones

...

## Output (formato exacto)

...
```

Recursos opcionales (solo si aportan valor):

- `recursos/<archivo>.md`
- `scripts/<archivo>.sh`

## Sugerencias de Skills adicionales

- Skill de "estilo y marca"
- Skill de "planificar vídeos"
- Skill de "auditar landing"
- Skill de "debug de app"
- Skill de "responder emails con tono"
