import React, { useState, useMemo } from 'react';
import './PersonasTable.css';
import ConfirmModal from './ConfirmModal';

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
  grado?: string;
}

interface PersonasTableProps {
  personas: Person[];
  onEdit: (person: Person) => void;
  onDelete: (id: string) => void;
  onView: (person: Person) => void;
}

const PersonasTable: React.FC<PersonasTableProps> = ({
  personas,
  onEdit,
  onDelete,
  onView
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterCurso, setFilterCurso] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Categorías disponibles
  const categorias = ['Alumno', 'Docente', 'No Docente'];

  // Computar cursos únicos
  const cursosDisponibles = useMemo(() => {
    const cursos = new Set<string>();
    personas.forEach(p => {
      if (p.grado) cursos.add(p.grado);
      p.roles?.forEach(r => {
        if (r.curso && r.curso.nombre) cursos.add(r.curso.nombre);
      });
    });
    return Array.from(cursos).sort();
  }, [personas]);

  // Filtrar datos
  const filteredData = useMemo(() => {
    return personas.filter(person => {
      const matchesSearch =
        person.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.apellido.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategoria = !filterCategoria || (
        person.departamento === filterCategoria ||
        person.roles?.some(r => r.tipo?.nombre === filterCategoria)
      );

      const userCourses = person.roles?.map(r => r.curso?.nombre).filter(Boolean) || [];
      const hasCourse = userCourses.includes(filterCurso) || person.grado === filterCurso;
      const matchesCurso = !filterCurso || hasCourse;

      return matchesSearch && matchesCategoria && matchesCurso;
    });
  }, [personas, searchTerm, filterCategoria, filterCurso]);

  // Paginación
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

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
            className="filter-select"
            style={{ width: 'auto', minWidth: '140px', height: '40px' }}
          >
            <option value="">Todas las Categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={filterCurso}
            onChange={(e) => setFilterCurso(e.target.value)}
            className="filter-select"
            style={{ width: 'auto', minWidth: '140px', height: '40px' }}
          >
            <option value="">Todos los Cursos</option>
            {cursosDisponibles.map(curso => (
              <option key={curso} value={curso}>{curso}</option>
            ))}
          </select>
        </div>

        {/* Results Count on right */}
        <span className="results-count" style={{ fontSize: '0.85rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
          {filteredData.length} registros
        </span>
      </div>

      {/* Tabla */}
      <div className="table-wrapper">
        <table className="personas-table">
          <thead>
            <tr>
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

              return (
                <tr
                  key={person.id}
                  onClick={() => onView(person)}
                  style={{ cursor: 'pointer' }}
                >
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
                  <td data-label="Nombre"><strong>{person.nombre}</strong></td>
                  <td data-label="Apellido">{person.apellido}</td>
                  <td data-label="Categoría">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(person.roles && person.roles.length > 0) ? person.roles.map((role, idx) => (
                        <span key={idx} className="department-badge" style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          background: role.tipo?.nombre === 'Alumno' ? '#dbeafe' :
                            role.tipo?.nombre === 'Docente' ? '#fef3c7' : '#f3e8ff',
                          color: role.tipo?.nombre === 'Alumno' ? '#1e40af' :
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
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-page"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ← Anterior
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`btn-page ${page === currentPage ? 'active' : ''}`}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </button>
          ))}
          <button
            className="btn-page"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar Persona?"
        message="¿Estás seguro que deseas eliminar a esta persona del sistema? Se perderá todo su historial."
        confirmText="Sí, Eliminar"
      />
    </div>
  );
};

export default PersonasTable;