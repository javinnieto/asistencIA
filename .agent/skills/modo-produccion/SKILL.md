---
name: modo-produccion
description: Revisa una app/landing, detecta problemas típicos, propone mejoras y aplica correcciones con un checklist fijo para dejarlo listo para enseñar o publicar.
---

# Modo Producción (QA + Fix)

## Cuándo usar este skill

- Cuando ya tienes algo generado (landing/app) y quieres dejarlo “presentable”.
- Cuando algo funciona “a medias” (móvil raro, imágenes rotas, botones sin acción, espaciados feos).
- Antes de enseñarlo a un cliente, grabarlo o publicarlo.

## Inputs necesarios

1. **Archivo principal**: Ruta al archivo principal (ej. `index.html`) o del proyecto.
2. **Objetivo**: “lista para enseñar” o “lista para publicar”.
3. **Restricciones**: Elementos que no se deben tocar (branding, copy, estructura, etc.).

## Checklist de calidad

### A) Funciona y se ve

- Abre la preview / localhost sin errores.
- Imágenes cargan y no hay rutas rotas.
- Tipografías y estilos se aplican correctamente.

### B) Responsive (móvil primero)

- Se ve bien en móvil (no se corta, no hay scroll horizontal).
- Botones y textos tienen tamaños legibles.
- Secciones con espaciado coherente.

### C) Copy y UX básica

- Titular claro y coherente con la propuesta.
- CTAs consistentes (mismo verbo, misma intención).
- No hay texto “placeholder” tipo lorem ipsum.

### D) Accesibilidad mínima

- Contraste razonable en textos.
- Imágenes con alt.
- Estructura de headings (h1, h2) lógica.

## Workflow

1. **Diagnóstico**: Lista de 5–10 problemas prioritarios.
2. **Plan de Acción**: Definir qué cambiar y por qué (máximo 8 cambios).
3. **Ejecución**: Aplicar cambios en los archivos necesarios.
4. **Validación**: Verificar los cambios y confirmar cumplimiento del checklist.
5. **Cierre**: Resumir cambios y proponer mejoras opcionales.

## Instrucciones

### Reglas

- **Respeto a la marca**: No cambies el estilo si existe un skill de marca activo.
- **Eficiencia**: No rehagas todo; corrige lo mínimo para ganar calidad rápido.
- **Claridad > Estética**: Si hay conflicto, prioriza siempre que el mensaje sea claro.

## Output (formato exacto)

1. **Diagnóstico**: Lista priorizada de hallazgos.
2. **Cambios aplicados**: Lista corta de modificaciones realizadas.
3. **Resultado Final**: Estado (“OK para enseñar” / “OK para publicar”) y notas adicionales.
