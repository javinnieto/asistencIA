import React, { useState, useMemo } from 'react';
import './PersonasTable.css';

interface IconProps { className?: string }
const FaEdit = ({ className }: IconProps) => <span className={className}>✏️</span>;
const FaTrash = ({ className }: IconProps) => <span className={className}>🗑️</span>;
const FaEye = ({ className }: IconProps) => <span className={className}>👁️</span>;
const FaSearch = ({ className }: IconProps) => <span className={className}>🔍</span>;
const FaDownload = ({ className }: IconProps) => <span className={className}>📥</span>;

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Categorías disponibles
  const categorias = ['Alumno', 'Docente', 'No Docente'];

  const [filterCurso, setFilterCurso] = useState('');

  // Computar cursos únicos disponibles de las personas cargadas
  const cursosDisponibles = useMemo(() => {
    const cursos = new Set<string>();
    personas.forEach(p => {
      if (p.grado) cursos.add(p.grado);
      // También buscar en roles si es necesario profundidad
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
        // Check primary department OR any role's type name
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

  const exportToCSV = () => {
    const headers = ['ID', 'Nombre', 'Apellido', 'Categoría', 'Cursos'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(person => {
        const cursos = person.roles?.map(r => r.curso?.nombre).filter(Boolean).join('; ') || '';
        return [person.id, person.nombre, person.apellido, person.departamento, cursos].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'personas.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      {/* Header */}
      <div className="table-header">
        <div className="header-left">
          <h2>Gestión de Personas</h2>
          <span className="results-count">
            Mostrando {currentData.length} de {filteredData.length} personas
          </span>
        </div>
        <div className="header-right">
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <FaDownload /> Exportar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="table-filters">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre o apellido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Categoría:</label>
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              className="filter-select"
            >
              <option value="">Todas</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Curso:</label>
            <select
              value={filterCurso}
              onChange={(e) => setFilterCurso(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos</option>
              {cursosDisponibles.map(curso => (
                <option key={curso} value={curso}>{curso}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-wrapper">
        <table className="personas-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Foto</th>
              <th style={{ width: '20%' }}>Nombre</th>
              <th style={{ width: '20%' }}>Apellido</th>
              <th style={{ width: '15%' }}>Categoría</th>
              <th style={{ width: '25%' }}>Cursos</th>
              <th style={{ width: '15%' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((person) => {
              // Mostrar todos los cursos de la persona
              const cursos = person.roles?.map(r => r.curso?.nombre).filter(Boolean) || [];
              const cursosText = cursos.length > 0 ? cursos.join(', ') : '-';

              return (
                <tr key={person.id}>
                  <td>
                    <img
                      src={person.foto || `https://via.placeholder.com/42x42/667eea/ffffff?text=${person.nombre.charAt(0)}`}
                      alt={`${person.nombre} ${person.apellido}`}
                      className="person-avatar"
                      style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  </td>
                  <td><strong>{person.nombre}</strong></td>
                  <td>{person.apellido}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(person.roles && person.roles.length > 0) ? person.roles.map((role, idx) => (
                        <span key={idx} className="department-badge" style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
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
                  <td style={{ fontSize: '13px', color: '#64748b' }}>{cursosText}</td>
                  <td>
                    <div className="action-buttons" style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-icon btn-view action-btn"
                        onClick={() => onView(person)}
                        title="Ver detalles"
                      >
                        <FaEye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        className="btn-icon btn-edit action-btn"
                        onClick={() => onEdit(person)}
                        title="Editar"
                      >
                        <FaEdit className="w-4 h-4 text-yellow-600" />
                      </button>
                      <button
                        className="btn-icon btn-delete action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('[PersonasTable] Delete clicked for:', person.id, person.nombre);
                          onDelete(person.id);
                        }}
                        title="Eliminar"
                      >
                        <FaTrash className="w-4 h-4 text-red-600" />
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
    </div>
  );
};

export default PersonasTable;