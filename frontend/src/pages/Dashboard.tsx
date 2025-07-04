import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

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
    <div className="container-fluid mt-4">
      <h2 className="mb-4">Dashboard</h2>
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
          <div className="row mb-4 g-4">
            <div className="col-md-4">
              <div className="card shadow-lg border-0 rounded-4 bg-gradient-primary">
                <div className="card-body d-flex align-items-center">
                  <i className="bi bi-people-fill display-4 me-3 text-info"></i>
                  <div>
                    <div className="fw-bold">Total asistencias hoy</div>
                    <div className="fs-2">{resumenDia.total}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-lg border-0 rounded-4 bg-gradient-success">
                <div className="card-body d-flex align-items-center">
                  <i className="bi bi-person-check-fill display-4 me-3 text-success"></i>
                  <div>
                    <div className="fw-bold">Presentes</div>
                    <div className="fs-2">{resumenDia.presentes}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-lg border-0 rounded-4 bg-gradient-danger">
                <div className="card-body d-flex align-items-center">
                  <i className="bi bi-person-x-fill display-4 me-3 text-danger"></i>
                  <div>
                    <div className="fw-bold">Ausentes</div>
                    <div className="fs-2">{resumenDia.ausentes}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Personal autorizado (solo si hay datos) */}
          {personalAutorizado && (
            <div className="row mb-4">
              <div className="col-md-6">
                <div className="card border-info mb-3 shadow rounded-4">
                  <div className="card-header bg-info text-white rounded-top-4">
                    <i className="bi bi-person-badge me-2"></i>Personal autorizado
                  </div>
                  <div className="card-body">
                    <h5 className="card-title">{personalAutorizado.nombre}</h5>
                    <p className="card-text">Tipo: {personalAutorizado.tipo}</p>
                    <p className="card-text">Última asistencia: {personalAutorizado.ultimaAsistencia}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Asistencias por curso */}
          <div className="row mb-4">
            <div className="col-md-8">
              <div className="card shadow rounded-4">
                <div className="card-header">
                  <i className="bi bi-journal-check me-2"></i>Asistencias por curso
                </div>
                <div className="card-body">
                  <table className="table table-dark table-striped rounded-3 overflow-hidden">
                    <thead>
                      <tr>
                        <th>Curso</th>
                        <th>Presentes</th>
                        <th>Ausentes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asistenciasPorCurso.map((c) => (
                        <tr key={c.curso}>
                          <td>{c.curso}</td>
                          <td>{c.presentes}</td>
                          <td>{c.ausentes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          {/* Accesos rápidos */}
          <div className="row mb-4">
            <div className="col-md-8">
              <div className="card shadow rounded-4">
                <div className="card-header">
                  <i className="bi bi-lightning-charge me-2"></i>Accesos rápidos
                </div>
                <div className="card-body d-flex gap-3">
                  <button className="btn btn-outline-primary"><i className="bi bi-list-ul me-2"></i>Ver todas las asistencias</button>
                  <button className="btn btn-outline-secondary"><i className="bi bi-person-lines-fill me-2"></i>Gestionar personas</button>
                  <button className="btn btn-outline-success"><i className="bi bi-download me-2"></i>Descargar asistencias</button>
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