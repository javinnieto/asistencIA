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
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ presentes: 0, tardanzas: 0, ausentes: 0, fiebre: 0 });

  // Filtros
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [cursoFiltro, setCursoFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState(searchParams.get('estado') || '');
  const [minTempFiltro, setMinTempFiltro] = useState(searchParams.get('minTemp') || '');
  const [maxTempFiltro, setMaxTempFiltro] = useState(searchParams.get('maxTemp') || '');

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAsistencia, setEditingAsistencia] = useState<Asistencia | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Sorting
  const [ordering, setOrdering] = useState('-fechaHora');

  const handleSort = (field: string) => {
    if (ordering === field) {
      setOrdering(`-${field}`);
    } else if (ordering === `-${field}`) {
      setOrdering(field);
    } else {
      setOrdering(`-${field}`);
    }
  };

  const getSortIcon = (field: string) => {
    if (ordering === field) return <i className="bi bi-sort-down"></i>;
    if (ordering === `-${field}`) return <i className="bi bi-sort-up"></i>;
    return <i className="bi bi-arrow-down-up" style={{ opacity: 0.3 }}></i>;
  };

  const cargarDatos = async () => {
    try {
      let queryParams = [];
      if (fechaInicio) queryParams.push(`fechaHora__gte=${fechaInicio}T00:00:00`);
      if (fechaFin) queryParams.push(`fechaHora__lte=${fechaFin}T23:59:59`);
      if (cursoFiltro) queryParams.push(`horario__curso=${cursoFiltro}`);
      if (ordering) queryParams.push(`ordering=${ordering}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const response = await apiRequest(`/asistencias/${queryString}`);

      if (response.ok) {
        const data = await response.json();
        const mappedData: Asistencia[] = data.results.map((a: any) => ({
          idAsistencia: a.idAsistencia,
          persona: a.persona,
          fechaHora: a.fechaHora,
          temperatura: a.temperatura,
          estado: a.estado,
          horario: a.horario,
          llegada_tarde_minutos: a.llegada_tarde_minutos || 0
        }));

        setAsistencias(mappedData);
        calculateStats(mappedData);
      }
    } catch (error) {
      console.error('Error cargando asistencias:', error);
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
      console.error('Error cargando cursos:', error);
    }
  };

  useEffect(() => {
    cargarDatos();
    cargarCursos();
    const interval = setInterval(cargarDatos, 30000);
    return () => clearInterval(interval);
  }, [fechaInicio, fechaFin, cursoFiltro, ordering]);

  const calculateStats = (data: Asistencia[]) => {
    const presentes = data.filter(a => a.estado?.nombre === 'Presente').length;
    const tardanzas = data.filter(a => a.estado?.nombre === 'Tardanza').length;
    const ausentes = data.filter(a => a.estado?.nombre === 'Ausente').length;
    const fiebre = data.filter(a => a.temperatura > 37.5).length;
    setStats({ presentes, tardanzas, ausentes, fiebre });
  };

  const filteredAsistencias = asistencias.filter(a => {
    const matchesSearch = includesNormalized(a.persona?.nombre || '', searchTerm);
    const matchesEstado = !estadoFiltro || a.estado?.nombre === estadoFiltro;
    const matchesTempMin = !minTempFiltro || a.temperatura >= parseFloat(minTempFiltro);
    const matchesTempMax = !maxTempFiltro || a.temperatura <= parseFloat(maxTempFiltro);
    // Fiebre filter integration: if minTemp is 37.5 (our fever threshold), we consider it the fever filter
    return matchesSearch && matchesEstado && matchesTempMin && matchesTempMax;
  });

  const statsActuales = {
    presentes: filteredAsistencias.filter(a => a.estado?.nombre === 'Presente').length,
    tardanzas: filteredAsistencias.filter(a => a.estado?.nombre === 'Tardanza').length,
    ausentes: filteredAsistencias.filter(a => a.estado?.nombre === 'Ausente').length,
    fiebre: filteredAsistencias.filter(a => a.temperatura > 37.5).length
  };

  const handleCardClick = (filtro: string) => {
    if (filtro === 'Fiebre') {
      if (minTempFiltro === '37.6') {
        setMinTempFiltro('');
      } else {
        setMinTempFiltro('37.6');
      }
      setEstadoFiltro(''); // Reset status filter when clicking fever
    } else {
      if (estadoFiltro === filtro) {
        setEstadoFiltro('');
      } else {
        setEstadoFiltro(filtro);
        setMinTempFiltro(''); // Reset temp filter when clicking status
      }
    }
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
        cargarDatos();
        showToast('Asistencia actualizada correctamente', 'success');
      }
    } catch (error) {
      console.error('Error editando asistencia:', error);
      showToast('Error al actualizar asistencia', 'error');
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
      console.error('Error eliminando asistencia:', error);
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

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="as-main-container">
      {/* Header & Controls */}
      <div className="as-header-controls">
        <div className="as-title-group">
          <div className="as-title-bar"></div>
          <h3 className="as-page-title">Asistencias</h3>
          <span className="as-count-badge">{filteredAsistencias.length} REGISTROS</span>
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
            placeholder="Fecha fin (opcional)"
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

      {/* Stats Cards - Clickeable para filtrar */}
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
            <h3>{statsActuales.presentes}</h3>
            <p>Presentes</p>
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
            <h3>{statsActuales.tardanzas}</h3>
            <p>Tardanzas</p>
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
            <h3>{statsActuales.ausentes}</h3>
            <p>Ausentes</p>
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
            <h3>{statsActuales.fiebre}</h3>
            <p>Fiebre</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="as-table-container">
        {loading ? (
          <div className="as-no-data"><i className="bi bi-hourglass-split"></i> Cargando...</div>
        ) : filteredAsistencias.length > 0 ? (
          <table className="as-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Curso / Horario</th>
                <th>Fecha/Hora</th>
                <th
                  onClick={() => handleSort('temperatura')}
                  style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Ordenar por temperatura"
                  className="sortable-header"
                >
                  Temp {getSortIcon('temperatura')}
                </th>
                <th>Estado</th>
                <th>Detalle</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAsistencias.map(a => (
                <tr key={a.idAsistencia}>
                  <td>
                    <div className="as-user-cell">
                      <div className="as-avatar">
                        {a.persona?.foto ? (
                          <img src={a.persona.foto} alt="avatar" />
                        ) : (
                          <i className="bi bi-person"></i>
                        )}
                      </div>
                      <div className="as-user-info">
                        <div>{a.persona?.nombre || 'Usuario Desconocido'}</div>
                        <div>ID: {a.persona?.idPersona || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {a.horario ? (
                      <div className="as-user-info">
                        <div>{a.horario.curso?.nombre || 'Curso Desconocido'}</div>
                        <div>{a.horario.hora_inicio?.slice(0, 5)} - {a.horario.hora_fin?.slice(0, 5)}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#64748b' }}>Sin Horario</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatDateTime(a.fechaHora)}</span>
                  </td>
                  <td>
                    <span className={`as-badge ${a.temperatura > 37.5 ? 'temp-high' : 'temp-normal'}`}>
                      <i className="bi bi-thermometer-half"></i> {a.temperatura}°C
                    </span>
                  </td>
                  <td>
                    {a.estado?.nombre === 'Presente' && (
                      <span className="as-badge presente">Presente</span>
                    )}
                    {a.estado?.nombre === 'Tardanza' && (
                      <span className="as-badge tardanza">Tardanza</span>
                    )}
                    {a.estado?.nombre === 'Ausente' && (
                      <span className="as-badge ausente">Ausente</span>
                    )}
                  </td>
                  <td>
                    {a.llegada_tarde_minutos > 0 && (
                      <span style={{ color: '#fbbf24', fontSize: '0.85rem' }}>
                        + {a.llegada_tarde_minutos} min
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="as-actions">
                      <button
                        className="as-btn-action as-btn-edit"
                        onClick={() => handleEdit(a)}
                        title="Editar"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      {deleteConfirm === a.idAsistencia ? (
                        <>
                          <button
                            className="as-btn-action as-btn-confirm"
                            onClick={() => handleDelete(a.idAsistencia)}
                            title="Confirmar"
                          >
                            <i className="bi bi-check"></i>
                          </button>
                          <button
                            className="as-btn-action as-btn-cancel"
                            onClick={() => setDeleteConfirm(null)}
                            title="Cancelar"
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        </>
                      ) : (
                        <button
                          className="as-btn-action as-btn-delete"
                          onClick={() => setDeleteConfirm(a.idAsistencia)}
                          title="Eliminar"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
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
            No hay registros de asistencia para los filtros aplicados.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingAsistencia && (
        <div className="as-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="as-modal" onClick={e => e.stopPropagation()}>
            <div className="as-modal-header">
              <h3>Editar Asistencia</h3>
              <button onClick={() => setShowEditModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="as-modal-body">
                <div className="as-form-group">
                  <label>Persona</label>
                  <input type="text" value={editingAsistencia.persona?.nombre} disabled />
                </div>
                <div className="as-form-group">
                  <label>Hora de Llegada</label>
                  <input
                    type="datetime-local"
                    value={editingAsistencia.fechaHora.slice(0, 16)}
                    onChange={e => setEditingAsistencia({
                      ...editingAsistencia,
                      fechaHora: new Date(e.target.value).toISOString()
                    })}
                  />
                  <small style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    Al cambiar la hora, el estado se recalculará automáticamente
                  </small>
                </div>
                <div className="as-form-group">
                  <label>Temperatura (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingAsistencia.temperatura}
                    onChange={e => setEditingAsistencia({
                      ...editingAsistencia,
                      temperatura: parseFloat(e.target.value)
                    })}
                  />
                </div>
              </div>
              <div className="as-modal-footer">
                <button type="button" className="as-btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="as-btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Asistencias;
