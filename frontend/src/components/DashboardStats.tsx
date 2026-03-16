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
  Line,
  AreaChart,
  Area
} from 'recharts';
import { getLocalDateString, formatDateAr } from '../utils/dateUtils';

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

interface DashboardStatsProps {
  asistencias: Asistencia[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ asistencias }) => {
  // Calcular estadísticas generales
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

  // Estadísticas por fecha
  const statsPorFecha = asistencias.reduce((acc, asistencia) => {
    const localDate = new Date(asistencia.fecha_hora);
    const fechaYMD = getLocalDateString(localDate);
    
    if (!acc[fechaYMD]) {
      acc[fechaYMD] = { fecha: formatDateAr(fechaYMD), fechaYMD, presentes: 0, ausentes: 0 };
    }
    if (asistencia.estado.nombre === 'Presente') {
      acc[fechaYMD].presentes++;
    } else {
      acc[fechaYMD].ausentes++;
    }
    return acc;
  }, {} as Record<string, { fecha: string; fechaYMD: string; presentes: number; ausentes: number }>);

  const datosPorFecha = Object.values(statsPorFecha)
    .sort((a, b) => a.fechaYMD.localeCompare(b.fechaYMD))
    .slice(-7); // Últimos 7 días

  // Estadísticas de temperatura
  const temperaturasValidas = asistencias.filter(a => a.temperatura > 0);
  const promedioTemperatura = temperaturasValidas.length > 0 
    ? Math.round((temperaturasValidas.reduce((sum, a) => sum + a.temperatura, 0) / temperaturasValidas.length) * 10) / 10
    : 0;

  const alertasFiebre = asistencias.filter(a => a.temperatura > 37.5).length;

  // Colores para gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="dashboard-stats">
      {/* KPIs Principales */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card bg-primary text-white">
            <div className="card-body text-center">
              <h3 className="card-title">{totalAsistencias}</h3>
              <p className="card-text">Total Registros</p>
              <i className="fas fa-users fa-2x"></i>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-success text-white">
            <div className="card-body text-center">
              <h3 className="card-title">{porcentajePresentes}%</h3>
              <p className="card-text">Presentes</p>
              <i className="fas fa-check-circle fa-2x"></i>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-danger text-white">
            <div className="card-body text-center">
              <h3 className="card-title">{porcentajeAusentes}%</h3>
              <p className="card-text">Ausentes</p>
              <i className="fas fa-times-circle fa-2x"></i>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-warning text-white">
            <div className="card-body text-center">
              <h3 className="card-title">{alertasFiebre}</h3>
              <p className="card-text">Alertas Fiebre</p>
              <i className="fas fa-thermometer-half fa-2x"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="row mb-4">
        {/* Gráfico de Asistencia por Tipo */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">Asistencia por Tipo de Persona</h6>
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

        {/* Gráfico de Distribución General */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">Distribución General</h6>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Presentes', value: presentes },
                      { name: 'Ausentes', value: ausentes }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  >
                    <Cell fill="#28a745" />
                    <Cell fill="#dc3545" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Tendencias */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">Tendencia de Asistencia (Últimos 7 días)</h6>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={datosPorFecha}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="presentes" stackId="1" stroke="#28a745" fill="#28a745" name="Presentes" />
                  <Area type="monotone" dataKey="ausentes" stackId="1" stroke="#dc3545" fill="#dc3545" name="Ausentes" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas Adicionales */}
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">Estadísticas de Temperatura</h6>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6">
                  <h4 className="text-primary">{promedioTemperatura}°C</h4>
                  <p className="text-muted">Temperatura Promedio</p>
                </div>
                <div className="col-6">
                  <h4 className="text-warning">{alertasFiebre}</h4>
                  <p className="text-muted">Alertas de Fiebre</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">Justificaciones</h6>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-4">
                  <h5 className="text-info">
                    {asistencias.filter(a => a.justificacion?.tipo === 'salud').length}
                  </h5>
                  <small className="text-muted">Salud</small>
                </div>
                <div className="col-4">
                  <h5 className="text-warning">
                    {asistencias.filter(a => a.justificacion?.tipo === 'justificado').length}
                  </h5>
                  <small className="text-muted">Justificado</small>
                </div>
                <div className="col-4">
                  <h5 className="text-secondary">
                    {asistencias.filter(a => a.justificacion?.tipo === 'varios').length}
                  </h5>
                  <small className="text-muted">Varios</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {alertasFiebre > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-warning">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <strong>¡Atención!</strong> Se han detectado {alertasFiebre} casos con temperatura elevada (mayor a 37.5°C).
            </div>
          </div>
        </div>
      )}

      {porcentajeAusentes > 20 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-circle me-2"></i>
              <strong>¡Alerta!</strong> El porcentaje de ausencias ({porcentajeAusentes}%) es superior al 20%.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardStats; 