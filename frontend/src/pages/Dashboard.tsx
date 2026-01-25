import React, { useEffect, useState } from 'react';
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
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const navigate = useNavigate();

  // Estado para últimos ingresos del día
  const [ultimosIngresos, setUltimosIngresos] = useState<Array<{
    nombre: string;
    tipo: string;
    hora: string;
    tardanza: boolean;
  }>>([]);

  // Estado para personal autorizado (último personal en ingresar)
  const [personalAutorizado, setPersonalAutorizado] = useState<{
    nombre: string;
    tipo: string;
    ultimaAsistencia: string;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    apiRequest(`/asistencias/?fechaHora__date=${hoy}`)
      .then(async res => {
        if (!res.ok) {
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

        const total = asistencias.length;
        const presentes = asistencias.filter((a: any) => a.estado.nombre === 'Presente').length;
        const ausentes = asistencias.filter((a: any) => a.estado.nombre === 'Ausente').length;
        setResumenDia({ total, presentes, ausentes });

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

        const asistenciasParaLista = asistencias
          .filter((a: any) => a.estado.nombre === 'Presente')
          .sort((a: any, b: any) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
          .slice(0, 5)
          .map((a: any) => {
            const fecha = new Date(a.fechaHora);
            const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const esTardanza = a.estado.nombre === 'Tardanza' || fecha.getHours() > 8;

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

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h1 className="h3 mb-2 fw-bold text-white">Dashboard Overview</h1>
          <p className="text-secondary mb-0">Bienvenido al panel de control de AsistencIA</p>
        </div>
        <div className="text-end glass px-4 py-2 rounded-3">
          <div className="text-secondary small text-uppercase fw-bold" style={{ letterSpacing: '1px' }}>
            {currentDateTime.toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </div>
          <div className="text-white fw-bold fs-4">
            {currentDateTime.toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center my-5 text-secondary">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p>Cargando datos del sistema...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger glass border-danger text-danger">{error}</div>
      ) : (
        <>
          {/* Métricas Cards - Grid Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {/* Total Efectivos */}
            <div className="card border-0">
              <div className="card-body d-flex align-items-center">
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', marginRight: '16px' }}>
                  <i className="bi bi-people-fill fs-3"></i>
                </div>
                <div>
                  <h6 className="text-secondary mb-1">Total Asistencias</h6>
                  <h2 className="mb-0 fw-bold">{resumenDia.total}</h2>
                </div>
              </div>
            </div>

            {/* Presentes */}
            <div className="card border-0">
              <div className="card-body d-flex align-items-center">
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', marginRight: '16px' }}>
                  <i className="bi bi-person-check-fill fs-3"></i>
                </div>
                <div>
                  <h6 className="text-secondary mb-1">Presentes</h6>
                  <h2 className="mb-0 fw-bold">{resumenDia.presentes}</h2>
                </div>
              </div>
            </div>

            {/* Ausentes */}
            <div className="card border-0">
              <div className="card-body d-flex align-items-center">
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', marginRight: '16px' }}>
                  <i className="bi bi-person-x-fill fs-3"></i>
                </div>
                <div>
                  <h6 className="text-secondary mb-1">Ausentes</h6>
                  <h2 className="mb-0 fw-bold">{resumenDia.ausentes}</h2>
                </div>
              </div>
            </div>

            {/* Porcentaje */}
            <div className="card border-0">
              <div className="card-body d-flex align-items-center">
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent)', marginRight: '16px' }}>
                  <i className="bi bi-pie-chart-fill fs-3"></i>
                </div>
                <div>
                  <h6 className="text-secondary mb-1">% Asistencia</h6>
                  <h2 className="mb-0 fw-bold">
                    {resumenDia.total > 0 ? Math.round((resumenDia.presentes / resumenDia.total) * 100) : 0}%
                  </h2>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            {/* Personal Autorizado */}
            <div className="col-lg-4">
              <div className="card h-100 border-0">
                <div className="card-body text-center py-5">
                  <div className="mb-4 position-relative d-inline-block">
                    <div style={{
                      width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-app)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                      border: '2px solid var(--primary)'
                    }}>
                      <i className="bi bi-shield-check fs-1 text-primary"></i>
                    </div>
                  </div>
                  <h5 className="fw-bold mb-3">Último Personal</h5>
                  {personalAutorizado ? (
                    <>
                      <h4 className="mb-2 text-white">{personalAutorizado.nombre}</h4>
                      <span className="badge bg-primary bg-opacity-10 text-primary mb-3 px-3 py-2 rounded-pill">
                        {personalAutorizado.tipo}
                      </span>
                      <p className="text-secondary small mb-0">
                        <i className="bi bi-clock me-2"></i>
                        {personalAutorizado.ultimaAsistencia}
                      </p>
                    </>
                  ) : (
                    <p className="text-secondary">Sin registros de personal hoy</p>
                  )}
                </div>
              </div>
            </div>

            {/* Últimos Ingresos */}
            <div className="col-lg-8">
              <div className="card h-100 border-0">
                <div className="card-header border-0 d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold"> <i className="bi bi-clock-history me-2 text-primary"></i>Últimos Ingresos</h5>
                  <button className="btn btn-sm btn-outline-light border-0 text-secondary">Ver todos</button>
                </div>
                <div className="card-body p-0">
                  {ultimosIngresos.length > 0 ? (
                    <div className="list-group list-group-flush">
                      {ultimosIngresos.map((asistencia, index) => (
                        <div key={index} className="list-group-item bg-transparent border-bottom border-secondary border-opacity-10 py-3 px-4">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <div className={`me-3 rounded-circle d-flex align-items-center justify-content-center ${asistencia.tipo === 'profesor' ? 'bg-warning bg-opacity-10 text-warning' :
                                  asistencia.tipo === 'alumno' ? 'bg-primary bg-opacity-10 text-primary' : 'bg-success bg-opacity-10 text-success'
                                }`} style={{ width: '42px', height: '42px' }}>
                                <i className={`bi ${asistencia.tipo === 'profesor' ? 'bi-mortarboard-fill' :
                                    asistencia.tipo === 'alumno' ? 'bi-backpack-fill' : 'bi-person-badge-fill'
                                  }`}></i>
                              </div>
                              <div>
                                <h6 className="mb-0 fw-bold text-white">{asistencia.nombre}</h6>
                                <small className="text-secondary text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                                  {asistencia.tipo}
                                </small>
                              </div>
                            </div>
                            <div className="text-end">
                              <span className={`d-block fw-bold ${asistencia.tardanza ? 'text-warning' : 'text-success'}`}>
                                {asistencia.hora}
                              </span>
                              {asistencia.tardanza && <small className="text-warning" style={{ fontSize: '0.7rem' }}>Tardanza</small>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <i className="bi bi-inbox fs-1 text-secondary opacity-50 mb-3"></i>
                      <p className="text-secondary">No hay actividad reciente</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Calendario */}
          <div className="card border-0">
            <div className="card-header border-0">
              <h5 className="mb-0 fw-bold"><i className="bi bi-calendar-event me-2 text-purple"></i>Calendario de Actividad</h5>
            </div>
            <div className="card-body">
              <AttendanceCalendar onDateSelect={(date) => console.log(date)} />
            </div>
          </div>

        </>
      )}
    </div>
  );
};

export default Dashboard;