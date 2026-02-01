import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../config/api';
import { includesNormalized } from '../utils/normalize';
import { useToast } from '../components/Toast';
import './Asistencias.css';

interface Persona {
  idPersona: number;
  nombre: string;
  foto?: string;
}

interface Curso {
  idCurso: number;
  nombre: string;
}

interface Horario {
  idHorario: number;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  curso: Curso;
}

interface Asistencia {
  idAsistencia: number;
  persona: Persona;
  fechaHora: string;
  temperatura: number;
  estado: { idEstadoAsistencia: number; nombre: string };
  horario?: Horario;
  llegada_tarde_minutos: number;
}

const Asistencias: React.FC = () => {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ presentes: 0, tardanzas: 0, ausentes: 0, fiebre: 0 });

  // Filter states initialized from URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [fechaInicio, setFechaInicio] = useState(searchParams.get('fechaInicio') || '');
  const [fechaFin, setFechaFin] = useState(searchParams.get('fechaFin') || '');
  const [cursoFiltro, setCursoFiltro] = useState(searchParams.get('curso') || '');
  const [estadoFiltro, setEstadoFiltro] = useState(searchParams.get('estado') || '');
  const [minTempFiltro, setMinTempFiltro] = useState(searchParams.get('minTemp') || '');
  const [maxTempFiltro, setMaxTempFiltro] = useState(searchParams.get('maxTemp') || '');

  // Pagination
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Sorting
  const [ordering, setOrdering] = useState(searchParams.get('ordering') || '-fechaHora');

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAsistencia, setEditingAsistencia] = useState<Asistencia | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const handleSort = (field: string) => {
    setOrdering(prev => {
      if (prev === field) return `-${field}`;
      if (prev === `-${field}`) return field;
      return `-${field}`;
    });
  };

  const getSortIcon = (field: string) => {
    if (ordering === field) return <i className="bi bi-sort-down"></i>;
    if (ordering === `-${field}`) return <i className="bi bi-sort-up"></i>;
    return <i className="bi bi-arrow-down-up" style={{ opacity: 0.3 }}></i>;
  };

  // Build query string from current state
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('persona__nombre', searchTerm); // Backend uses persona__nombre for search
    if (fechaInicio) params.append('fechaHora__gte', `${fechaInicio}T00:00:00`);
    if (fechaFin) params.append('fechaHora__lte', `${fechaFin}T23:59:59`);
    if (cursoFiltro) params.append('horario__curso', cursoFiltro);
    if (cursoFiltro) params.append('horario__curso', cursoFiltro);

    // Filter by status name (e.g. 'Presente')
    if (estadoFiltro) params.append('estado__nombre', estadoFiltro);

    if (minTempFiltro) params.append('temperatura__gte', minTempFiltro);
    if (maxTempFiltro) params.append('temperatura__lte', maxTempFiltro);
    if (ordering) params.append('ordering', ordering);

    return params.toString();
  };

  const cargarDatos = async (url?: string) => {
    setLoading(true);
    try {
      let endpoint = url;
      if (!endpoint) {
        endpoint = `/asistencias/?${buildQueryString()}`;
      }

      const response = await apiRequest(endpoint);
      if (response.ok) {
        const data = await response.json();
        setAsistencias(data.results);
        setTotalRecords(data.count);
        setNextUrl(data.next);
        setPreviousUrl(data.previous);

        // Calculate page
        let pageForUrl = 1;
        if (url) {
          const urlObj = new URL(url, window.location.origin);
          const pageParam = urlObj.searchParams.get('page');
          pageForUrl = pageParam ? parseInt(pageParam) : 1;
          setCurrentPage(pageForUrl);
        } else {
          // Reset to 1 if loading default/filtered list without specific URL
          setCurrentPage(1);
        }

        // Update browser URL without reloading
        const cleanParams = new URLSearchParams();
        if (searchTerm) cleanParams.set('search', searchTerm);
        if (fechaInicio) cleanParams.set('fechaInicio', fechaInicio);
        if (fechaFin) cleanParams.set('fechaFin', fechaFin);
        if (cursoFiltro) cleanParams.set('curso', cursoFiltro);
        if (estadoFiltro) cleanParams.set('estado', estadoFiltro);
        if (minTempFiltro) cleanParams.set('minTemp', minTempFiltro);
        if (ordering) cleanParams.set('ordering', ordering);

        if (pageForUrl > 1) cleanParams.set('page', pageForUrl.toString());

        setSearchParams(cleanParams);
      }
    } catch (error) {
      console.error('Error cargando asistencias:', error);
      showToast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cargarCursos = async () => {
    try {
      const response = await apiRequest('/cursos/');
      if (response.ok) {
        const data = await response.json();
        setCursos(data.results || data || []);
      }
    } catch (error) {
      // console.error(error);
    }
  };
  const fetchStats = async (queryString: string) => {
    try {
      const response = await apiRequest(`/asistencias/stats/?${queryString}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    cargarCursos();
  }, []);

  // Trigger load when filters change
  useEffect(() => {
    const query = buildQueryString();
    cargarDatos();
    fetchStats(query);
  }, [searchTerm, fechaInicio, fechaFin, cursoFiltro, estadoFiltro, minTempFiltro, maxTempFiltro, ordering]);

  const handleCardClick = (filtro: string) => {
    if (filtro === 'Fiebre') {
      setMinTempFiltro(prev => prev === '37.6' ? '' : '37.6');
      setEstadoFiltro('');
    } else {
      setEstadoFiltro(prev => prev === filtro ? '' : filtro);
      setMinTempFiltro('');
    }
  };

  const handlePageClick = (page: number) => {
    const params = new URLSearchParams();
    // Use 'persona__nombre' if that's what backend expects for search, OR 'search' if backend `SearchFilter` is configured to `search_fields`.
    // `buildQueryString` at line 87 uses: `if (searchTerm) params.append('persona__nombre', searchTerm);`
    // So we stick to that.
    if (searchTerm) params.append('persona__nombre', searchTerm);
    if (fechaInicio) params.append('fechaHora__gte', `${fechaInicio}T00:00:00`);
    if (fechaFin) params.append('fechaHora__lte', `${fechaFin}T23:59:59`);
    if (cursoFiltro) params.append('horario__curso', cursoFiltro);

    // Filter by status name (e.g. 'Presente')
    if (estadoFiltro) params.append('estado__nombre', estadoFiltro);

    if (minTempFiltro) params.append('temperatura__gte', minTempFiltro);
    if (maxTempFiltro) params.append('temperatura__lte', maxTempFiltro);
    if (ordering) params.append('ordering', ordering);

    params.append('page', page.toString());

    cargarDatos(`/asistencias/?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalRecords / pageSize);

  const getPageNumbers = () => {
    const delta = 2;
    const range: number[] = []; // Explicit type
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    const pages: (number | string)[] = []; // Explicit type

    if (totalPages >= 1) pages.push(1);

    if (range.length > 0 && range[0] > 2) {
      pages.push('...');
    }

    range.forEach(i => pages.push(i));

    if (range.length > 0 && range[range.length - 1] < totalPages - 1) {
      pages.push('...');
    }

    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const handleEdit = (asistencia: Asistencia) => {
    setEditingAsistencia(asistencia);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsistencia) return;
    try {
      const response = await apiRequest(`/asistencias/${editingAsistencia.idAsistencia}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaHora: editingAsistencia.fechaHora,
          temperatura: editingAsistencia.temperatura,
          estado: editingAsistencia.estado.idEstadoAsistencia
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingAsistencia(null);
        cargarDatos(previousUrl ? undefined : undefined); // Refresh current filters
        showToast('Asistencia actualizada correctamente', 'success');
      }
    } catch (error) {
      showToast('Error al actualizar', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await apiRequest(`/asistencias/${id}/`, { method: 'DELETE' });
      if (response.ok) {
        setDeleteConfirm(null);
        cargarDatos();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFechaInicio('');
    setFechaFin('');
    setCursoFiltro('');
    setEstadoFiltro('');
    setMinTempFiltro('');
    setMaxTempFiltro('');
  };

  // Pagination Handlers
  const handleNextPage = () => {
    if (nextUrl) {
      // Extract relative path + query from full URL
      try {
        const urlObj = new URL(nextUrl);
        const relativePath = urlObj.pathname + urlObj.search;
        // Remove /back/api prefix if present (apiRequest will add /api)
        const cleanUrl = relativePath.replace(/^\/back\/api/, '');
        cargarDatos(cleanUrl);
      } catch (e) {
        cargarDatos(nextUrl); // Fallback
      }
    }
  };

  const handlePreviousPage = () => {
    if (previousUrl) {
      try {
        const urlObj = new URL(previousUrl);
        const relativePath = urlObj.pathname + urlObj.search;
        const cleanUrl = relativePath.replace(/^\/back\/api/, '');
        cargarDatos(cleanUrl);
      } catch (e) {
        cargarDatos(previousUrl);
      }
    }
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="as-main-container">
      {/* Header & Controls */}
      <div className="as-header-controls">
        <div className="as-title-group">
          <div className="as-title-bar"></div>
          <h3 className="as-page-title">Asistencias</h3>
          <span className="as-count-badge">{totalRecords} REGISTROS</span>
        </div>

        <div className="as-filters-row">
          <div className="as-input-group">
            <i className="bi bi-search as-input-icon"></i>
            <input
              type="text"
              className="as-input"
              placeholder="Buscar persona..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <input
            type="date"
            className="as-date-input"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
          />

          <input
            type="date"
            className="as-date-input"
            value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            placeholder="Fecha fin"
          />

          <select
            className="as-select"
            value={cursoFiltro}
            onChange={e => setCursoFiltro(e.target.value)}
          >
            <option value="">Todos los cursos</option>
            {cursos.map(c => (
              <option key={c.idCurso} value={c.idCurso}>{c.nombre}</option>
            ))}
          </select>

          <button className="as-btn-reset" title="Limpiar filtros" onClick={limpiarFiltros}>
            <i className="bi bi-x-circle"></i>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="as-stats-grid">
        <div
          className={`as-stat-card ${estadoFiltro === 'Presente' ? 'active' : ''}`}
          onClick={() => handleCardClick('Presente')}
          style={{ cursor: 'pointer' }}
        >
          <div className="as-stat-icon presentes">
            <i className="bi bi-check-circle-fill"></i>
          </div>
          <div className="as-stat-info">
            <h3>{stats.presentes}</h3>
            <p>Presentes (página)</p>
          </div>
        </div>
        <div
          className={`as-stat-card ${estadoFiltro === 'Tardanza' ? 'active' : ''}`}
          onClick={() => handleCardClick('Tardanza')}
          style={{ cursor: 'pointer' }}
        >
          <div className="as-stat-icon tardanzas">
            <i className="bi bi-exclamation-circle-fill"></i>
          </div>
          <div className="as-stat-info">
            <h3>{stats.tardanzas}</h3>
            <p>Tardanzas (página)</p>
          </div>
        </div>
        <div
          className={`as-stat-card ${estadoFiltro === 'Ausente' ? 'active' : ''}`}
          onClick={() => handleCardClick('Ausente')}
          style={{ cursor: 'pointer' }}
        >
          <div className="as-stat-icon ausentes">
            <i className="bi bi-x-circle-fill"></i>
          </div>
          <div className="as-stat-info">
            <h3>{stats.ausentes}</h3>
            <p>Ausentes (página)</p>
          </div>
        </div>
        <div
          className={`as-stat-card ${minTempFiltro === '37.6' ? 'active' : ''}`}
          onClick={() => handleCardClick('Fiebre')}
          style={{ cursor: 'pointer' }}
        >
          <div className="as-stat-icon fiebre" style={{ backgroundColor: '#ffe4e6', color: '#e11d48' }}>
            <i className="bi bi-thermometer-high"></i>
          </div>
          <div className="as-stat-info">
            <h3>{stats.fiebre}</h3>
            <p>Fiebre (página)</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="as-table-container">
        {loading ? (
          <div className="as-no-data"><i className="bi bi-hourglass-split"></i> Cargando...</div>
        ) : asistencias.length > 0 ? (
          <table className="as-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('persona__nombre')} className="sortable-header">
                  Persona {getSortIcon('persona__nombre')}
                </th>
                <th onClick={() => handleSort('horario__curso__nombre')} className="sortable-header">
                  Curso / Horario {getSortIcon('horario__curso__nombre')}
                </th>
                <th onClick={() => handleSort('fechaHora')} className="sortable-header">
                  Fecha/Hora {getSortIcon('fechaHora')}
                </th>
                <th onClick={() => handleSort('temperatura')} className="sortable-header">
                  Temp {getSortIcon('temperatura')}
                </th>
                <th onClick={() => handleSort('estado__nombre')} className="sortable-header">
                  Estado {getSortIcon('estado__nombre')}
                </th>
                <th>Detalle</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {asistencias.map(a => (
                <tr key={a.idAsistencia}>
                  <td>
                    <div className="as-user-cell">
                      <div className="as-avatar">
                        {a.persona?.foto ? <img src={a.persona.foto} alt="av" /> : <i className="bi bi-person"></i>}
                      </div>
                      <div className="as-user-info">
                        <div>{a.persona?.nombre || 'Desc.'}</div>
                        <div>ID: {a.persona?.idPersona || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {a.horario ? (
                      <div className="as-user-info">
                        <div>{a.horario.curso?.nombre || 'Curso Desc.'}</div>
                        {a.horario.hora_inicio && <div>{a.horario.hora_inicio.slice(0, 5)} - {a.horario.hora_fin.slice(0, 5)}</div>}
                      </div>
                    ) : <span style={{ color: '#94a3b8' }}>Sin Horario</span>}
                  </td>
                  <td><span style={{ fontWeight: 700 }}>{formatDateTime(a.fechaHora)}</span></td>
                  <td>
                    <span className={`as-badge ${a.temperatura > 37.5 ? 'temp-high' : 'temp-normal'}`}>
                      <i className="bi bi-thermometer-half"></i> {a.temperatura}°C
                    </span>
                  </td>
                  <td>
                    {/* Safe check for estado.nombre */}
                    {a.estado?.nombre === 'Presente' && <span className="as-badge presente">Presente</span>}
                    {a.estado?.nombre === 'Tardanza' && <span className="as-badge tardanza">Tardanza</span>}
                    {a.estado?.nombre === 'Ausente' && <span className="as-badge ausente">Ausente</span>}
                    {/* Fallback for other states */}
                    {!['Presente', 'Tardanza', 'Ausente'].includes(a.estado?.nombre) &&
                      <span className="as-badge">{a.estado?.nombre}</span>}
                  </td>
                  <td>
                    {a.llegada_tarde_minutos > 0 && <span style={{ color: '#fbbf24' }}>+ {a.llegada_tarde_minutos} min</span>}
                  </td>
                  <td>
                    <div className="as-actions">
                      <button className="as-btn-action as-btn-edit" onClick={() => handleEdit(a)}><i className="bi bi-pencil"></i></button>
                      {deleteConfirm === a.idAsistencia ? (
                        <>
                          <button className="as-btn-action as-btn-confirm" onClick={() => handleDelete(a.idAsistencia)}><i className="bi bi-check"></i></button>
                          <button className="as-btn-action as-btn-cancel" onClick={() => setDeleteConfirm(null)}><i className="bi bi-x"></i></button>
                        </>
                      ) : (
                        <button className="as-btn-action as-btn-delete" onClick={() => setDeleteConfirm(a.idAsistencia)}><i className="bi bi-trash"></i></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="as-no-data">
            <i className="bi bi-calendar-x" style={{ fontSize: '2rem', display: 'block', marginBottom: '16px' }}></i>
            No hay registros.
          </div>
        )}
      </div>



      {/* Pagination Controls */}
      {totalRecords > 0 && (
        <div className="as-pagination-container">
          <button
            onClick={handlePreviousPage}
            disabled={!previousUrl}
            className="as-btn-page navigation"
          >
            <i className="bi bi-chevron-left"></i>
          </button>

          <div className="as-page-numbers">
            {getPageNumbers().map((p, idx) => (
              <button
                key={idx}
                onClick={() => typeof p === 'number' ? handlePageClick(p) : null}
                className={`as-btn-page ${p === currentPage ? 'active' : ''} ${p === '...' ? 'dots' : ''}`}
                disabled={p === '...'}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={handleNextPage}
            disabled={!nextUrl}
            className="as-btn-page navigation"
          >
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      )}

      {/* Edit Modal (Preserved as is mostly) */}
      {showEditModal && editingAsistencia && (
        <div className="as-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="as-modal" onClick={e => e.stopPropagation()}>
            <div className="as-modal-header">
              <h3>Editar Asistencia</h3>
              <button onClick={() => setShowEditModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="as-modal-body">
                <div className="as-form-group">
                  <label>Persona</label>
                  <input type="text" value={editingAsistencia.persona?.nombre} disabled />
                </div>
                {/* ... inputs preserved ... */}
                <div className="as-form-group">
                  <label>Hora de Llegada</label>
                  <input type="datetime-local" value={editingAsistencia.fechaHora.slice(0, 16)} onChange={e => setEditingAsistencia({ ...editingAsistencia, fechaHora: new Date(e.target.value).toISOString() })} />
                </div>
                <div className="as-form-group">
                  <label>Temperatura</label>
                  <input type="number" step="0.1" value={editingAsistencia.temperatura} onChange={e => setEditingAsistencia({ ...editingAsistencia, temperatura: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div className="as-modal-footer">
                <button type="button" className="as-btn-secondary" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button type="submit" className="as-btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Asistencias;
