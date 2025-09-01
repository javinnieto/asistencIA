import React, { useState } from 'react';
import './PoloTecnologico.css';

const PoloTecnologico: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCurso, setSelectedCurso] = useState<any>(null);
  const [showAsistenciasModal, setShowAsistenciasModal] = useState(false);
  const [asistenciasManuales, setAsistenciasManuales] = useState<any[]>([]);
  const [nuevoAsistente, setNuevoAsistente] = useState({
    nombre: '',
    estado: 'presente',
    hora: '',
    temperatura: ''
  });

  // Datos de ejemplo para cursos extraprogramáticos
  const cursosExtraprogramaticos = [
    { id: 1, nombre: 'Programación Python', instructor: 'Dr. García', horario: 'Lun-Mié 18:00-20:00', participantes: 25, estado: 'activo' },
    { id: 2, nombre: 'Robótica Avanzada', instructor: 'Ing. Martínez', horario: 'Mar-Jue 19:00-21:00', participantes: 18, estado: 'activo' },
    { id: 3, nombre: 'Inteligencia Artificial', instructor: 'Dra. López', horario: 'Vie 16:00-19:00', participantes: 22, estado: 'activo' },
    { id: 4, nombre: 'Desarrollo Web', instructor: 'Lic. Rodríguez', horario: 'Sáb 10:00-13:00', participantes: 30, estado: 'activo' }
  ];

  const asistenciasHoy = [
    { id: 1, nombre: 'Juan Pérez', curso: 'Programación Python', hora: '18:15', estado: 'presente', temperatura: 36.5 },
    { id: 2, nombre: 'María González', curso: 'Robótica Avanzada', hora: '19:02', estado: 'presente', temperatura: 36.8 },
    { id: 3, nombre: 'Carlos Ruiz', curso: 'Inteligencia Artificial', hora: '16:05', estado: 'presente', temperatura: 36.2 },
    { id: 4, nombre: 'Ana Silva', curso: 'Desarrollo Web', hora: '10:30', estado: 'ausente', temperatura: null },
    { id: 5, nombre: 'Luis Torres', curso: 'Programación Python', hora: '18:25', estado: 'presente', temperatura: 36.7 }
  ];

  const personalAutorizado = [
    { id: 1, nombre: 'Dr. Carlos García', cargo: 'Instructor Principal', especialidad: 'Programación', estado: 'activo' },
    { id: 2, nombre: 'Ing. María Martínez', cargo: 'Instructora', especialidad: 'Robótica', estado: 'activo' },
    { id: 3, nombre: 'Dra. Ana López', cargo: 'Instructora', especialidad: 'IA/ML', estado: 'activo' },
    { id: 4, nombre: 'Lic. Roberto Rodríguez', cargo: 'Instructor', especialidad: 'Desarrollo Web', estado: 'activo' },
    { id: 5, nombre: 'Prof. Laura Sánchez', cargo: 'Asistente', especialidad: 'Soporte Técnico', estado: 'activo' }
  ];

  const handleCursoClick = (curso: any) => {
    setSelectedCurso(curso);
    setShowAsistenciasModal(true);
  };

  const handleAddAsistente = () => {
    if (nuevoAsistente.nombre && nuevoAsistente.hora) {
      const alumno = {
        id: Date.now(),
        ...nuevoAsistente,
        curso: selectedCurso.nombre,
        temperatura: nuevoAsistente.temperatura || null
      };
      setAsistenciasManuales([...asistenciasManuales, alumno]);
      setNuevoAsistente({
        nombre: '',
        estado: 'presente',
        hora: '',
        temperatura: ''
      });
    }
  };

  const handleRemoveAsistente = (id: number) => {
    setAsistenciasManuales(asistenciasManuales.filter(a => a.id !== id));
  };

  const handleCloseModal = () => {
    setShowAsistenciasModal(false);
    setSelectedCurso(null);
    setAsistenciasManuales([]);
  };

  return (
    <div className="polo-tecnologico-container">
      <div className="polo-header">
        <h1>Tecno Aliados</h1>
        <p>Gestión de cursos extraprogramáticos</p>
      </div>

      <div className="polo-tabs">
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <i className="bi bi-grid"></i>
          Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'cursos' ? 'active' : ''}`}
          onClick={() => setActiveTab('cursos')}
        >
          <i className="bi bi-book"></i>
          Cursos
        </button>
        <button 
          className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <i className="bi bi-people"></i>
          Personal
        </button>
      </div>

      <div className="polo-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-section">
            {/* EPA Section */}
            <div className="epa-section">
              <h2>EPA - Indicadores de Rendimiento</h2>
              <div className="epa-grid">
                <div className="epa-card">
                  <div className="epa-icon">
                    <i className="bi bi-graph-up"></i>
                  </div>
                  <div className="epa-info">
                    <h3>85%</h3>
                    <p>Tasa de Asistencia</p>
                  </div>
                </div>
                <div className="epa-card">
                  <div className="epa-icon">
                    <i className="bi bi-star"></i>
                  </div>
                  <div className="epa-info">
                    <h3>4.8/5</h3>
                    <p>Satisfacción Estudiantes</p>
                  </div>
                </div>
                <div className="epa-card">
                  <div className="epa-icon">
                    <i className="bi bi-trophy"></i>
                  </div>
                  <div className="epa-info">
                    <h3>92%</h3>
                    <p>Tasa de Finalización</p>
                  </div>
                </div>
                <div className="epa-card efectivos">
                  <div className="epa-icon">
                    <i className="bi bi-people-fill"></i>
                  </div>
                  <div className="epa-info">
                    <h3>95</h3>
                    <p>Efectivos</p>
                  </div>
                </div>
                <div className="epa-card presentes">
                  <div className="epa-icon">
                    <i className="bi bi-check-circle"></i>
                  </div>
                  <div className="epa-info">
                    <h3>81</h3>
                    <p>Presentes</p>
                  </div>
                </div>
                <div className="epa-card ausentes">
                  <div className="epa-icon">
                    <i className="bi bi-x-circle"></i>
                  </div>
                  <div className="epa-info">
                    <h3>14</h3>
                    <p>Ausentes</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Asistencias de Hoy */}
            <div className="asistencias-hoy-section">
              <div className="section-header">
                <h2>Asistencias de Hoy</h2>
                <div className="filters">
                  <select className="filter-select">
                    <option value="">Todos los cursos</option>
                    <option value="python">Programación Python</option>
                    <option value="robotica">Robótica Avanzada</option>
                    <option value="ia">Inteligencia Artificial</option>
                    <option value="web">Desarrollo Web</option>
                  </select>
                  <select className="filter-select">
                    <option value="">Todos los estados</option>
                    <option value="presente">Presente</option>
                    <option value="ausente">Ausente</option>
                  </select>
                </div>
              </div>
              
              <div className="asistencias-table">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Curso</th>
                      <th>Hora</th>
                      <th>Estado</th>
                      <th>Temperatura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asistenciasHoy.map(asistencia => (
                      <tr key={asistencia.id}>
                        <td>{asistencia.nombre}</td>
                        <td>{asistencia.curso}</td>
                        <td>{asistencia.hora}</td>
                        <td>
                          <span className={`estado-badge ${asistencia.estado}`}>
                            {asistencia.estado === 'presente' ? '✅ Presente' : '❌ Ausente'}
                          </span>
                        </td>
                        <td>
                          {asistencia.temperatura ? `${asistencia.temperatura}°C` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Personal Autorizado */}
            <div className="personal-autorizado-section">
              <h2>Personal Autorizado</h2>
              <div className="personal-grid">
                {personalAutorizado.map(persona => (
                  <div key={persona.id} className="personal-card">
                    <div className="personal-avatar">
                      <i className="bi bi-person-circle"></i>
                    </div>
                    <div className="personal-info">
                      <h4>{persona.nombre}</h4>
                      <p className="cargo">{persona.cargo}</p>
                      <p className="especialidad">{persona.especialidad}</p>
                      <span className={`estado-badge ${persona.estado}`}>
                        {persona.estado === 'activo' ? '🟢 Activo' : '🔴 Inactivo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cursos' && (
          <div className="cursos-section">
            <h2>Cursos Extraprogramáticos</h2>
            <div className="cursos-grid">
              {cursosExtraprogramaticos.map(curso => (
                <div key={curso.id} className="curso-card" onClick={() => handleCursoClick(curso)}>
                  <div className="curso-header">
                    <h3>{curso.nombre}</h3>
                    <span className={`estado-badge ${curso.estado}`}>
                      {curso.estado === 'activo' ? '🟢 Activo' : '🔴 Inactivo'}
                    </span>
                  </div>
                  <div className="curso-info">
                    <p><i className="bi bi-person"></i> {curso.instructor}</p>
                    <p><i className="bi bi-clock"></i> {curso.horario}</p>
                    <p><i className="bi bi-people"></i> {curso.participantes} participantes</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="personal-detalle-section">
            <h2>Gestión de Personal Autorizado</h2>
            <p>Contenido detallado de personal próximamente...</p>
          </div>
        )}
      </div>

      {/* Modal de Asistencias Manuales */}
      {showAsistenciasModal && selectedCurso && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Cargar Alumnos - {selectedCurso.nombre}</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            
            <div className="modal-body">
              {/* Formulario para agregar alumno */}
              <div className="add-asistente-form">
                <h4>Agregar Alumno</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre:</label>
                    <input
                      type="text"
                      value={nuevoAsistente.nombre}
                      onChange={(e) => setNuevoAsistente({...nuevoAsistente, nombre: e.target.value})}
                      placeholder="Nombre del alumno"
                    />
                  </div>
                  <div className="form-group">
                    <label>Hora:</label>
                    <input
                      type="time"
                      value={nuevoAsistente.hora}
                      onChange={(e) => setNuevoAsistente({...nuevoAsistente, hora: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Estado:</label>
                    <select
                      value={nuevoAsistente.estado}
                      onChange={(e) => setNuevoAsistente({...nuevoAsistente, estado: e.target.value})}
                    >
                      <option value="presente">Presente</option>
                      <option value="ausente">Ausente</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Temperatura (°C): <span style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem'}}>(opcional)</span></label>
                    <input
                      type="number"
                      step="0.1"
                      min="35"
                      max="42"
                      value={nuevoAsistente.temperatura}
                      onChange={(e) => setNuevoAsistente({...nuevoAsistente, temperatura: e.target.value})}
                      placeholder="36.5 (opcional)"
                    />
                  </div>
                </div>
                <button className="btn-add-asistente" onClick={handleAddAsistente}>
                  <i className="bi bi-plus-circle"></i>
                  Agregar Alumno
                </button>
              </div>

              {/* Lista de alumnos cargados */}
              <div className="asistencias-list">
                <h4>Alumnos Cargados ({asistenciasManuales.length})</h4>
                {asistenciasManuales.length === 0 ? (
                  <p className="no-asistencias">No hay alumnos cargados aún</p>
                ) : (
                  <div className="asistencias-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Hora</th>
                          <th>Estado</th>
                          <th>Temperatura</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {asistenciasManuales.map(alumno => (
                          <tr key={alumno.id}>
                            <td>{alumno.nombre}</td>
                            <td>{alumno.hora}</td>
                            <td>
                              <span className={`estado-badge ${alumno.estado}`}>
                                {alumno.estado === 'presente' ? '✅ Presente' : '❌ Ausente'}
                              </span>
                            </td>
                            <td>
                              {alumno.temperatura ? `${alumno.temperatura}°C` : '-'}
                            </td>
                            <td>
                              <button 
                                className="btn-remove-asistente"
                                onClick={() => handleRemoveAsistente(alumno.id)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseModal}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleCloseModal}>
                Guardar Alumnos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoloTecnologico; 