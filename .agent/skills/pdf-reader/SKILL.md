name: pdf-reader
description: Convierte PDFs complejos (tablas, columnas, imágenes) en mini-apps interactivas con extracción estructurada avanzada. Para que el usuario pueda interactuar con el PDF.

---

# PDF-READER (Estructuración Avanzada)

## Cuándo usar este skill

- Cuando el PDF sea "difícil": tenga varias columnas, tablas anidadas, gráficos o mezcla de texto e imagen.
- Cuando necesites que los datos de las tablas se conviertan en bases de datos funcionales (JSON) y no solo texto plano.

## Inputs necesarios

1. **Fuente**: Archivo PDF (prioritario) o texto.
2. **Tipo de app**: Dashboard, catálogo técnico, guía interactiva, o visor de reportes.
3. **Prioridad**: "Fidelidad de datos" (tablas perfectas) o "Navegabilidad" (mejor UX).

**HERRAMIENTAS Y LÓGICA DE EXTRACCIÓN:**

Tienes acceso a un entorno Linux. Para PDFs complejos, sigue este orden jerárquico:

1.  **Tablas**: Usa `pdfplumber` con `page.extract_table()` para obtener listas de listas y convertirlas en objetos JSON `{header: valor}`.
2.  **Texto y Layout**: Usa `fitz` (PyMuPDF) para detectar bloques de texto. Es mejor para manejar documentos con 2 o 3 columnas sin mezclar las líneas.
3.  **Imágenes**: Si hay imágenes críticas, usa `fitz` para extraerlas o describir su ubicación como placeholders en la app.

```python
import pdfplumber
import fitz # PyMuPDF
import json

# Lógica recomendada para el skill:
# 1. Detectar tablas con pdfplumber.
# 2. Extraer texto por bloques con fitz para mantener el orden de lectura.
# 3. Cruzar ambos para generar el data.json final.

Workflow de "Alta Complejidad"
Análisis de Layout: Antes de extraer, determina si el documento tiene columnas o es flujo simple.

Extracción Híbrida:

Extrae tablas como datos estructurados.

Extrae encabezados (h1, h2) detectando tamaños de fuente o negritas con fitz.

Limpieza de Datos: Limpiar caracteres especiales, corregir saltos de línea huérfanos y asegurar que el JSON sea semántico.

Generación de la App:

index.html: Debe incluir una tabla dinámica (DataTables o similar simple) si el PDF tenía muchas tablas.

style.css: Diseño moderno, tipografía legible y soporte para modo oscuro.

data.json: El corazón de la app, bien jerarquizado.

Instrucciones Críticas
Reglas de Oro
Tablas Vivas: Si el PDF tiene tablas, la mini-app debe permitir filtrar y buscar dentro de esas tablas, no solo mostrarlas como texto.

Preservación de Jerarquía: El índice de la app debe reflejar fielmente los capítulos o secciones del PDF.

Manejo de Errores: Si una página es solo una imagen (escaneada), indica al usuario que se requiere OCR o intenta procesarla como bloque visual.

Funcionalidades de la App
Buscador Global: Filtra contenido en todo el JSON.

Vista de Galería/Tabla: Si hay muchos datos repetitivos, usa un diseño de "cards".

Exportación: Añade un botón para "Copiar JSON" o "Descargar tabla a CSV" si es una app de datos.

Output (formato exacto)
Estructura de archivos
Carpeta: miniapp_<tema>_<YYYYMMDD_HHMM>/

index.html: App interactiva (JS vanilla).

data.json: Los datos limpios y estructurados.

styles.css: Estilos premium (puedes usar un CDN de Tailwind o CSS puro).

README.txt: Instrucciones de navegación.

Respuesta en chat
“✅ Documento complejo analizado con éxito.”

“Estructura detectada: [X] Tablas, [Y] Secciones, [Z] Imágenes.”

“Carpeta creada: miniapp_...”

“Ejecuta el preview en: index.html”


---

### ¿Qué cambió en esta versión?

1.  **Estrategia Híbrida**: Le ordenamos al modelo que no use una sola librería. `pdfplumber` es el rey de las tablas, pero `fitz` (PyMuPDF) es el rey de los layouts con columnas.
2.  **Lógica de Datos**: Ahora se le pide explícitamente que convierta las tablas en objetos `{llave: valor}`. Esto hará que tu `data.json` sea profesional y fácil de usar en el HTML.
3.  **Detección de Columnas**: Al mencionar "Layout-Aware", el modelo tendrá cuidado de no mezclar el texto de la columna izquierda con la derecha.
```
