import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { apiRequest } from '../config/api';
import DashboardStats from '../components/DashboardStats';

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

const Reportes: React.FC = () => {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [nivelEducativo, setNivelEducativo] = useState<'todos' | 'primaria' | 'secundaria' | 'docentes' | 'personal'>('todos');
  const [cursoSeleccionado, setCursoSeleccionado] = useState<string>('todos');
  
  // Nuevos filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [estadoAsistencia, setEstadoAsistencia] = useState<'todos' | 'presente' | 'ausente'>('todos');
  const [tipoPersona, setTipoPersona] = useState<'todos' | 'alumnos' | 'profesores' | 'personal'>('todos');
  const [temperaturaMin, setTemperaturaMin] = useState('');
  const [temperaturaMax, setTemperaturaMax] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarDashboard, setMostrarDashboard] = useState(false);

  // Función para determinar si un curso pertenece a primaria o secundaria
  const obtenerNivelCurso = (nombreCurso: string): 'primaria' | 'secundaria' | null => {
    const curso = nombreCurso.toLowerCase();
    
    // Primaria: 1er a 7mo grado
    if (curso.includes('1er') || curso.includes('2do') || curso.includes('3er') || 
        curso.includes('4to') || curso.includes('5to') || curso.includes('6to') || curso.includes('7mo')) {
      return 'primaria';
    }
    
    // Secundaria: 1er a 5to año
    if (curso.includes('1er año') || curso.includes('2do año') || curso.includes('3er año') || 
        curso.includes('4to año') || curso.includes('5to año')) {
      return 'secundaria';
    }
    
    return null;
  };

  // Función para determinar el tipo de persona
  const obtenerTipoPersona = (asistencia: Asistencia): 'alumnos' | 'profesores' | 'personal' => {
    if (!asistencia.persona.curso) {
      if (asistencia.persona.nombre.includes('Prof')) {
        return 'profesores';
      }
      return 'personal';
    }
    return 'alumnos';
  };

  // Función para obtener el título del reporte
  const obtenerTituloReporte = (): string => {
    let titulo = 'Reporte de Asistencias';
    
    if (nivelEducativo === 'primaria') {
      titulo += ' - Primaria';
      if (cursoSeleccionado !== 'todos') {
        titulo += ` - ${cursoSeleccionado}`;
      }
    } else if (nivelEducativo === 'secundaria') {
      titulo += ' - Secundaria';
      if (cursoSeleccionado !== 'todos') {
        titulo += ` - ${cursoSeleccionado}`;
      }
    } else if (nivelEducativo === 'docentes') {
      titulo += ' - Docentes';
    } else if (nivelEducativo === 'personal') {
      titulo += ' - Personal no Docente';
    } else {
      titulo += ' - Todos los Niveles';
    }
    
    return titulo;
  };

  // Función para exportar a Excel
  const exportarExcel = () => {
    const datos = asistenciasFiltradas.map(asistencia => ({
      'ID': asistencia.idAsistencia,
      'Persona': asistencia.persona.nombre,
      'Curso': asistencia.persona.curso?.nombre || 'Sin curso',
      'Fecha': new Date(asistencia.fecha_hora).toLocaleString(),
      'Estado': asistencia.estado.nombre,
      'Temperatura': asistencia.temperatura > 0 ? `${asistencia.temperatura}°C` : 'N/A',
      'Tipo': obtenerTipoPersona(asistencia) === 'alumnos' ? 'Alumno' : obtenerTipoPersona(asistencia) === 'profesores' ? 'Profesor' : 'Personal',
      'Justificación': asistencia.justificacion?.comentario || ''
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `${obtenerTituloReporte()}.xlsx`);
  };

  // Función para exportar a PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text(obtenerTituloReporte(), 14, 20);
    
    // Información del reporte
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total de registros: ${asistenciasFiltradas.length}`, 14, 35);
    
    // Tabla
    const datos = asistenciasFiltradas.map(asistencia => [
      asistencia.persona.nombre,
      asistencia.persona.curso?.nombre || 'Sin curso',
      new Date(asistencia.fecha_hora).toLocaleDateString(),
      asistencia.estado.nombre,
      asistencia.temperatura > 0 ? `${asistencia.temperatura}°C` : 'N/A',
      obtenerTipoPersona(asistencia) === 'alumnos' ? 'Alumno' : obtenerTipoPersona(asistencia) === 'profesores' ? 'Profesor' : 'Personal'
    ]);

    autoTable(doc, {
      head: [['Persona', 'Curso', 'Fecha', 'Estado', 'Temperatura', 'Tipo']],
      body: datos,
      startY: 45,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255
      }
    });

    doc.save(`${obtenerTituloReporte()}.pdf`);
  };

  // Función para exportar a Word (HTML)
  const exportarWord = () => {
    const datos = asistenciasFiltradas.map(asistencia => `
      <tr>
        <td>${asistencia.persona.nombre}</td>
        <td>${asistencia.persona.curso?.nombre || 'Sin curso'}</td>
        <td>${new Date(asistencia.fecha_hora).toLocaleString()}</td>
        <td>${asistencia.estado.nombre}</td>
        <td>${asistencia.temperatura > 0 ? `${asistencia.temperatura}°C` : 'N/A'}</td>
        <td>${obtenerTipoPersona(asistencia) === 'alumnos' ? 'Alumno' : obtenerTipoPersona(asistencia) === 'profesores' ? 'Profesor' : 'Personal'}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${obtenerTituloReporte()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #428bca; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .info { margin: 10px 0; color: #666; }
        </style>
      </head>
      <body>
        <h1>${obtenerTituloReporte()}</h1>
        <div class="info">
          <p><strong>Fecha de generación:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total de registros:</strong> ${asistenciasFiltradas.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Persona</th>
              <th>Curso</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Temperatura</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            ${datos}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    saveAs(blob, `${obtenerTituloReporte()}.html`);
  };

  // Filtrar asistencias por todos los criterios
  const asistenciasFiltradas = asistencias.filter(asistencia => {
    // Filtrar por nivel educativo
    if (nivelEducativo === 'primaria' || nivelEducativo === 'secundaria') {
      // Solo aplicar filtro de nivel para alumnos
      if (!asistencia.persona.curso) {
        return false; // No mostrar profesores/personal en primaria/secundaria
      }
      
      const nivelCurso = obtenerNivelCurso(asistencia.persona.curso.nombre);
      
      if (nivelCurso !== nivelEducativo) {
        return false;
      }
      
      // Filtrar por curso específico
      if (cursoSeleccionado !== 'todos' && asistencia.persona.curso.nombre !== cursoSeleccionado) {
        return false;
      }
    } else if (nivelEducativo === 'docentes') {
      // Solo mostrar profesores
      if (!asistencia.persona.nombre.includes('Prof')) {
        return false;
      }
    } else if (nivelEducativo === 'personal') {
      // Solo mostrar personal no docente
      if (asistencia.persona.curso || asistencia.persona.nombre.includes('Prof')) {
        return false;
      }
    }
    // Para 'todos' no aplicar filtro de nivel
    
    // Filtrar por tipo de persona
    if (tipoPersona !== 'todos') {
      const tipo = obtenerTipoPersona(asistencia);
      if (tipo !== tipoPersona) {
        return false;
      }
    }
    
    // Filtrar por estado de asistencia
    if (estadoAsistencia !== 'todos') {
      if (asistencia.estado.nombre.toLowerCase() !== estadoAsistencia) {
        return false;
      }
    }
    
    // Filtrar por rango de fechas
    if (fechaInicio || fechaFin) {
      const fechaAsistencia = new Date(asistencia.fecha_hora);
      const inicio = fechaInicio ? new Date(fechaInicio) : null;
      const fin = fechaFin ? new Date(fechaFin + 'T23:59:59') : null;
      
      if (inicio && fechaAsistencia < inicio) return false;
      if (fin && fechaAsistencia > fin) return false;
    }
    
    // Filtrar por temperatura
    if (temperaturaMin && asistencia.temperatura < parseFloat(temperaturaMin)) {
      return false;
    }
    if (temperaturaMax && asistencia.temperatura > parseFloat(temperaturaMax)) {
      return false;
    }
    
    return true;
  });

  // Cargar datos reales de asistencias desde el backend
  useEffect(() => {
    const cargarAsistencias = async () => {
      setLoading(true);
      try {
        const response = await apiRequest('/asistencias/');
        if (response.ok) {
          const data = await response.json();
          // Transformar datos para que coincidan con la interfaz esperada
          const asistenciasTransformadas = data.results.map((asistencia: any) => ({
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
        } else {
          console.error('Error al cargar asistencias:', response.status);
          setAsistencias([]);
        }
      } catch (error) {
        console.error('Error cargando asistencias:', error);
        setAsistencias([]);
      } finally {
        setLoading(false);
      }
    };

    cargarAsistencias();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  // Definir los cursos disponibles para cada nivel
  const cursosPrimaria = [
    "1er Grado", "2do Grado", "3er Grado", "4to Grado", 
    "5to Grado", "6to Grado", "7mo Grado"
  ];

  const cursosSecundaria = [
    "1er Año", "2do Año", "3er Año", "4to Año", "5to Año"
  ];

  return (
    <div className="container-fluid">
      {/* Botones principales de nivel educativo */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <button
            className={`btn btn-lg w-100 ${nivelEducativo === 'primaria' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => {
              setNivelEducativo('primaria');
              setCursoSeleccionado('todos');
            }}
            style={{ height: '80px', fontSize: '1.1rem' }}
          >
            <i className="fas fa-graduation-cap me-2"></i>
            <strong>PRIMARIA</strong>
            <br />
            <small>1er a 7mo grado</small>
          </button>
        </div>
        <div className="col-md-4 mb-3">
          <button
            className={`btn btn-lg w-100 ${nivelEducativo === 'secundaria' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => {
              setNivelEducativo('secundaria');
              setCursoSeleccionado('todos');
            }}
            style={{ height: '80px', fontSize: '1.1rem' }}
          >
            <i className="fas fa-university me-2"></i>
            <strong>SECUNDARIA</strong>
            <br />
            <small>1er a 5to año</small>
          </button>
        </div>
        <div className="col-md-4 mb-3">
          <button
            className={`btn btn-lg w-100 ${nivelEducativo === 'docentes' ? 'btn-warning' : 'btn-outline-warning'}`}
            onClick={() => {
              setNivelEducativo('docentes');
              setCursoSeleccionado('todos');
            }}
            style={{ height: '80px', fontSize: '1.1rem' }}
          >
            <i className="fas fa-chalkboard-teacher me-2"></i>
            <strong>DOCENTES</strong>
            <br />
            <small>Profesores</small>
          </button>
        </div>
      </div>

      {/* Segunda fila de botones */}
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <button
            className={`btn btn-lg w-100 ${nivelEducativo === 'personal' ? 'btn-secondary' : 'btn-outline-secondary'}`}
            onClick={() => {
              setNivelEducativo('personal');
              setCursoSeleccionado('todos');
            }}
            style={{ height: '80px', fontSize: '1.1rem' }}
          >
            <i className="fas fa-users-cog me-2"></i>
            <strong>PERSONAL NO DOCENTE</strong>
            <br />
            <small>Administrativo, limpieza, etc.</small>
          </button>
        </div>
        <div className="col-md-6 mb-3">
          <button
            className={`btn btn-lg w-100 ${nivelEducativo === 'todos' ? 'btn-info' : 'btn-outline-info'}`}
            onClick={() => {
              setNivelEducativo('todos');
              setCursoSeleccionado('todos');
            }}
            style={{ height: '80px', fontSize: '1.1rem' }}
          >
            <i className="fas fa-chart-bar me-2"></i>
            <strong>VER TODOS LOS NIVELES</strong>
            <br />
            <small>Datos completos</small>
          </button>
        </div>
      </div>

      {/* Botones de cursos específicos */}
      {nivelEducativo === 'primaria' && (
        <div className="row mb-4">
          <div className="col-12">
            <h6 className="mb-3">Seleccionar Grado:</h6>
            <button
              className={`btn ${cursoSeleccionado === 'todos' ? 'btn-primary' : 'btn-outline-primary'} me-2 mb-2`}
              onClick={() => setCursoSeleccionado('todos')}
            >
              <i className="fas fa-list me-1"></i>
              Todos los grados
            </button>
            
            {cursosPrimaria.map((curso) => (
              <button
                key={curso}
                className={`btn ${cursoSeleccionado === curso ? 'btn-primary' : 'btn-outline-primary'} me-2 mb-2`}
                onClick={() => setCursoSeleccionado(curso)}
              >
                {curso}
              </button>
            ))}
          </div>
        </div>
      )}

      {nivelEducativo === 'secundaria' && (
        <div className="row mb-4">
          <div className="col-12">
            <h6 className="mb-3">Seleccionar Año:</h6>
            <button
              className={`btn ${cursoSeleccionado === 'todos' ? 'btn-success' : 'btn-outline-success'} me-2 mb-2`}
              onClick={() => setCursoSeleccionado('todos')}
            >
              <i className="fas fa-list me-1"></i>
              Todos los años
            </button>
            
            {cursosSecundaria.map((curso) => (
              <button
                key={curso}
                className={`btn ${cursoSeleccionado === curso ? 'btn-success' : 'btn-outline-success'} me-2 mb-2`}
                onClick={() => setCursoSeleccionado(curso)}
              >
                {curso}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Botones de control */}
      <div className="row mb-4">
        <div className="col-md-4">
          <button
            className="btn btn-outline-secondary me-2"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
          >
            <i className={`fas fa-${mostrarFiltros ? 'chevron-up' : 'chevron-down'} me-2`}></i>
            {mostrarFiltros ? 'Ocultar Filtros Avanzados' : 'Mostrar Filtros Avanzados'}
          </button>
        </div>
        <div className="col-md-8 text-end">
          <button
            className="btn btn-outline-primary"
            onClick={() => setMostrarDashboard(!mostrarDashboard)}
          >
            <i className={`fas fa-${mostrarDashboard ? 'chart-line' : 'chart-bar'} me-2`}></i>
            {mostrarDashboard ? 'Ocultar Reportes Avanzados' : 'Mostrar Reportes Avanzados'}
          </button>
        </div>
      </div>

      {/* Dashboard de Estadísticas */}
      {mostrarDashboard && (
        <div className="row mb-4">
          <div className="col-12">
            <DashboardStats asistencias={asistenciasFiltradas} />
          </div>
        </div>
      )}

      {/* Filtros avanzados */}
      {mostrarFiltros && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h6 className="card-title mb-0">Filtros Avanzados</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  {/* Filtros de fecha */}
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Fecha Inicio</label>
                    <input
                      type="date"
                      className="form-control"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Fecha Fin</label>
                    <input
                      type="date"
                      className="form-control"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                    />
                  </div>
                  
                  {/* Filtro de estado */}
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Estado</label>
                    <select
                      className="form-select"
                      value={estadoAsistencia}
                      onChange={(e) => setEstadoAsistencia(e.target.value as 'todos' | 'presente' | 'ausente')}
                    >
                      <option value="todos">Todos</option>
                      <option value="presente">Presente</option>
                      <option value="ausente">Ausente</option>
                    </select>
                  </div>
                  
                  {/* Filtro de tipo de persona */}
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Tipo de Persona</label>
                    <select
                      className="form-select"
                      value={tipoPersona}
                      onChange={(e) => setTipoPersona(e.target.value as 'todos' | 'alumnos' | 'profesores' | 'personal')}
                    >
                      <option value="todos">Todos</option>
                      <option value="alumnos">Alumnos</option>
                      <option value="profesores">Profesores</option>
                      <option value="personal">Personal</option>
                    </select>
                  </div>
                  
                  {/* Filtros de temperatura */}
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Temperatura Mínima (°C)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="35.0"
                      value={temperaturaMin}
                      onChange={(e) => setTemperaturaMin(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Temperatura Máxima (°C)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="38.0"
                      value={temperaturaMax}
                      onChange={(e) => setTemperaturaMax(e.target.value)}
                    />
                  </div>
                  
                  {/* Botón para limpiar filtros */}
                  <div className="col-md-6 mb-3 d-flex align-items-end">
                    <button
                      className="btn btn-warning"
                      onClick={() => {
                        setFechaInicio('');
                        setFechaFin('');
                        setEstadoAsistencia('todos');
                        setTipoPersona('todos');
                        setTemperaturaMin('');
                        setTemperaturaMax('');
                      }}
                    >
                      <i className="fas fa-eraser me-2"></i>
                      Limpiar Filtros
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones de exportación */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">
                <i className="fas fa-download me-2"></i>
                Exportar Reporte
              </h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4 mb-2">
                  <button
                    className="btn btn-success w-100"
                    onClick={exportarExcel}
                    disabled={asistenciasFiltradas.length === 0}
                  >
                    <i className="fas fa-file-excel me-2"></i>
                    Exportar a Excel
                  </button>
                </div>
                <div className="col-md-4 mb-2">
                  <button
                    className="btn btn-danger w-100"
                    onClick={exportarPDF}
                    disabled={asistenciasFiltradas.length === 0}
                  >
                    <i className="fas fa-file-pdf me-2"></i>
                    Exportar a PDF
                  </button>
                </div>
                <div className="col-md-4 mb-2">
                  <button
                    className="btn btn-primary w-100"
                    onClick={exportarWord}
                    disabled={asistenciasFiltradas.length === 0}
                  >
                    <i className="fas fa-file-word me-2"></i>
                    Exportar a Word
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <small className="text-muted">
                  <i className="fas fa-info-circle me-1"></i>
                  Los archivos se descargarán con el nombre: <strong>{obtenerTituloReporte()}</strong>
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Información de filtros aplicados */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="alert alert-info">
            <strong>Filtros aplicados:</strong>
            {nivelEducativo !== 'todos' && (
              <span className="ms-2">
                Nivel: <strong>
                  {nivelEducativo === 'primaria' ? 'Primaria' : 
                   nivelEducativo === 'secundaria' ? 'Secundaria' : 
                   nivelEducativo === 'docentes' ? 'Docentes' : 'Personal no Docente'}
                </strong>
              </span>
            )}
            {cursoSeleccionado !== 'todos' && (
              <span className="ms-2">
                Curso: <strong>{cursoSeleccionado}</strong>
              </span>
            )}
            {estadoAsistencia !== 'todos' && (
              <span className="ms-2">
                Estado: <strong>{estadoAsistencia === 'presente' ? 'Presente' : 'Ausente'}</strong>
              </span>
            )}
            {tipoPersona !== 'todos' && (
              <span className="ms-2">
                Tipo: <strong>{tipoPersona === 'alumnos' ? 'Alumnos' : tipoPersona === 'profesores' ? 'Profesores' : 'Personal'}</strong>
              </span>
            )}
            {(fechaInicio || fechaFin) && (
              <span className="ms-2">
                Fecha: <strong>{fechaInicio || 'Inicio'} - {fechaFin || 'Fin'}</strong>
              </span>
            )}
            {(temperaturaMin || temperaturaMax) && (
              <span className="ms-2">
                Temperatura: <strong>{temperaturaMin || 'Min'}°C - {temperaturaMax || 'Max'}°C</strong>
              </span>
            )}
            {nivelEducativo === 'todos' && cursoSeleccionado === 'todos' && estadoAsistencia === 'todos' && tipoPersona === 'todos' && !fechaInicio && !fechaFin && !temperaturaMin && !temperaturaMax && (
              <span className="ms-2">Mostrando todos los datos</span>
            )}
          </div>
        </div>
      </div>

      {/* Mostrar datos filtrados */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Datos de Asistencia Filtrados</h5>
            </div>
            <div className="card-body">
              <p><strong>Total de registros:</strong> {asistenciasFiltradas.length}</p>
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Persona</th>
                      <th>Curso</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Temperatura</th>
                      <th>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asistenciasFiltradas.map((asistencia) => (
                      <tr key={asistencia.idAsistencia}>
                        <td>{asistencia.persona.nombre}</td>
                        <td>{asistencia.persona.curso?.nombre || 'Sin curso'}</td>
                        <td>{new Date(asistencia.fecha_hora).toLocaleString()}</td>
                        <td>
                          <span className={`badge ${asistencia.estado.nombre === 'Presente' ? 'bg-success' : 'bg-danger'}`}>
                            {asistencia.estado.nombre}
                          </span>
                        </td>
                        <td>{asistencia.temperatura > 0 ? `${asistencia.temperatura}°C` : 'N/A'}</td>
                        <td>
                          <span className={`badge ${obtenerTipoPersona(asistencia) === 'alumnos' ? 'bg-primary' : obtenerTipoPersona(asistencia) === 'profesores' ? 'bg-warning' : 'bg-secondary'}`}>
                            {obtenerTipoPersona(asistencia) === 'alumnos' ? 'Alumno' : obtenerTipoPersona(asistencia) === 'profesores' ? 'Profesor' : 'Personal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reportes; 