import React, { useState, useMemo } from 'react';
import './PersonasTable.css';
import { normalizeString } from '../utils/normalize';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';
import TablePagination from './TablePagination';
import { useTableSelection } from '../hooks/useTableSelection';


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

  // Modal states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Batch Delete state
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);

  // Categorías disponibles (deben coincidir con los TipoPersona reales)
  const categorias = useMemo(() => {
    const tipos = new Set<string>();
    personas.forEach(p => {
      p.roles?.forEach(r => {
        if (r.tipo?.nombre) tipos.add(r.tipo.nombre);
      });
    });
    return Array.from(tipos).sort();
  }, [personas]);

  // Computar cursos únicos
  const cursosDisponibles = useMemo(() => {
    const cursos = new Set<string>();
    personas.forEach(p => {
      p.roles?.forEach(r => {
        if (r.curso && r.curso.nombre) cursos.add(r.curso.nombre);
      });
    });
    return Array.from(cursos).sort();
  }, [personas]);

  // Filtrar datos
  const filteredData = useMemo(() => {
    return personas.filter(person => {
      const fullName = `${person?.nombre || ''} ${person?.apellido || ''}`.trim();
      const normalizedSearch = normalizeString(searchTerm || '');
      // Make sure we handle number/undefined IDs safely
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
  }, [personas, searchTerm, filterCategoria, filterCurso]);

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
    conflictos.forEach(c => {
      map.set(String(c.persona_db.idPersona), c.idConflicto);
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
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No hay personas registradas</h3>
          <p>Las personas se registran automáticamente cuando usan el terminal de reconocimiento facial.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="personas-table-container">
      {/* Combined Compact Header & Filters */}
      <div className="table-top-bar" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 8px 50px 8px',
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
            className="filter-select form-select"
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="">Todas las Categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={filterCurso}
            onChange={(e) => setFilterCurso(e.target.value)}
            className="filter-select form-select"
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="">Todos los Cursos</option>
            {cursosDisponibles.map(curso => (
              <option key={curso} value={curso}>{curso}</option>
            ))}
          </select>
        </div>

        {/* Right-side buttons & count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Batch delete button — solo visible en modo selección con algo seleccionado */}
          {selectionMode && selectedCount > 0 && isAdmin && (
            <button
              onClick={() => setBatchConfirmOpen(true)}
              className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2 fade-in"
              title="Eliminar filas seleccionadas"
            >
              <i className="bi bi-trash-fill"></i>
              Eliminar ({selectedCount})
            </button>
          )}

          {/* Toggle selección — solo admins */}
          {isAdmin && (
            <button
              onClick={handleToggleSelectionMode}
              className={`btn btn-sm d-flex align-items-center gap-2 ${selectionMode ? 'btn-outline-secondary' : 'btn-outline-light'}`}
              title={selectionMode ? 'Cancelar selección' : 'Activar selección múltiple'}
            >
              <i className={`bi ${selectionMode ? 'bi-x-circle' : 'bi-check2-square'}`}></i>
              {selectionMode ? 'Cancelar' : 'Seleccionar'}
            </button>
          )}

          {isAdmin && onSyncDevice && (
            <button 
              onClick={onSyncDevice}
              className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
              title="Obtener personas nuevas desde el lector MQTT"
            >
              <i className="bi bi-arrow-repeat"></i>
              Sincronizar Lector
            </button>
          )}
          <span className="results-count" style={{ fontSize: '0.85rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
            {filteredData.length} registros
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-wrapper table-responsive">
        <table className="personas-table">
          <thead>
            <tr>
              {isAdmin && selectionMode && (
                <th style={{ width: '40px', padding: '12px 10px', verticalAlign: 'middle', textAlign: 'center' }}>
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
                </th>
              )}
              <th style={{ width: '8%', whiteSpace: 'nowrap' }}>ID LECTOR</th>
              <th style={{ width: '60px' }}>FOTO</th>
              <th style={{ width: '20%' }}>NOMBRE</th>
              <th style={{ width: '20%' }}>APELLIDO</th>
              <th style={{ width: '15%' }}>CATEGORÍA</th>
              <th style={{ width: '25%' }}>CURSOS</th>
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
                  {isAdmin && selectionMode && (
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedIds.has(person.id)}
                        onChange={() => toggleSelection(person.id)}
                        style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                      />
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
                  <td data-label="Nombre">
                    <strong>{person.nombre}</strong>
                    {hasConflict && (
                      <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>
                        ¡Duplicado!
                      </span>
                    )}
                  </td>
                  <td data-label="Apellido">{person.apellido}</td>
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
                      <button
                        className="btn-icon btn-view action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(person);
                        }}
                        title="Ver detalles"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#3b82f6' }}
                      >
                        <i className="bi bi-eye-fill"></i>
                      </button>
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
        message="¿Estás seguro que deseas eliminar a esta persona del sistema? Se perderá todo su historial."
        confirmText="Sí, Eliminar"
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
        message={`¿Estás seguro que deseas eliminar a las ${selectedCount} personas seleccionadas de la página actual?`}
        confirmText="Eliminar Lote"
      />
    </div>
  );
};

export default PersonasTable;