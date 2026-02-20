import React from 'react';
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
}

interface AsistenciasStatsProps {
  asistencias: Asistencia[];
}

const AsistenciasStats: React.FC<AsistenciasStatsProps> = ({ asistencias }) => {
  // Calcular estadísticas
  const totalAsistencias = asistencias.length;
  const presentes = asistencias.filter(a => a.estado.nombre === 'Presente').length;
  const ausentes = asistencias.filter(a => a.estado.nombre === 'Ausente').length;
  const porcentajePresentes = totalAsistencias > 0 ? Math.round((presentes / totalAsistencias) * 100) : 0;
  const porcentajeAusentes = totalAsistencias > 0 ? Math.round((ausentes / totalAsistencias) * 100) : 0;

  // Estadísticas por tipo de persona
  const statsPorTipo = [
    {
      tipo: 'Alumnos',
      presentes: asistencias.filter(a => a.persona.curso && a.estado.nombre === 'Presente').length,
      ausentes: asistencias.filter(a => a.persona.curso && a.estado.nombre === 'Ausente').length,
    },
    {
      tipo: 'Profesores',
      presentes: asistencias.filter(a => !a.persona.curso && a.persona.nombre.includes('Prof') && a.estado.nombre === 'Presente').length,
      ausentes: asistencias.filter(a => !a.persona.curso && a.persona.nombre.includes('Prof') && a.estado.nombre === 'Ausente').length,
    },
    {
      tipo: 'Personal',
      presentes: asistencias.filter(a => !a.persona.curso && !a.persona.nombre.includes('Prof') && a.estado.nombre === 'Presente').length,
      ausentes: asistencias.filter(a => !a.persona.curso && !a.persona.nombre.includes('Prof') && a.estado.nombre === 'Ausente').length,
    }
  ];

  // Estadísticas por curso
  const cursos = Array.from(new Set(asistencias.filter(a => a.persona.curso).map(a => a.persona.curso!.nombre)));
  const statsPorCurso = cursos.map(curso => ({
    curso,
    presentes: asistencias.filter(a => a.persona.curso?.nombre === curso && a.estado.nombre === 'Presente').length,
    ausentes: asistencias.filter(a => a.persona.curso?.nombre === curso && a.estado.nombre === 'Ausente').length,
  }));

  // Estadísticas por fecha (Asistencias + Temperatura)
  const statsPorFechaDict = asistencias.reduce((acc, asistencia) => {
    const fecha = asistencia.fecha_hora.split('T')[0];
    if (!acc[fecha]) {
      acc[fecha] = { fecha, presentes: 0, ausentes: 0, tempSum: 0, tempCount: 0 };
    }
    if (asistencia.estado.nombre === 'Presente') {
      acc[fecha].presentes++;
      if (asistencia.temperatura > 0) {
        acc[fecha].tempSum += asistencia.temperatura;
        acc[fecha].tempCount++;
      }
    } else {
      acc[fecha].ausentes++;
    }
    return acc;
  }, {} as Record<string, { fecha: string; presentes: number; ausentes: number; tempSum: number; tempCount: number }>);

  const datosPorFecha = Object.values(statsPorFechaDict)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(d => ({
      ...d,
      tempPromedio: d.tempCount > 0 ? Number((d.tempSum / d.tempCount).toFixed(1)) : 0
    }));

  // Datos para gráfico de pie
  const pieData = [
    { name: 'Presentes', value: presentes, color: '#28a745' },
    { name: 'Ausentes', value: ausentes, color: '#dc3545' }
  ];

  // Temperaturas (solo de presentes)
  const temperaturas = asistencias
    .filter(a => a.estado.nombre === 'Presente' && a.temperatura > 0)
    .map(a => a.temperatura);

  const tempPromedio = temperaturas.length > 0 ? (temperaturas.reduce((a, b) => a + b, 0) / temperaturas.length).toFixed(1) : 0;
  const tempMax = temperaturas.length > 0 ? Math.max(...temperaturas) : 0;
  const tempMin = temperaturas.length > 0 ? Math.min(...temperaturas) : 0;

  return (
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

      {/* Gráfico de distribución por estado */}
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

      {/* Gráfico por tipo de persona */}
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

      {/* Gráfico por curso */}
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

      {/* Gráfico temporal de Asistencias */}
      {datosPorFecha.length > 1 && (
        <div className="col-md-6">
          <div className="card shadow border-0">
            <div className="card-header bg-light">
              <h6 className="mb-0">
                <i className="bi bi-graph-up me-2"></i>Evolución de Asistencias
              </h6>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
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
      )}

      {/* Gráfico temporal de Temperatura */}
      {datosPorFecha.length > 1 && (
        <div className="col-md-6">
          <div className="card shadow border-0">
            <div className="card-header bg-light">
              <h6 className="mb-0">
                <i className="bi bi-thermometer-half me-2"></i>Evolución de Temperatura
              </h6>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={datosPorFecha}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                  <Tooltip formatter={(value: number) => [`${value}°C`, 'Gradios']} />
                  <Legend />
                  <Line type="monotone" dataKey="tempPromedio" stroke="#fd7e14" name="Temp. Promedio" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas de temperatura Cards */}
      {temperaturas.length > 0 && (
        <div className="col-12">
          <div className="card shadow border-0">
            <div className="card-header bg-light">
              <h6 className="mb-0">
                <i className="bi bi-thermometer-sun me-2"></i>Resumen de Temperatura
              </h6>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-md-4">
                  <div className="border-end">
                    <h4 className="text-success">{tempPromedio}°C</h4>
                    <p className="text-muted mb-0">Promedio General</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="border-end">
                    <h4 className="text-danger">{tempMax}°C</h4>
                    <p className="text-muted mb-0">Máxima Registrada</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <h4 className="text-info">{tempMin}°C</h4>
                  <p className="text-muted mb-0">Mínima Registrada</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsistenciasStats; 