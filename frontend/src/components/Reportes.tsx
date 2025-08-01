import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

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

interface ReportesProps {
  asistencias: Asistencia[];
}

const Reportes: React.FC<ReportesProps> = ({ asistencias }) => {
  const [tipoReporte, setTipoReporte] = useState<'general' | 'justificaciones' | 'temperatura' | 'tendencias'>('general');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Filtrar asistencias por rango de fechas
  const asistenciasFiltradas = asistencias.filter(asistencia => {
    if (!fechaInicio && !fechaFin) return true;
    
    const fechaAsistencia = new Date(asistencia.fecha_hora);
    const inicio = fechaInicio ? new Date(fechaInicio) : null;
    const fin = fechaFin ? new Date(fechaFin + 'T23:59:59') : null;
    
    return (!inicio || fechaAsistencia >= inicio) && (!fin || fechaAsistencia <= fin);
  });

  // Calcular estadísticas generales
  const totalAsistencias = asistenciasFiltradas.length;
  const presentes = asistenciasFiltradas.filter(a => a.estado.nombre === 'Presente').length;
  const ausentes = asistenciasFiltradas.filter(a => a.estado.nombre === 'Ausente').length;
  const porcentajePresentes = totalAsistencias > 0 ? Math.round((presentes / totalAsistencias) * 100) : 0;
  const porcentajeAusentes = totalAsistencias > 0 ? Math.round((ausentes / totalAsistencias) * 100) : 0;

  // Estadísticas por tipo de persona
  const statsPorTipo = [
    {
      tipo: 'Alumnos',
      presentes: asistenciasFiltradas.filter(a => a.persona.curso && a.estado.nombre === 'Presente').length,
      ausentes: asistenciasFiltradas.filter(a => a.persona.curso && a.estado.nombre === 'Ausente').length,
    },
    {
      tipo: 'Profesores',
      presentes: asistenciasFiltradas.filter(a => !a.persona.curso && a.persona.nombre.includes('Prof') && a.estado.nombre === 'Presente').length,
      ausentes: asistenciasFiltradas.filter(a => !a.persona.curso && a.persona.nombre.includes('Prof') && a.estado.nombre === 'Ausente').length,
    },
    {
      tipo: 'Personal',
      presentes: asistenciasFiltradas.filter(a => !a.persona.curso && !a.persona.nombre.includes('Prof') && a.estado.nombre === 'Presente').length,
      ausentes: asistenciasFiltradas.filter(a => !a.persona.curso && !a.persona.nombre.includes('Prof') && a.estado.nombre === 'Ausente').length,
    }
  ];

  // Estadísticas por curso
  const cursos = Array.from(new Set(asistenciasFiltradas.filter(a => a.persona.curso).map(a => a.persona.curso!.nombre)));
  const statsPorCurso = cursos.map(curso => ({
    curso,
    presentes: asistenciasFiltradas.filter(a => a.persona.curso?.nombre === curso && a.estado.nombre === 'Presente').length,
    ausentes: asistenciasFiltradas.filter(a => a.persona.curso?.nombre === curso && a.estado.nombre === 'Ausente').length,
  }));

  // Estadísticas por fecha
  const statsPorFecha = asistenciasFiltradas.reduce((acc, asistencia) => {
    const fecha = asistencia.fecha_hora.split('T')[0];
    if (!acc[fecha]) {
      acc[fecha] = { fecha, presentes: 0, ausentes: 0 };
    }
    if (asistencia.estado.nombre === 'Presente') {
      acc[fecha].presentes++;
    } else {
      acc[fecha].ausentes++;
    }
    return acc;
  }, {} as Record<string, { fecha: string; presentes: number; ausentes: number }>);

  const datosPorFecha = Object.values(statsPorFecha).sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Estadísticas de justificaciones
  const justificaciones = asistenciasFiltradas.filter(a => a.justificacion);
  const statsJustificaciones = [
    {
      tipo: 'Salud',
      cantidad: justificaciones.filter(j => j.justificacion?.tipo === 'salud').length,
      color: '#dc3545'
    },
    {
      tipo: 'Justificado',
      cantidad: justificaciones.filter(j => j.justificacion?.tipo === 'justificado').length,
      color: '#ffc107'
    },
    {
      tipo: 'Varios',
      cantidad: justificaciones.filter(j => j.justificacion?.tipo === 'varios').length,
      color: '#17a2b8'
    }
  ];

  // Temperaturas (solo de presentes)
  const temperaturas = asistenciasFiltradas
    .filter(a => a.estado.nombre === 'Presente' && a.temperatura > 0)
    .map(a => a.temperatura);

  const tempPromedio = temperaturas.length > 0 ? (temperaturas.reduce((a, b) => a + b, 0) / temperaturas.length).toFixed(1) : 0;
  const tempMax = temperaturas.length > 0 ? Math.max(...temperaturas) : 0;
  const tempMin = temperaturas.length > 0 ? Math.min(...temperaturas) : 0;

  // Datos para gráfico de pie
  const pieData = [
    { name: 'Presentes', value: presentes, color: '#28a745' },
    { name: 'Ausentes', value: ausentes, color: '#dc3545' }
  ];

  return (
    <div className="container-fluid">
      {/* Header con filtros */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow border-0 rounded-3">
            <div className="card-header bg-primary text-white rounded-top-3">
              <h2 className="h4 mb-0">
                <i className="bi bi-graph-up me-2"></i>Reportes de Asistencia
              </h2>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Fecha Inicio</label>
                  <input
                    type="date"
                    className="form-control"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Fecha Fin</label>
                  <input
                    type="date"
                    className="form-control"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Tipo de Reporte</label>
                  <select
                    className="form-select"
                    value={tipoReporte}
                    onChange={(e) => setTipoReporte(e.target.value as any)}
                  >
                    <option value="general">Reporte General</option>
                    <option value="justificaciones">Justificaciones</option>
                    <option value="temperatura">Temperatura</option>
                    <option value="tendencias">Tendencias</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Acciones</label>
                  <button className="btn btn-outline-primary w-100">
                    <i className="bi bi-download me-1"></i>Exportar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido del reporte según tipo */}
      {tipoReporte === 'general' && (
        <div className="row g-4">
          {/* Tarjetas de resumen */}
          <div className="col-12">
            <div className="row g-3">
              <div className="col-md-3">
                <div className="card bg-primary text-white border-0 shadow">
                  <div className="card-body text-center">
                    <i className="bi bi-people-fill display-6 mb-2"></i>
                    <h4 className="mb-1">{totalAsistencias}</h4>
                    <p className="mb-0 small">Total Asistencias</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-success text-white border-0 shadow">
                  <div className="card-body text-center">
                    <i className="bi bi-person-check-fill display-6 mb-2"></i>
                    <h4 className="mb-1">{presentes}</h4>
                    <p className="mb-0 small">Presentes ({porcentajePresentes}%)</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-danger text-white border-0 shadow">
                  <div className="card-body text-center">
                    <i className="bi bi-person-x-fill display-6 mb-2"></i>
                    <h4 className="mb-1">{ausentes}</h4>
                    <p className="mb-0 small">Ausentes ({porcentajeAusentes}%)</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-info text-white border-0 shadow">
                  <div className="card-body text-center">
                    <i className="bi bi-thermometer-half display-6 mb-2"></i>
                    <h4 className="mb-1">{tempPromedio}°C</h4>
                    <p className="mb-0 small">Temp. Promedio</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="col-md-6">
            <div className="card shadow border-0">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-pie-chart me-2"></i>Distribución por Estado
                </h6>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow border-0">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-bar-chart me-2"></i>Asistencias por Tipo
                </h6>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statsPorTipo}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tipo" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="presentes" fill="#28a745" name="Presentes" />
                    <Bar dataKey="ausentes" fill="#dc3545" name="Ausentes" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {statsPorCurso.length > 0 && (
            <div className="col-md-6">
              <div className="card shadow border-0">
                <div className="card-header bg-light">
                  <h6 className="mb-0">
                    <i className="bi bi-graph-up me-2"></i>Asistencias por Curso
                  </h6>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statsPorCurso}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="curso" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="presentes" fill="#28a745" name="Presentes" />
                      <Bar dataKey="ausentes" fill="#dc3545" name="Ausentes" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tipoReporte === 'justificaciones' && (
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card shadow border-0">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-pie-chart me-2"></i>Distribución de Justificaciones
                </h6>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statsJustificaciones}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="cantidad"
                    >
                      {statsJustificaciones.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {tipoReporte === 'temperatura' && (
        <div className="row g-4">
          <div className="col-12">
            <div className="card shadow border-0">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-thermometer-half me-2"></i>Estadísticas de Temperatura
                </h6>
              </div>
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-md-4">
                    <div className="border-end">
                      <h4 className="text-success">{tempPromedio}°C</h4>
                      <p className="text-muted mb-0">Temperatura Promedio</p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="border-end">
                      <h4 className="text-danger">{tempMax}°C</h4>
                      <p className="text-muted mb-0">Temperatura Máxima</p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <h4 className="text-info">{tempMin}°C</h4>
                    <p className="text-muted mb-0">Temperatura Mínima</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tipoReporte === 'tendencias' && datosPorFecha.length > 1 && (
        <div className="row g-4">
          <div className="col-12">
            <div className="card shadow border-0">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-graph-up me-2"></i>Evolución Temporal
                </h6>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={datosPorFecha}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="presentes" stroke="#28a745" name="Presentes" strokeWidth={2} />
                    <Line type="monotone" dataKey="ausentes" stroke="#dc3545" name="Ausentes" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reportes; 