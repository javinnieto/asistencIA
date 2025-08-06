import React, { useState, useMemo } from 'react';
import './PersonasTable.css';

// Iconos simples como componentes
const FaEdit = ({ className }: { className?: string }) => <span className={className}>✏️</span>;
const FaTrash = ({ className }: { className?: string }) => <span className={className}>🗑️</span>;
const FaEye = ({ className }: { className?: string }) => <span className={className}>👁️</span>;
const FaSearch = ({ className }: { className?: string }) => <span className={className}>🔍</span>;
const FaFilter = ({ className }: { className?: string }) => <span className={className}>🔧</span>;
const FaPlus = ({ className }: { className?: string }) => <span className={className}>➕</span>;
const FaDownload = ({ className }: { className?: string }) => <span className={className}>📥</span>;

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
  nivelEducativo?: 'Primaria' | 'Secundaria';
  grado?: string;
}

interface PersonasTableProps {
  personas: Person[];
  onEdit: (person: Person) => void;
  onDelete: (id: string) => void;
  onView: (person: Person) => void;
  onAdd: () => void;
}

const PersonasTable: React.FC<PersonasTableProps> = ({
  personas,
  onEdit,
  onDelete,
  onView,
  onAdd
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterNivelEducativo, setFilterNivelEducativo] = useState('');
  const [filterGrado, setFilterGrado] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Person>('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const itemsPerPage = 10;

  // Opciones de filtros
  const categorias = ['Alumnos', 'Docentes', 'Personal No Docente'];
  const nivelesEducativos = ['Primaria', 'Secundaria'];
  const gradosPrimaria = ['1er grado', '2do grado', '3er grado', '4to grado', '5to grado', '6to grado', '7mo grado'];
  const gradosSecundaria = ['1er año', '2do año', '3er año', '4to año', '5to año'];

  // Obtener grados disponibles según el nivel educativo seleccionado
  const gradosDisponibles = useMemo(() => {
    if (filterNivelEducativo === 'Primaria') {
      return gradosPrimaria;
    } else if (filterNivelEducativo === 'Secundaria') {
      return gradosSecundaria;
    }
    return [];
  }, [filterNivelEducativo]);

  // Filtrar y ordenar datos
  const filteredAndSortedData = useMemo(() => {
    let filtered = personas.filter(person => {
      const matchesSearch = 
        person.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.telefono.includes(searchTerm);
      
      const matchesCategoria = !filterCategoria || person.departamento === filterCategoria;
      const matchesNivelEducativo = !filterNivelEducativo || person.nivelEducativo === filterNivelEducativo;
      const matchesGrado = !filterGrado || person.grado === filterGrado;
      const matchesEstado = !filterEstado || person.estado === filterEstado;
      
      return matchesSearch && matchesCategoria && matchesNivelEducativo && matchesGrado && matchesEstado;
    });

    // Ordenar
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (sortDirection === 'asc') {
        return (aValue || '') < (bValue || '') ? -1 : (aValue || '') > (bValue || '') ? 1 : 0;
      } else {
        return (aValue || '') > (bValue || '') ? -1 : (aValue || '') < (bValue || '') ? 1 : 0;
      }
    });

    return filtered;
  }, [personas, searchTerm, filterCategoria, filterNivelEducativo, filterGrado, filterEstado, sortField, sortDirection]);

  // Paginación
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredAndSortedData.slice(startIndex, endIndex);

  const handleSort = (field: keyof Person) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Nombre', 'Apellido', 'Email', 'Teléfono', 'Departamento', 'Cargo', 'Fecha Ingreso', 'Estado'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedData.map(person => [
        person.id,
        person.nombre,
        person.apellido,
        person.email,
        person.telefono,
        person.departamento,
        person.cargo,
        person.fechaIngreso,
        person.estado
      ].join(','))
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
          <p>Comienza agregando la primera persona a tu sistema de gestión.</p>
          <button className="btn btn-primary" onClick={onAdd}>
            <FaPlus /> Agregar Primera Persona
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="personas-table-container">
      {/* Header con controles */}
      <div className="table-header">
        <div className="header-left">
          <h2>Gestión de Personas</h2>
          <span className="results-count">
            Mostrando {currentData.length} de {filteredAndSortedData.length} personas
          </span>
        </div>
        <div className="header-right">
          <button className="btn btn-primary" onClick={onAdd}>
            <FaPlus /> Agregar Persona
          </button>
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <FaDownload /> Exportar
          </button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="table-filters">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido, email o teléfono..."
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
              onChange={(e) => {
                setFilterCategoria(e.target.value);
                setFilterNivelEducativo('');
                setFilterGrado('');
              }}
              className="filter-select"
            >
              <option value="">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          {filterCategoria === 'Alumnos' && (
            <>
              <div className="filter-group">
                <label>Nivel Educativo:</label>
                <select
                  value={filterNivelEducativo}
                  onChange={(e) => {
                    setFilterNivelEducativo(e.target.value);
                    setFilterGrado('');
                  }}
                  className="filter-select"
                >
                  <option value="">Todos los niveles</option>
                  {nivelesEducativos.map(nivel => (
                    <option key={nivel} value={nivel}>{nivel}</option>
                  ))}
                </select>
              </div>
              
              {filterNivelEducativo && (
                <div className="filter-group">
                  <label>Grado:</label>
                  <select
                    value={filterGrado}
                    onChange={(e) => setFilterGrado(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">Todos los grados</option>
                    {gradosDisponibles.map(grado => (
                      <option key={grado} value={grado}>{grado}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
          
          <div className="filter-group">
            <label>Estado:</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-wrapper">
        <table className="personas-table">
          <thead>
            <tr>
              <th style={{ width: '23%' }} onClick={() => handleSort('nombre')} className="sortable">
                Nombre
                <span className={`sort-indicator ${sortField === 'nombre' ? sortDirection : ''}`}>
                  {sortField === 'nombre' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </th>
              <th style={{ width: '20%' }} onClick={() => handleSort('apellido')} className="sortable">
                Apellido
                <span className={`sort-indicator ${sortField === 'apellido' ? sortDirection : ''}`}>
                  {sortField === 'apellido' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </th>
              <th style={{ width: '18%' }} onClick={() => handleSort('departamento')} className="sortable">
                Departamento
                <span className={`sort-indicator ${sortField === 'departamento' ? sortDirection : ''}`}>
                  {sortField === 'departamento' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </th>
              <th style={{ width: '21%' }} onClick={() => handleSort('cargo')} className="sortable">
                Cargo
                <span className={`sort-indicator ${sortField === 'cargo' ? sortDirection : ''}`}>
                  {sortField === 'cargo' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </th>
              <th style={{ width: '18%' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((person) => (
              <tr key={person.id} className={person.estado === 'inactivo' ? 'inactive-row' : ''}>
                <td>
                  <div className="person-info">
                    <img 
                      src={person.foto || 'https://via.placeholder.com/42x42/667eea/ffffff?text=' + person.nombre.charAt(0)} 
                      alt={`${person.nombre} ${person.apellido}`}
                      className="person-avatar"
                    />
                    <div>
                      <strong>{person.nombre}</strong>
                    </div>
                  </div>
                </td>
                <td>{person.apellido}</td>
                <td>
                  <span className="department-badge">
                    {person.departamento === 'Alumnos' 
                      ? person.grado
                      : person.departamento
                    }
                  </span>
                </td>
                <td>{person.cargo}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon btn-view"
                      onClick={() => onView(person)}
                      title="Ver detalles"
                    >
                      <FaEye />
                    </button>
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => onEdit(person)}
                      title="Editar"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => onDelete(person.id)}
                      title="Eliminar"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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