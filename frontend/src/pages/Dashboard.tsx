import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useNavigate } from 'react-router-dom';
import AttendanceCalendar from '../components/AttendanceCalendar';
import '../components/AttendanceCalendar.css';

interface Asistencia {
  idAsistencia: number;
  persona: { idPersona: number; nombre: string; curso: { idCurso: number; nombre: string } | null };
  fecha_hora: string;
  temperatura: number;
  estado: { idEstadoAsistencia: number; nombre: string };
}

interface CursoResumen {
  curso: string;
  presentes: number;
  ausentes: number;
}

const Dashboard: React.FC = () => {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumenDia, setResumenDia] = useState({ total: 0, presentes: 0, ausentes: 0 });
  const [asistenciasPorCurso, setAsistenciasPorCurso] = useState<CursoResumen[]>([]);
  const [cursoFiltro, setCursoFiltro] = useState<string>('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const navigate = useNavigate();

  // Datos de ejemplo para alumnos
  const alumnosEjemplo = [
    { nombre: 'María González', asistencia: 'presente' },
    { nombre: 'Juan Pérez', asistencia: 'ausente' },
    { nombre: 'Ana Rodríguez', asistencia: 'presente' },
    { nombre: 'Carlos López', asistencia: 'ausente justificado' },
    { nombre: 'Laura Martínez', asistencia: 'presente' },
    { nombre: 'Diego Silva', asistencia: 'ausente' },
    { nombre: 'Sofía Torres', asistencia: 'presente' },
    { nombre: 'Miguel Herrera', asistencia: 'presente' },
    { nombre: 'Valentina Castro', asistencia: 'ausente justificado' },
    { nombre: 'Andrés Morales', asistencia: 'presente' }
  ];

  // Datos de ejemplo para asistencias de hoy
  const asistenciasHoy = [
    { nombre: 'Roberto Silva', tipo: 'personal', hora: '07:20', tardanza: false },
    { nombre: 'Prof. Juan Pérez', tipo: 'profesor', hora: '07:30', tardanza: false },
    { nombre: 'Prof. Carmen Ruiz', tipo: 'profesor', hora: '07:40', tardanza: false },
    { nombre: 'María González', tipo: 'alumno', hora: '07:45', tardanza: false },
    { nombre: 'Ana Rodríguez', tipo: 'alumno', hora: '07:50', tardanza: false },
    { nombre: 'Diego Morales', tipo: 'alumno', hora: '07:55', tardanza: false },
    { nombre: 'Carlos López', tipo: 'alumno', hora: '08:15', tardanza: true },
    { nombre: 'Laura Martínez', tipo: 'alumno', hora: '08:30', tardanza: true }
  ];

  // Filtrar asistencias según el tipo seleccionado
  const asistenciasFiltradas = filtroTipo 
    ? asistenciasHoy.filter(asistencia => asistencia.tipo === filtroTipo)
    : asistenciasHoy;

  useEffect(() => {
    // Actualizar fecha y hora cada segundo
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Obtener asistencias del día actual
    const hoy = new Date().toISOString().slice(0, 10); // formato YYYY-MM-DD
    const token = localStorage.getItem('accessToken');
    fetch(`/api/asistencias/?fechaHora__date=${hoy}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(async res => {
        if (!res.ok) {
          // Si es 401 o token inválido, forzar logout
          let data;
          try { data = await res.json(); } catch { data = {}; }
          if (res.status === 401 || (data && data.code === 'token_not_valid')) {
            localStorage.removeItem('accessToken');
            navigate('/login');
            return Promise.reject('Token inválido o expirado');
          }
          throw new Error('Error al obtener asistencias');
        }
        return res.json();
      })
      .then(data => {
        const asistencias = data.results || [];
        setAsistencias(asistencias);
        // Calcular resumen
        const total = asistencias.length;
        const presentes = asistencias.filter((a: Asistencia) => a.estado.nombre === 'Presente').length;
        const ausentes = asistencias.filter((a: Asistencia) => a.estado.nombre === 'Ausente').length;
        setResumenDia({ total, presentes, ausentes });
        // Calcular asistencias por curso
        const cursos: { [nombre: string]: { presentes: number; ausentes: number } } = {};
        asistencias.forEach((a: Asistencia) => {
          const curso = a.persona.curso ? a.persona.curso.nombre : 'Sin curso';
          if (!cursos[curso]) cursos[curso] = { presentes: 0, ausentes: 0 };
          if (a.estado.nombre === 'Presente') cursos[curso].presentes++;
          if (a.estado.nombre === 'Ausente') cursos[curso].ausentes++;
        });
        setAsistenciasPorCurso(
          Object.entries(cursos).map(([curso, vals]) => ({ curso, presentes: vals.presentes, ausentes: vals.ausentes }))
        );
        setLoading(false);
      })
      .catch(err => {
        setError(typeof err === 'string' ? null : err.message);
        setLoading(false);
      });
  }, [navigate]);

  // Datos de prueba para personal autorizado (puedes conectar a la API real después)
  const personalAutorizado = {
    nombre: 'Prof. Juan Pérez',
    tipo: 'Profesor',
    ultimaAsistencia: '2025-07-04 08:10',
  };

  return (
    <div className="container mt-3" style={{ maxWidth: '900px' }}>
      {/* Ventana de mensajes deslizantes */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="card bg-gradient-warning border-0 shadow-lg rounded-4 overflow-hidden">
            <div className="card-body py-3">
              <div className="d-flex align-items-center">
                <i className="bi bi-megaphone-fill text-white me-3 fs-4"></i>
                <div className="marquee-container text-white fw-bold fs-5">
                  <div className="marquee-content">
                    Acá van mensajes importantes &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Esto es un RECORDATORIO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; El día 24/04 hay jornada &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Acá van mensajes importantes &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Esto es un RECORDATORIO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; El día 24/04 hay jornada
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="row mb-4">
        <div className="col-md-6">
          <h2 className="mb-0 text-primary fw-bold">
            <i className="bi bi-speedometer2 me-2"></i>Dashboard
          </h2>
        </div>
        <div className="col-md-6">
          <div className="card bg-gradient-primary border-0 shadow-sm rounded-3 d-inline-block">
            <div className="card-body py-2 px-3">
              <div className="d-flex align-items-center text-white">
                <i className="bi bi-calendar3 me-2 text-warning"></i>
                <span className="fw-bold me-3 fs-6">
                  {currentDateTime.toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
                <i className="bi bi-clock me-2 text-info"></i>
                <span className="fw-bold fs-5">
                  {currentDateTime.toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-info" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          {/* Resumen del día (Estudiantes) con íconos y tarjetas más atractivas */}
          <div className="row mb-3 g-2">
            <div className="col-md-4">
              <div className="card shadow border-0 rounded-3 bg-gradient-primary">
                <div className="card-body d-flex align-items-center py-2 px-3">
                  <i className="bi bi-people-fill fs-2 me-2 text-info"></i>
                  <div>
                    <div className="fw-bold small">Efectivos</div>
                    <div className="fs-4">{resumenDia.total}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow border-0 rounded-3 bg-gradient-success">
                <div className="card-body d-flex align-items-center py-2 px-3">
                  <i className="bi bi-person-check-fill fs-2 me-2 text-success"></i>
                  <div>
                    <div className="fw-bold small">Presentes</div>
                    <div className="fs-4">{resumenDia.presentes}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow border-0 rounded-3 bg-gradient-danger">
                <div className="card-body d-flex align-items-center py-2 px-3">
                  <i className="bi bi-person-x-fill fs-2 me-2 text-danger"></i>
                  <div>
                    <div className="fw-bold small">Ausentes</div>
                    <div className="fs-4">{resumenDia.ausentes}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Personal autorizado y Asistencias de hoy */}
          <div className="row mb-3 g-2">
            <div className="col-lg-6 col-md-12">
              <div className="card border-info shadow rounded-3">
                <div className="card-header bg-info text-white rounded-top-3 py-2">
                  <i className="bi bi-person-badge me-2"></i>Personal autorizado
                </div>
                <div className="card-body py-2">
                  <h6 className="card-title mb-1">{personalAutorizado.nombre}</h6>
                  <p className="card-text small mb-1">Tipo: {personalAutorizado.tipo}</p>
                  <p className="card-text small mb-0">Última asistencia: {personalAutorizado.ultimaAsistencia}</p>
                </div>
              </div>
            </div>
            <div className="col-lg-6 col-md-12">
              <div className="card bg-gradient-primary border-0 shadow rounded-3">
                <div className="card-header bg-primary text-white rounded-top-3 d-flex justify-content-between align-items-center py-2">
                  <div>
                    <i className="bi bi-clock-history me-2"></i>Asistencias de hoy
                  </div>
                  <button className="btn btn-success btn-sm shadow-sm">
                    <i className="bi bi-download me-1"></i>Descargar
                  </button>
                </div>
                {/* Filtros por tipo de persona */}
                <div className="bg-transparent border-0 pt-3 px-3">
                  <div className="d-flex gap-2 justify-content-center">
                    <button 
                      className={`btn ${filtroTipo === '' ? 'btn-secondary' : 'btn-outline-secondary'} btn-sm`}
                      onClick={() => setFiltroTipo('')}
                    >
                      <i className="bi bi-list-ul me-1"></i>Todos
                    </button>
                    <button 
                      className={`btn ${filtroTipo === 'profesor' ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                      onClick={() => setFiltroTipo(filtroTipo === 'profesor' ? '' : 'profesor')}
                    >
                      <i className="bi bi-person-workspace me-1"></i>Profesor
                    </button>
                    <button 
                      className={`btn ${filtroTipo === 'alumno' ? 'btn-success' : 'btn-outline-success'} btn-sm`}
                      onClick={() => setFiltroTipo(filtroTipo === 'alumno' ? '' : 'alumno')}
                    >
                      <i className="bi bi-mortarboard me-1"></i>Alumno
                    </button>
                    <button 
                      className={`btn ${filtroTipo === 'personal' ? 'btn-info' : 'btn-outline-info'} btn-sm`}
                      onClick={() => setFiltroTipo(filtroTipo === 'personal' ? '' : 'personal')}
                    >
                      <i className="bi bi-person-badge me-1"></i>Personal no docente
                    </button>
                  </div>
                </div>
                <div className="card-body p-0">
                  <div className="list-group list-group-flush">
                    {asistenciasFiltradas.map((asistencia, index) => (
                      <div key={index} className="list-group-item d-flex justify-content-between align-items-center bg-transparent text-white border-0">
                        <div>
                          <div className="fw-bold">{asistencia.nombre}</div>
                          <small className="text-light">
                            {asistencia.tipo === 'profesor' ? 'Profesor' : 
                             asistencia.tipo === 'alumno' ? 'Alumno' : 
                             'Personal no docente'}
                          </small>
                        </div>
                        <span className={`badge ${asistencia.tardanza ? 'bg-warning' : 'bg-success'} rounded-pill`}>
                          {asistencia.hora}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Calendario de Asistencias */}
          <div className="row mb-3">
            <div className="col-12">
              <AttendanceCalendar 
                onDateSelect={(date) => {
                  console.log('Fecha seleccionada:', date);
                  // Aquí puedes agregar lógica adicional cuando se selecciona una fecha
                }}
              />
            </div>
          </div>


        </>
      )}
    </div>
  );
};

export default Dashboard;

// Estilos para el marquee de mensajes
const marqueeStyles = `
  .marquee-container {
    overflow: hidden;
    white-space: nowrap;
    position: relative;
  }
  
  .marquee-content {
    display: inline-block;
    animation: marquee 35s linear infinite;
    white-space: nowrap;
  }
  
  @keyframes marquee {
    0% {
      transform: translateX(100%);
    }
    100% {
      transform: translateX(-100%);
    }
  }
`;

// Agregar estilos al head del documento
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = marqueeStyles;
document.head.appendChild(styleSheet); 