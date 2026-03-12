import React, { useState, useMemo } from 'react';
import './PersonasTable.css';
import { normalizeString } from '../utils/normalize';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';
import TablePagination from './TablePagination';
import { useTableSelection } from '../hooks/useTableSelection';
import { apiRequest } from '../config/api';


interface Person {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  departamento: string;
  cargo: string;
  fechaIngreso: string;
  estado: 'activo' | 'inactivo';
  foto?: string;
  roles?: any[];
}

interface PersonasTableProps {
  personas: Person[];
  onEdit: (person: Person) => void;
  onDelete: (id: string) => void;
  onView: (person: Person) => void;
  onSyncDevice?: () => void;
  conflictos?: any[];
  onResolveConflict?: (person: Person, conflictoId: number) => void;
  onDeleteBatch?: (ids: string[]) => void;
}

const PersonasTable: React.FC<PersonasTableProps> = ({
  personas,
  onEdit,
  onDelete,
  onView,
  onSyncDevice,
  conflictos = [],
  onResolveConflict,
  onDeleteBatch
}) => {
  const { isAdmin, rol } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterCurso, setFilterCurso] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modo selección (toggle)
  const [selectionMode, setSelectionMode] = useState(false);

  // Sorting
  type SortDir = 'asc' | 'desc';
  const [sortField, setSortField] = useState<string>('nombre');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: string) => {
    if (sortField === field) {
      return sortDir === 'asc'
        ? <i className="bi bi-sort-down ms-1" style={{ fontSize: '0.75rem' }}></i>
        : <i className="bi bi-sort-up ms-1" style={{ fontSize: '0.75rem' }}></i>;
    }
    return <i className="bi bi-arrow-down-up ms-1" style={{ fontSize: '0.75rem', opacity: 0.3 }}></i>;
  };

  // Modal states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Batch Delete state
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);

  // Filtros dinámicos desde API
  const [categorias, setCategorias] = useState<string[]>([]);
  const [cursosDisponibles, setCursosDisponibles] = useState<string[]>([]);

  React.useEffect(() => {
    const fetchFiltros = async () => {
      try {
        const [catRes, curRes] = await Promise.all([
          apiRequest('/tipos-persona/'),
          apiRequest('/cursos/')
        ]);
        if (catRes.ok) {
          const data = await catRes.json();
          const nombresCats = (data.results || data || []).map((t: any) => t.nombre);
          setCategorias(Array.from(new Set(nombresCats)).sort() as string[]);
        }
        if (curRes.ok) {
          const data = await curRes.json();
          const nombresCursos = (data.results || data || []).map((c: any) => c.nombre);
          setCursosDisponibles(Array.from(new Set(nombresCursos)).sort() as string[]);
        }
      } catch (e) {
        console.error('Error fetching filters', e);
      }
    };
    fetchFiltros();
  }, []);

  // Filtrar y ordenar datos
  const filteredData = useMemo(() => {
    const filtered = personas.filter(person => {
      const fullName = `${person?.nombre || ''} ${person?.apellido || ''}`.trim();
      const normalizedSearch = normalizeString(searchTerm || '');
      const safeId = person?.id ? String(person.id) : '';
      
      const matchesSearch = !searchTerm ||
        normalizeString(fullName).includes(normalizedSearch) ||
        safeId.includes(searchTerm.trim());

      const matchesCategoria = !filterCategoria || (
        person.departamento === filterCategoria ||
        person.roles?.some(r => r.tipo?.nombre === filterCategoria)
      );

      const userCourses = person.roles?.map(r => r.curso?.nombre).filter(Boolean) || [];
      const hasCourse = userCourses.includes(filterCurso);
      const matchesCurso = !filterCurso || hasCourse;

      return matchesSearch && matchesCategoria && matchesCurso;
    });

    // Ordenar sobre la lista completa (antes de paginar)
    return [...filtered].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'nombre') {
        valA = normalizeString(a.nombre || '');
        valB = normalizeString(b.nombre || '');
      } else if (sortField === 'apellido') {
        valA = normalizeString(a.apellido || '');
        valB = normalizeString(b.apellido || '');
      } else if (sortField === 'id') {
        // IDs numéricos: comparar directamente como número
        const nA = Number(a.id) || 0;
        const nB = Number(b.id) || 0;
        return sortDir === 'asc' ? nA - nB : nB - nA;
      } else if (sortField === 'categoria') {
        valA = normalizeString(a.roles?.[0]?.tipo?.nombre || '');
        valB = normalizeString(b.roles?.[0]?.tipo?.nombre || '');
      } else if (sortField === 'curso') {
        valA = normalizeString(a.roles?.[0]?.curso?.nombre || '');
        valB = normalizeString(b.roles?.[0]?.curso?.nombre || '');
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [personas, searchTerm, filterCategoria, filterCurso, sortField, sortDir]);

  // Reset page to 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategoria, filterCurso]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  // Ensure currentPage is valid for the current filteredData length
  const safeCurrentPage = Math.min(currentPage, totalPages);
  
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Initialise the multi-select hook passing only the data visible on this page
  const {
    selectedIds,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    selectedCount
  } = useTableSelection(currentData);

  // Fast lookup for conflicts mapped by Person ID
  const conflictosMap = useMemo(() => {
    const map = new Map<string, number>();
    (conflictos || []).forEach(c => {
      if (c && c.persona_db && c.persona_db.idPersona) {
        map.set(String(c.persona_db.idPersona), c.idConflicto);
      }
    });
    return map;
  }, [conflictos]);

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleDeleteRequest = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setItemToDelete(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      onDelete(itemToDelete);
      setConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handleToggleSelectionMode = () => {
    if (selectionMode) {
      clearSelection();
    }
    setSelectionMode(prev => !prev);
  };

  if (personas.length === 0) {
    return (
      <div className="personas-table-container">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '400px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)', margin: '32px'
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px'
          }}>
            <i className="bi bi-people" style={{ fontSize: '2.5rem', color: '#818cf8' }}></i>
          </div>
          <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', fontWeight: 600, marginBottom: '8px' }}>
            Aún no hay personas registradas
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '400px', textAlign: 'center', marginBottom: '24px' }}>
            Las personas pueden ser registradas manualmente o sincronizadas desde el dispositivo de reconocimiento.
          </p>
          {isAdmin && onSyncDevice && (
            <button
              onClick={onSyncDevice}
              className="btn btn-primary d-flex align-items-center gap-2"
              title="Obtener personas desde el lector"
            >
              <i className="bi bi-cloud-download"></i>
              Importar desde el Lector
            </button>
          )}
        </div>
      </div>
    );
  }


  return (
    <div className="personas-table-container">
      {/* Acciones Globales Superiores */}
      <div className="table-global-actions">
        <div className="table-global-actions-left">
          <h2 className="table-global-title">Personas</h2>
          <span className="results-count-badge">
            {filteredData.length} registros totales
          </span>
        </div>

        {isAdmin && onSyncDevice && (
          <button 
            onClick={onSyncDevice}
            className="btn btn-primary btn-sm d-flex align-items-center gap-2"
            title="Importar nuevas personas desde el lector MQTT"
          >
            <i className="bi bi-arrow-repeat"></i>
            Sincronizar Lector
          </button>
        )}
      </div>

      {/* Combined Compact Header & Filters */}
      <div className="table-top-bar" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 32px 32px 32px',
        background: 'rgba(30, 41, 59, 0.4)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
          {/* Search - Flexible Width */}
          <div className="search-box" style={{ flex: '1 1 200px', minWidth: '200px' }}>
            <i className="bi bi-search search-icon"></i>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ height: '40px', fontSize: '0.9rem' }}
            />
          </div>

          {/* Inline Filters */}
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="custom-dark-select"
            style={{ width: 'auto', minWidth: '160px' }}
          >
            <option value="">Todas las Categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={filterCurso}
            onChange={(e) => setFilterCurso(e.target.value)}
            className="custom-dark-select"
            style={{ width: 'auto', minWidth: '160px' }}
          >
            <option value="">Todos los Cursos</option>
            {cursosDisponibles.map(curso => (
              <option key={curso} value={curso}>{curso}</option>
            ))}
          </select>
        </div>

        {/* Right-side batch actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Batch delete button — visible cuando hay selección activa */}
          {selectionMode && selectedCount > 0 && isAdmin && (
            <button
              onClick={() => setBatchConfirmOpen(true)}
              className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2 fade-in"
              title="Eliminar filas seleccionadas"
            >
              <i className="bi bi-trash-fill"></i>
              Eliminar Seleccionados ({selectedCount})
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="table-wrapper table-responsive">
        <table className="personas-table">
          <thead>
            <tr>
              {/* Columna izquierda: toggle o checkbox-all según modo */}
              {isAdmin && (
                <th style={{ width: '40px', padding: '12px 10px', verticalAlign: 'middle', textAlign: 'center' }}>
                  {selectionMode ? (
                    // Modo activo → checkbox select-all
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={isAllSelected}
                      ref={input => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                    />
                  ) : (
                    // Modo inactivo → ícono pequeño para activar selección
                    <button
                      onClick={handleToggleSelectionMode}
                      title="Activar selección múltiple"
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '5px',
                        padding: '2px 5px',
                        cursor: 'pointer',
                        color: '#475569',
                        lineHeight: 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      <i className="bi bi-check2-square" style={{ fontSize: '0.85rem' }}></i>
                    </button>
                  )}
                </th>
              )}
              <th
                onClick={() => handleSort('id')}
                className="sortable-header"
                style={{ width: '8%', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
              >
                ID LECTOR {getSortIcon('id')}
              </th>
              <th style={{ width: '60px' }}>FOTO</th>
              <th
                onClick={() => handleSort('nombre')}
                className="sortable-header"
                style={{ width: '20%', cursor: 'pointer', userSelect: 'none' }}
              >
                NOMBRE {getSortIcon('nombre')}
              </th>
              <th
                onClick={() => handleSort('apellido')}
                className="sortable-header"
                style={{ width: '20%', cursor: 'pointer', userSelect: 'none' }}
              >
                APELLIDO {getSortIcon('apellido')}
              </th>
              <th
                onClick={() => handleSort('categoria')}
                className="sortable-header"
                style={{ width: '15%', cursor: 'pointer', userSelect: 'none' }}
              >
                CATEGORÍA {getSortIcon('categoria')}
              </th>
              <th
                onClick={() => handleSort('curso')}
                className="sortable-header"
                style={{ width: '25%', cursor: 'pointer', userSelect: 'none' }}
              >
                CURSOS {getSortIcon('curso')}
              </th>
              <th style={{ width: '15%', textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((person) => {
              const cursos = person.roles?.map(r => r.curso?.nombre).filter(Boolean) || [];
              const cursosText = cursos.length > 0 ? cursos.join(', ') : '-';
              
              const conflictoId = person.id ? conflictosMap.get(String(person.id)) : null;
              const hasConflict = !!conflictoId;

              return (
                <tr
                  key={person.id}
                  onClick={() => onView(person)}
                  style={{ 
                    cursor: 'pointer',
                    backgroundColor: selectedIds.has(person.id) ? 'rgba(59, 130, 246, 0.08)' : (hasConflict ? 'rgba(239, 68, 68, 0.05)' : undefined),
                    borderLeft: hasConflict ? '4px solid #ef4444' : undefined,
                  }}
                >
                  {isAdmin && (
                    <td className="select-checkbox-cell" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', verticalAlign: 'middle', padding: '0 6px' }}>
                      {selectionMode && (
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedIds.has(person.id)}
                          onChange={() => toggleSelection(person.id)}
                          style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                        />
                      )}
                    </td>
                  )}
                  <td data-label="ID LECTOR" style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>
                    #{person.id}
                  </td>
                  <td data-label="Foto">
                    {person.foto ? (
                      <img
                        src={person.foto}
                        alt={`${person.nombre} ${person.apellido}`}
                        className="person-avatar"
                        style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="avatar-placeholder" style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        fontSize: '1.5rem'
                      }}>
                        <i className="bi bi-person-circle"></i>
                      </div>
                    )}
                  </td>
                  <td data-label="Nombre" className="desktop-cell">
                    <strong>{person.nombre}</strong>
                    {hasConflict && (
                      <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>
                        ¡Duplicado!
                      </span>
                    )}
                  </td>
                  <td data-label="Apellido" className="desktop-cell">{person.apellido}</td>
                  
                  {/* Celda combinada solo para móvil */}
                  <td data-label="Persona" className="mobile-cell">
                    <strong>{person.nombre} {person.apellido}</strong>
                    {hasConflict && (
                      <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>
                        ¡Duplicado!
                      </span>
                    )}
                  </td>
                  <td data-label="Categoría">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(person.roles && person.roles.length > 0) ? person.roles.map((role, idx) => (
                        <span key={idx} className="department-badge" style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          background: role.tipo?.nombre === 'Estudiante' ? '#dbeafe' :
                            role.tipo?.nombre === 'Docente' ? '#fef3c7' : '#f3e8ff',
                          color: role.tipo?.nombre === 'Estudiante' ? '#1e40af' :
                            role.tipo?.nombre === 'Docente' ? '#92400e' : '#6b21a8'
                        }}>
                          {role.tipo?.nombre}
                        </span>
                      )) : (
                        <span className="department-badge">-</span>
                      )}
                    </div>
                  </td>
                  <td data-label="Cursos" style={{ fontSize: '0.85rem', color: '#64748b' }}>{cursosText}</td>
                  <td data-label="Acciones">
                    <div className="action-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {hasConflict && onResolveConflict && (
                        <button
                          className="btn-icon action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onResolveConflict(person, conflictoId!);
                          }}
                          title="Resolver Conflicto"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#ef4444' }}
                        >
                          <i className="bi bi-exclamation-triangle-fill"></i>
                        </button>
                      )}
                      {(isAdmin || rol === 'guardia') && (
                        <button
                          className="btn-icon btn-edit action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(person);
                          }}
                          title="Editar"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#fbbf24' }}
                        >
                          <i className="bi bi-pencil-fill"></i>
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="btn-icon btn-delete action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRequest(person.id, e);
                          }}
                          title="Eliminar"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#f87171', zIndex: 10, position: 'relative' }}
                        >
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <TablePagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        totalItems={filteredData.length}
      />

      {/* Confirm Modal for single entity */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar Persona?"
        message="¿Estás seguro que deseas eliminar a esta persona del sistema? Esta acción es irreversible y se perderá su historial de asistencia."
        confirmText="Sí, Eliminar"
        requireDoubleConfirmText="ELIMINAR"
      />

      {/* Confirm Modal for batch selection */}
      <ConfirmModal
        isOpen={batchConfirmOpen}
        onClose={() => setBatchConfirmOpen(false)}
        onConfirm={() => {
          if (onDeleteBatch) {
            onDeleteBatch(Array.from(selectedIds).map(String));
          }
          setBatchConfirmOpen(false);
          clearSelection();
          setSelectionMode(false);
        }}
        title="¿Eliminar Personas Seleccionadas?"
        message={`¿Estás seguro que deseas eliminar a las ${selectedCount} personas seleccionadas? Esta acción es absolutamente irreversible.`}
        confirmText="Eliminar Lote"
        requireDoubleConfirmText="ELIMINAR"
      />
    </div>
  );
};

export default PersonasTable;