---
name: diseño-responsive
description: Guía para implementar interfaces siguiendo el enfoque mobile-first, asegurando que cada componente sea fluido y adaptable sin romper el layout.
---

# Diseño Responsive Extremo

## Cuándo usar este skill

- Al crear nuevos componentes de UI.
- Al refactorizar estilos existentes que se ven mal en dispositivos móviles.
- Cuando se detectan scrolls horizontales no deseados o elementos desalineados en diferentes viewports.

## Inputs necesarios

- El componente o página a desarrollar/corregir.
- Los breakpoints específicos si el proyecto requiere unos distintos a los estándar (Bootstrap 5 por defecto).

## Workflow

1. **Mobile First**: Escribir los estilos base pensando en la pantalla más pequeña (móvil).
2. **Uso de Flexbox/Grid**: Implementar layouts fluidos que se adapten al contenedor.
3. **Identificación de Breakpoints**: Añadir media queries solo cuando el layout base de móvil se rompa o necesite más espacio (típicamente 768px, 992px, 1200px).
4. **Pruebas de Escala**: Verificar que las fuentes e imágenes escalen correctamente usando unidades relativas (rem, em, %, vh, vw).
5. **Validación**: Comprobar que no exista scroll horizontal y que los elementos interactivos sean fáciles de pulsar en móviles.

## Instrucciones

### 1) Principios de Diseño

- **Mobile-First siempre**: Nunca diseñes para desktop y luego "intentes" que entre en móvil. Hazlo al revés.
- **Evitar anchos fijos**: Usa `max-width` en lugar de `width` con píxeles fijos.
- **Tipografía adaptable**: Usa `rem` para que el texto respete la configuración del navegador.
- **Imágenes fluidas**: Aplica `max-width: 100%; height: auto;` a todas las imágenes.

### 2) Estándar de Componentes (Bootstrap 5)

Dado que el proyecto usa Bootstrap 5, utiliza las clases de utilidad nativas:

- Contenedores: `.container`, `.container-fluid`.
- Sistema de rejilla: `.col-12`, `.col-md-6`, `.col-lg-4`.
- Márgenes y rellenos responsivos: `.mt-2 .mt-md-4`.
- Visibilidad: `.d-none .d-md-block`.

### 3) Checklist de Verificación

- [ ] ¿Hay scroll horizontal? (Debe ser NO).
- [ ] ¿Los botones tienen al menos 44x44px de área táctil?
- [ ] ¿El texto es legible sin hacer zoom?
- [ ] ¿Las imágenes se desbordan de su contenedor?
- [ ] ¿El layout se ve equilibrado en tablets (pantalla media)?

## Output (formato exacto)

Cuando apliques este skill a un código:

1. **Cambios realizados**: Descripción de los ajustes en el CSS/HTML.
2. **Breakpoints clave**: Lista de los puntos donde el diseño cambia.
3. **Resultado**: Confirmación de fluidez en móvil, tablet y desktop.
