import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useNavigate } from 'react-router-dom';
import AttendanceCalendar from '../components/AttendanceCalendar';
import '../components/AttendanceCalendar.css';
import { apiRequest } from '../config/api';

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
  const navigate = useNavigate();

  // Estado para últimos ingresos del día
  const [ultimosIngresos, setUltimosIngresos] = useState<Array<{
    nombre: string;
    tipo: string;
    hora: string;
    tardanza: boolean;
  }>>([]);

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
    apiRequest(`/asistencias/?fechaHora__date=${hoy}`)
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
        const presentes = asistencias.filter((a: any) => a.estado.nombre === 'Presente').length;
        const ausentes = asistencias.filter((a: any) => a.estado.nombre === 'Ausente').length;
        setResumenDia({ total, presentes, ausentes });
        
        // Calcular asistencias por curso
        const cursos: { [nombre: string]: { presentes: number; ausentes: number } } = {};
        asistencias.forEach((a: any) => {
          const curso = a.persona.curso ? a.persona.curso.nombre : 'Sin curso';
          if (!cursos[curso]) cursos[curso] = { presentes: 0, ausentes: 0 };
          if (a.estado.nombre === 'Presente') cursos[curso].presentes++;
          if (a.estado.nombre === 'Ausente') cursos[curso].ausentes++;
        });
        setAsistenciasPorCurso(
          Object.entries(cursos).map(([curso, vals]) => ({ curso, presentes: vals.presentes, ausentes: vals.ausentes }))
        );

        // Procesar solo los últimos 5 ingresos del día
        const asistenciasParaLista = asistencias
          .filter((a: any) => a.estado.nombre === 'Presente') // Solo presentes
          .sort((a: any, b: any) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()) // Más recientes primero
          .slice(0, 5) // Solo los últimos 5
          .map((a: any) => {
            const fecha = new Date(a.fechaHora);
            const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const esTardanza = a.estado.nombre === 'Tardanza' || fecha.getHours() > 8;
            
            // Determinar tipo basado en el tipo de persona
            let tipo = 'alumno';
            if (a.persona.curso === null) {
              tipo = a.persona.nombre.includes('Prof.') ? 'profesor' : 'personal';
            }
            
            return {
              nombre: a.persona.nombre,
              tipo,
              hora,
              tardanza: esTardanza
            };
          });

        setUltimosIngresos(asistenciasParaLista);

        // Obtener último personal autorizado (profesor o administrativo)
        const personalNoEstudiante = asistencias
          .filter((a: any) => a.persona.curso === null && a.estado.nombre === 'Presente')
          .sort((a: any, b: any) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
        
        if (personalNoEstudiante.length > 0) {
          const ultimo = personalNoEstudiante[0];
          const fechaHora = new Date(ultimo.fechaHora);
          setPersonalAutorizado({
            nombre: ultimo.persona.nombre,
            tipo: ultimo.persona.nombre.includes('Prof.') ? 'Profesor' : 'Personal Administrativo',
            ultimaAsistencia: fechaHora.toLocaleString('es-ES')
          });
        }

        setLoading(false);
      })
      .catch(err => {
        setError(typeof err === 'string' ? null : err.message);
        setLoading(false);
      });
  }, [navigate]);

  // Estado para personal autorizado (último personal en ingresar)
  const [personalAutorizado, setPersonalAutorizado] = useState<{
    nombre: string;
    tipo: string;
    ultimaAsistencia: string;
  } | null>(null);

  return (
    <div className="container-fluid px-3 px-md-4 mt-3">
      {/* Header minimalista */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0 text-white">
          <i className="bi bi-speedometer2 me-2 text-primary"></i>Dashboard
        </h1>
        <div className="text-end">
          <div className="text-muted small">
                  {currentDateTime.toLocaleDateString('es-ES', { 
                    weekday: 'long', 
              day: 'numeric',
              month: 'long'
                  })}
          </div>
          <div className="text-primary fw-bold">
                  {currentDateTime.toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
              minute: '2-digit'
                  })}
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
          {/* Métricas principales - con gradientes coloridos */}
          <div className="row mb-4 g-3">
            <div className="col-lg-3 col-md-6">
              <div className="card shadow border-0 rounded-3" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                <div className="card-body text-center py-3 text-white">
                  <i className="bi bi-people-fill fs-1 mb-2 text-warning"></i>
                  <h3 className="mb-1">{resumenDia.total}</h3>
                  <p className="mb-0 small">Total Efectivos</p>
                </div>
              </div>
                  </div>
            <div className="col-lg-3 col-md-6">
              <div className="card shadow border-0 rounded-3" style={{background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}>
                <div className="card-body text-center py-3 text-white">
                  <i className="bi bi-person-check-fill fs-1 mb-2 text-success"></i>
                  <h3 className="mb-1">{resumenDia.presentes}</h3>
                  <p className="mb-0 small">Presentes</p>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <div className="card shadow border-0 rounded-3" style={{background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}}>
                <div className="card-body text-center py-3 text-white">
                  <i className="bi bi-person-x-fill fs-1 mb-2 text-danger"></i>
                  <h3 className="mb-1">{resumenDia.ausentes}</h3>
                  <p className="mb-0 small">Ausentes</p>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <div className="card shadow border-0 rounded-3" style={{background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'}}>
                <div className="card-body text-center py-3 text-white">
                  <i className="bi bi-percent fs-1 mb-2 text-info"></i>
                  <h3 className="mb-1">{resumenDia.total > 0 ? Math.round((resumenDia.presentes / resumenDia.total) * 100) : 0}%</h3>
                  <p className="mb-0 small">Asistencia</p>
                </div>
              </div>
            </div>
          </div>

          {/* Información adicional - layout más limpio */}
          <div className="row mb-4 g-3">
            <div className="col-md-4">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body text-center py-4">
                  <div className="mb-3">
                    <i className="bi bi-person-badge fs-1 text-primary"></i>
                </div>
                  <h6 className="fw-bold mb-2">Personal Autorizado</h6>
                  {personalAutorizado ? (
                    <>
                      <p className="mb-1 fw-bold">{personalAutorizado.nombre}</p>
                      <small className="text-muted">{personalAutorizado.tipo}</small>
                      <br />
                      <small className="text-muted">{personalAutorizado.ultimaAsistencia}</small>
                    </>
                  ) : (
                    <p className="text-muted small">Sin registros hoy</p>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-8">
              <div className="card h-100 shadow-sm border-0" style={{backgroundColor: '#2c3e50', color: 'white'}}>
                <div className="card-header border-0 py-3" style={{backgroundColor: '#34495e', color: 'white'}}>
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-bold text-white">
                      <i className="bi bi-clock-history me-2 text-primary"></i>Últimos Ingresos
                    </h6>
                    <span className="badge bg-primary">Últimos 5</span>
                  </div>
                </div>
                <div className="card-body p-0">
                  {ultimosIngresos.length > 0 ? (
                  <div className="list-group list-group-flush">
                      {ultimosIngresos.map((asistencia, index) => (
                        <div key={index} className="list-group-item d-flex justify-content-between align-items-center border-0 py-3" style={{backgroundColor: '#2c3e50', color: 'white', borderBottom: '1px solid #34495e'}}>
                          <div className="d-flex align-items-center">
                            <div className={`me-3 rounded-circle d-flex align-items-center justify-content-center ${
                              asistencia.tipo === 'profesor' ? 'bg-warning' : 
                              asistencia.tipo === 'alumno' ? 'bg-primary' : 'bg-secondary'
                            }`} style={{width: '40px', height: '40px'}}>
                              <i className={`bi ${
                                asistencia.tipo === 'profesor' ? 'bi-mortarboard' : 
                                asistencia.tipo === 'alumno' ? 'bi-person' : 'bi-gear'
                              } text-white`}></i>
                            </div>
                        <div>
                          <div className="fw-bold text-white">{asistencia.nombre}</div>
                              <small className="text-light">
                            {asistencia.tipo === 'profesor' ? 'Profesor' : 
                                 asistencia.tipo === 'alumno' ? 'Alumno' : 'Personal'}
                          </small>
                        </div>
                          </div>
                          <span className={`badge ${asistencia.tardanza ? 'bg-warning' : 'bg-success'} fs-6`}>
                          {asistencia.hora}
                        </span>
                      </div>
                    ))}
                  </div>
                  ) : (
                    <div className="text-center py-5">
                      <i className="bi bi-clock fs-1 text-light mb-3"></i>
                      <p className="text-light">No hay ingresos registrados hoy</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>


          {/* Calendario de Asistencias */}
          <div className="row mb-3">
            <div className="col-12">
              <div className="card shadow border-0 rounded-3">
                <div className="card-header bg-light py-2">
                  <h6 className="mb-0">
                    <i className="bi bi-calendar3 me-2"></i>Calendario de Asistencias
                  </h6>
                </div>
                <div className="card-body">
              <AttendanceCalendar 
                onDateSelect={(date) => {
                      // Lógica para cuando se selecciona una fecha en el calendario
                  console.log('Fecha seleccionada:', date);
                }}
              />
                </div>
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  );
};

export default Dashboard; 