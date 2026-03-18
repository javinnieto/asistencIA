import re

with open('/home/radex/asistencIA/frontend/src/pages/Personas.tsx', 'r') as f:
    personas_code = f.read()

with open('/home/radex/asistencIA/frontend/src/components/PersonasTable.tsx', 'r') as f:
    table_code = f.read()

# 1. PersonasTable.tsx Changes
table_new = re.sub(
    r'  const \[categorias, setCategorias\] = useState<string\[\]>\(\[\]\);.*?fetchFiltros\(\);\s*\}, \[\]\);',
    '',
    table_code,
    flags=re.DOTALL
)

table_new = re.sub(
    r'  const \[filterCategoria, setFilterCategoria\] = useState\(\'\'\);\s*const \[filterCurso, setFilterCurso\] = useState\(\'\'\);',
    '',
    table_new
)

props_interface = r'''
  // Server-side filters
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterActivo: string;
  onFilterActivoChange: (value: string) => void;
  // Extracted client filters
  filterCategoria: string;
  filterCurso: string;
}
'''
table_new = re.sub(r'// Server-side filters.*?\}', props_interface.strip() + '\n}', table_new, flags=re.DOTALL)

destructure = r'''  searchTerm,
  onSearchChange,
  filterActivo,
  onFilterActivoChange,
  filterCategoria,
  filterCurso,
}) => {'''
table_new = re.sub(r'  searchTerm,.*?\}\) => \{', destructure, table_new, flags=re.DOTALL)

# Remove global top bars
html_to_remove = r'      \{\/\* Acciones Globales Superiores \*\/}.*?\{\/\* Tabla \*\/}'
replacement = r'''      {/* Batch actions */}
      {selectionMode && selectedCount > 0 && isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px 16px' }}>
          <button
            onClick={() => setBatchConfirmOpen(true)}
            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2 fade-in"
            title="Eliminar filas seleccionadas"
          >
            <i className="bi bi-trash-fill"></i>
            Eliminar Seleccionados ({selectedCount})
          </button>
        </div>
      )}

      {/* Tabla */}'''
table_new = re.sub(html_to_remove, replacement, table_new, flags=re.DOTALL)
table_new = table_new.replace("import React, { useState, useMemo } from 'react';", "import React, { useState, useMemo, useEffect } from 'react';")


with open('/home/radex/asistencIA/frontend/src/components/PersonasTable.tsx', 'w') as f:
    f.write(table_new)

print("PersonasTable.tsx prepared internally by script.")
