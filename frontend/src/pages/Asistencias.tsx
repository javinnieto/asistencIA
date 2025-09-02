import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Notification, { NotificationType } from '../components/Notification';
import ExportButton from '../components/ExportButton';

import { apiRequest } from '../config/api';
import './Asistencias.css';

interface Asistencia {
  idAsistencia: number;
  persona: {
    idPersona: number;
    nombre: string;
    curso?: { idCurso: number; nombre: string } | null;
  };
  fecha_hora: string;
  temperatura: number;
  estado: { idEstadoAsistencia: number; nombre: string };
  justificacion?: {
    tipo: 'salud' | 'justificado' | 'varios';
    comentario?: string;
  };
}

interface Persona {
  idPersona: number;
  nombre: string;
  tipo: 'alumno' | 'profesor' | 'personal';
  curso?: { idCurso: number; nombre: string } | null;
}

const Asistencias: React.FC = () => {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    estado: '',
    tipo: ''
  });

  // Cargar datos reales del backend
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        // Cargar personas
        const responsePersonas = await apiRequest('/personas/');
        if (responsePersonas.ok) {
          const dataPersonas = await responsePersonas.json();
          const personasTransformadas = dataPersonas.results.map((persona: any) => ({
        idPersona: persona.idPersona,
        nombre: persona.nombre,
            tipo: persona.tipo.nombre === 'Estudiante' ? 'alumno' : 
                  persona.tipo.nombre === 'Profesor' ? 'profesor' : 'personal',
        curso: persona.curso
          }));
          setPersonas(personasTransformadas);
        }

        // Cargar asistencias
        const responseAsistencias = await apiRequest('/asistencias/');
        if (responseAsistencias.ok) {
          const dataAsistencias = await responseAsistencias.json();
          const asistenciasTransformadas = dataAsistencias.results.map((asistencia: any) => ({
            idAsistencia: asistencia.idAsistencia,
            persona: {
              idPersona: asistencia.persona.idPersona,
              nombre: asistencia.persona.nombre,
              curso: asistencia.persona.curso
            },
            fecha_hora: asistencia.fechaHora,
            temperatura: asistencia.temperatura,
            estado: asistencia.estado,
            justificacion: asistencia.justificacion || undefined
          }));
          setAsistencias(asistenciasTransformadas);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Filtrar asistencias
  const asistenciasFiltradas = asistencias.filter(asistencia => {
    const matchesSearch = searchTerm === '' || 
      asistencia.persona.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFechaInicio = !filtros.fechaInicio || 
      new Date(asistencia.fecha_hora) >= new Date(filtros.fechaInicio);
    
    const matchesFechaFin = !filtros.fechaFin || 
      new Date(asistencia.fecha_hora) <= new Date(filtros.fechaFin + 'T23:59:59');
    
    const matchesEstado = !filtros.estado || 
      asistencia.estado.idEstadoAsistencia.toString() === filtros.estado;
    
    const matchesTipo = !filtros.tipo || 
      (filtros.tipo === 'alumno' && asistencia.persona.curso) ||
      (filtros.tipo === 'profesor' && !asistencia.persona.curso && asistencia.persona.nombre.includes('Prof.')) ||
      (filtros.tipo === 'personal' && !asistencia.persona.curso && !asistencia.persona.nombre.includes('Prof.'));

    return matchesSearch && matchesFechaInicio && matchesFechaFin && matchesEstado && matchesTipo;
  });

  // Paginación
  const totalPages = Math.ceil(asistenciasFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const asistenciasPaginadas = asistenciasFiltradas.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="row mb-4">
        <div className="col-md-6">
          <h2 className="mb-0">
            <i className="bi bi-clipboard-check me-2"></i>
            Gestión de Asistencias
          </h2>
        </div>
        <div className="col-md-6 text-end">
            <button 
            className="btn btn-primary me-2"
            onClick={() => setShowForm(true)}
          >
            <i className="bi bi-plus-circle me-1"></i>
            Nueva Asistencia
            </button>
          <ExportButton data={asistenciasFiltradas} filename="asistencias" />
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-funnel me-2"></i>
            Filtros de Búsqueda
          </h5>
                  </div>
                  <div className="card-body">
          <div className="row">
            <div className="col-md-3 mb-3">
              <label className="form-label">Buscar persona</label>
                            <input
                              type="text"
                              className="form-control"
                placeholder="Nombre de la persona..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
              />
                </div>
            <div className="col-md-2 mb-3">
                  <label className="form-label">Fecha Inicio</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filtros.fechaInicio}
                onChange={(e) => setFiltros({...filtros, fechaInicio: e.target.value})}
                  />
                </div>
            <div className="col-md-2 mb-3">
                  <label className="form-label">Fecha Fin</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filtros.fechaFin}
                onChange={(e) => setFiltros({...filtros, fechaFin: e.target.value})}
                  />
                </div>
            <div className="col-md-2 mb-3">
                  <label className="form-label">Estado</label>
                  <select
                    className="form-select"
                    value={filtros.estado}
                onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
                  >
                    <option value="">Todos</option>
                <option value="1">Presente</option>
                <option value="2">Ausente</option>
                <option value="3">Tardanza</option>
                  </select>
                </div>
            <div className="col-md-2 mb-3">
                  <label className="form-label">Tipo</label>
                  <select
                    className="form-select"
                    value={filtros.tipo}
                onChange={(e) => setFiltros({...filtros, tipo: e.target.value})}
                  >
                    <option value="">Todos</option>
                    <option value="alumno">Alumnos</option>
                    <option value="profesor">Profesores</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
            <div className="col-md-1 mb-3 d-flex align-items-end">
                  <button
                className="btn btn-warning"
                    onClick={() => {
                  setFiltros({fechaInicio: '', fechaFin: '', estado: '', tipo: ''});
                  setSearchTerm('');
                }}
              >
                <i className="bi bi-arrow-clockwise"></i>
                  </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Asistencias */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-table me-2"></i>
            Asistencias ({asistenciasFiltradas.length})
          </h5>
                    <div className="d-flex align-items-center">
            <label className="form-label me-2 mb-0">Mostrar:</label>
                      <select
                        className="form-select form-select-sm"
              style={{width: 'auto'}}
                        value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
              <option value={100}>100</option>
                      </select>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Persona</th>
                  <th>Tipo</th>
                  <th>Curso</th>
                  <th>Fecha y Hora</th>
                  <th>Temperatura</th>
                  <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                {asistenciasPaginadas.map((asistencia) => (
                  <tr key={asistencia.idAsistencia}>
                    <td>
                      <strong>{asistencia.persona.nombre}</strong>
                      <br />
                      <small className="text-muted">ID: {asistencia.persona.idPersona}</small>
                          </td>
                    <td>
                      <span className={`badge ${
                        asistencia.persona.curso ? 'bg-primary' : 
                        asistencia.persona.nombre.includes('Prof.') ? 'bg-warning' : 'bg-secondary'
                      }`}>
                              {asistencia.persona.curso ? 'Alumno' : 
                         asistencia.persona.nombre.includes('Prof.') ? 'Profesor' : 'Personal'}
                            </span>
                          </td>
                    <td>{asistencia.persona.curso?.nombre || 'Sin curso'}</td>
                    <td>
                      {new Date(asistencia.fecha_hora).toLocaleString('es-ES')}
                          </td>
                    <td>
                      <span className={`badge ${
                        asistencia.temperatura > 37.5 ? 'bg-danger' : 
                        asistencia.temperatura > 37.0 ? 'bg-warning' : 'bg-success'
                      }`}>
                        {asistencia.temperatura > 0 ? `${asistencia.temperatura}°C` : 'N/A'}
                                </span>
                          </td>
                    <td>
                      <span className={`badge ${
                        asistencia.estado.nombre === 'Presente' ? 'bg-success' : 
                        asistencia.estado.nombre === 'Tardanza' ? 'bg-warning' : 'bg-danger'
                      }`}>
                                {asistencia.estado.nombre}
                              </span>
                          </td>
                    <td>
                                  <button 
                        className="btn btn-sm btn-outline-primary me-1"
                                    title="Editar"
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </button>
                                  <button 
                        className="btn btn-sm btn-outline-danger"
                                    title="Eliminar"
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                          </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                </div>
        <div className="card-footer">
              {/* Paginación */}
          <nav aria-label="Paginación de asistencias">
            <ul className="pagination pagination-sm justify-content-center mb-0">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                  onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                  Anterior
                          </button>
                        </li>
                        
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                <button
                                  className="page-link"
                    onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </button>
                              </li>
              ))}
              
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                  onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                  Siguiente
                          </button>
                        </li>
                      </ul>
                    </nav>
      </div>
        </div>

      
    </div>
  );
};

export default Asistencias; 
