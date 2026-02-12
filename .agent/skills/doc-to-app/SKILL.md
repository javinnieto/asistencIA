---
name: doc-to-app
description: Convierte un documento (PDF/texto) en una mini-app web interactiva lista para abrir en preview. Úsalo cuando quieras pasar de “contenido” a “producto usable”.
---

# Doc-to-App (Documento a Mini-App)

## Cuándo usar este skill

- Cuando tengas información en un PDF, texto o notas y quieras transformarla en una mini web navegable.
- Cuando necesites una herramienta con buscador, filtros y secciones claras para compartir contenido estático de forma interactiva.

## Inputs necesarios

1. **Fuente**: PDF o texto pegado.
2. **Tipo de app**: guía, catálogo, checklist, itinerario, etc.
3. **Prioridad**: “más visual” o “más práctica”.
4. **Idioma y estilo**: claro, sencillo, sin jerga.

**HERRAMIENTAS DISPONIBLES:**

Tienes acceso a un entorno Linux con Python. Para leer PDFs usa:

```python
import PyPDF2
# o
import pdfplumber
# o
import fitz  # PyMuPDF
```

**PROCESO PARA LEER PDFs:**

1. Instala biblioteca si es necesario: `pip install PyPDF2 pdfplumber pymupdf`
2. Lee el archivo proporcionado por el usuario
3. Extrae texto/tablas/imágenes según necesidad
4. Analiza el contenido extraído

**EJEMPLO:**

```python
import pdfplumber
with pdfplumber.open('archivo.pdf') as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        print(text)
```

Siempre intenta leer archivos proporcionados antes de hacer ingeniería inversa.

## Workflow

1. **Plan**: Leer el documento y extraer estructura: secciones, listas, tablas, puntos clave.
2. **Estructuración**: Convertir la información a un archivo `data.json` ordenado.
3. **Implementación**: Generar `index.html` consumiendo `data.json` (usando vanilla JS/CSS, sin frameworks externos complejos).
4. **Validación**: Verificar que la navegación, búsqueda y filtros funcionen correctamente y que el diseño sea responsive.
5. **Entrega**: Informar al usuario sobre la carpeta creada y el archivo a abrir.

## Instrucciones

### Reglas importantes

- **No devuelvas solo texto**: Debes crear los archivos físicos y permitir la vista previa.
- **Inmutabilidad**: No sobrescribas nada; cada ejecución crea una carpeta nueva con el formato `miniapp_<tema>_<YYYYMMDD_HHMM>`.
- **Mobile First**: La app debe ser perfectamente funcional en dispositivos móviles.

### Funcionalidades mínimas

- **Buscador**: Búsqueda por texto en tiempo real.
- **Filtros**: Por categorías o etiquetas cuando la estructura lo permita.
- **Navegación**: Menú de navegación o índice (lateral o superior).
- **Diseño Premium**: Interfaz limpia, legible y moderna.
- **Interacción**: Botones de "copiar", "marcar como hecho" o "expandir/contraer" según el contexto.

## Output (formato exacto)

### Estructura de archivos

Carpeta: `miniapp_<tema>_<YYYYMMDD_HHMM>/`

- `index.html`: La aplicación principal.
- `data.json`: Datos estructurados extraídos del documento.
- `README.txt`: Guía rápida de uso y descripción del contenido.

### Respuesta en chat

- “Carpeta creada: ...”
- “Abre: .../index.html”
- Resumen breve de secciones y funcionalidades principales.
