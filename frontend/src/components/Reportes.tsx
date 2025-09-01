import React, { useState, useEffect } from 'react';
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
  Area,
  ComposedChart
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
  // Estados para reportes avanzados
  const [tipoReporte, setTipoReporte] = useState<'general' | 'justificaciones' | 'temperatura' | 'tendencias' | 'avanzado'>('general');
  const [periodoReporte, setPeriodoReporte] = useState<'diario' | 'semanal' | 'mensual' | 'trimestral' | 'anual'>('mensual');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [mostrarComparativa, setMostrarComparativa] = useState(false);
  const [alertas, setAlertas] = useState<string[]>([]);

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

  // Funciones para reportes avanzados
  const generarDatosPorPeriodo = () => {
    const hoy = new Date();
    const datos = [];
    
    switch (periodoReporte) {
      case 'diario':
        for (let i = 6; i >= 0; i--) {
          const fecha = new Date(hoy);
          fecha.setDate(fecha.getDate() - i);
          const fechaStr = fecha.toISOString().split('T')[0];
          const asistenciasDelDia = asistenciasFiltradas.filter(a => 
            a.fecha_hora.includes(fechaStr)
          );
          datos.push({
            fecha: fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
            presentes: asistenciasDelDia.filter(a => a.estado.nombre === 'Presente').length,
            ausentes: asistenciasDelDia.filter(a => a.estado.nombre === 'Ausente').length,
            porcentaje: asistenciasDelDia.length > 0 ? 
              Math.round((asistenciasDelDia.filter(a => a.estado.nombre === 'Presente').length / asistenciasDelDia.length) * 100) : 0
          });
        }
        break;
      case 'semanal':
        for (let i = 3; i >= 0; i--) {
          const fecha = new Date(hoy);
          fecha.setDate(fecha.getDate() - (i * 7));
          const semanaInicio = new Date(fecha);
          semanaInicio.setDate(semanaInicio.getDate() - semanaInicio.getDay());
          const semanaFin = new Date(semanaInicio);
          semanaFin.setDate(semanaFin.getDate() + 6);
          
          const asistenciasSemana = asistenciasFiltradas.filter(a => {
            const fechaAsistencia = new Date(a.fecha_hora);
            return fechaAsistencia >= semanaInicio && fechaAsistencia <= semanaFin;
          });
          
          datos.push({
            fecha: `Sem ${semanaInicio.getDate()}/${semanaFin.getDate()}`,
            presentes: asistenciasSemana.filter(a => a.estado.nombre === 'Presente').length,
            ausentes: asistenciasSemana.filter(a => a.estado.nombre === 'Ausente').length,
            porcentaje: asistenciasSemana.length > 0 ? 
              Math.round((asistenciasSemana.filter(a => a.estado.nombre === 'Presente').length / asistenciasSemana.length) * 100) : 0
          });
        }
        break;
      case 'mensual':
        for (let i = 5; i >= 0; i--) {
          const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
          const mesInicio = new Date(fecha);
          const mesFin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
          
          const asistenciasMes = asistenciasFiltradas.filter(a => {
            const fechaAsistencia = new Date(a.fecha_hora);
            return fechaAsistencia >= mesInicio && fechaAsistencia <= mesFin;
          });
          
          datos.push({
            fecha: fecha.toLocaleDateString('es-ES', { month: 'short' }),
            presentes: asistenciasMes.filter(a => a.estado.nombre === 'Presente').length,
            ausentes: asistenciasMes.filter(a => a.estado.nombre === 'Ausente').length,
            porcentaje: asistenciasMes.length > 0 ? 
              Math.round((asistenciasMes.filter(a => a.estado.nombre === 'Presente').length / asistenciasMes.length) * 100) : 0
          });
        }
        break;
      case 'trimestral':
        for (let i = 3; i >= 0; i--) {
          const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - (i * 3), 1);
          const trimestreInicio = new Date(fecha);
          const trimestreFin = new Date(fecha.getFullYear(), fecha.getMonth() + 3, 0);
          
          const asistenciasTrimestre = asistenciasFiltradas.filter(a => {
            const fechaAsistencia = new Date(a.fecha_hora);
            return fechaAsistencia >= trimestreInicio && fechaAsistencia <= trimestreFin;
          });
          
          datos.push({
            fecha: `T${Math.floor(fecha.getMonth() / 3) + 1} ${fecha.getFullYear()}`,
            presentes: asistenciasTrimestre.filter(a => a.estado.nombre === 'Presente').length,
            ausentes: asistenciasTrimestre.filter(a => a.estado.nombre === 'Ausente').length,
            porcentaje: asistenciasTrimestre.length > 0 ? 
              Math.round((asistenciasTrimestre.filter(a => a.estado.nombre === 'Presente').length / asistenciasTrimestre.length) * 100) : 0
          });
        }
        break;
      case 'anual':
        for (let i = 2; i >= 0; i--) {
          const año = hoy.getFullYear() - i;
          const añoInicio = new Date(año, 0, 1);
          const añoFin = new Date(año, 11, 31);
          
          const asistenciasAño = asistenciasFiltradas.filter(a => {
            const fechaAsistencia = new Date(a.fecha_hora);
            return fechaAsistencia >= añoInicio && fechaAsistencia <= añoFin;
          });
          
          datos.push({
            fecha: año.toString(),
            presentes: asistenciasAño.filter(a => a.estado.nombre === 'Presente').length,
            ausentes: asistenciasAño.filter(a => a.estado.nombre === 'Ausente').length,
            porcentaje: asistenciasAño.length > 0 ? 
              Math.round((asistenciasAño.filter(a => a.estado.nombre === 'Presente').length / asistenciasAño.length) * 100) : 0
          });
        }
        break;
    }
    
    return datos;
  };

  // Generar datos comparativos
  const generarDatosComparativos = () => {
    const datosActuales = generarDatosPorPeriodo();
    const datosAnteriores = datosActuales.map(dato => ({
      ...dato,
      presentes: Math.round(dato.presentes * 0.9), // Simular datos del año anterior
      ausentes: Math.round(dato.ausentes * 1.1),
      porcentaje: Math.max(0, dato.porcentaje - 5)
    }));
    
    return { actuales: datosActuales, anteriores: datosAnteriores };
  };

  // Detectar alertas y patrones anómalos
  useEffect(() => {
    const nuevasAlertas: string[] = [];
    
    // Alerta por baja asistencia
    if (porcentajePresentes < 80) {
      nuevasAlertas.push(`⚠️ Asistencia baja: ${porcentajePresentes}% (mínimo recomendado: 80%)`);
    }
    
    // Alerta por ausencias consecutivas
    const ausenciasConsecutivas = datosPorFecha.filter((dato, index) => {
      if (index === 0) return false;
      return dato.ausentes > datosPorFecha[index - 1].ausentes * 1.5;
    });
    
    if (ausenciasConsecutivas.length > 0) {
      nuevasAlertas.push(`📈 Incremento significativo de ausencias detectado`);
    }
    
    // Alerta por temperatura alta
    const temperaturasAltas = asistenciasFiltradas.filter(a => 
      a.temperatura > 37.5 && a.estado.nombre === 'Presente'
    );
    
    if (temperaturasAltas.length > 0) {
      nuevasAlertas.push(`🌡️ ${temperaturasAltas.length} personas con temperatura elevada`);
    }
    
    setAlertas(nuevasAlertas);
  }, [asistenciasFiltradas, porcentajePresentes, datosPorFecha]);

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
                <div className="col-md-2">
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
                    <option value="avanzado">Reporte Avanzado</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Período</label>
                  <select
                    className="form-select"
                    value={periodoReporte}
                    onChange={(e) => setPeriodoReporte(e.target.value as any)}
                  >
                    <option value="diario">Diario</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Comparativa</label>
                  <div className="form-check form-switch mt-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={mostrarComparativa}
                      onChange={(e) => setMostrarComparativa(e.target.checked)}
                    />
                    <label className="form-check-label small">Mostrar comparativa</label>
                  </div>
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

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-warning border-0 shadow">
              <h6 className="alert-heading">
                <i className="bi bi-exclamation-triangle me-2"></i>Alertas Detectadas
              </h6>
              <div className="row">
                {alertas.map((alerta, index) => (
                  <div key={index} className="col-md-6 mb-2">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-dot me-2"></i>
                      <span className="small">{alerta}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {tipoReporte === 'avanzado' && (
        <div className="row g-4">
          {/* Reporte por período */}
          <div className="col-12">
            <div className="card shadow border-0">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-calendar-range me-2"></i>Reporte por {periodoReporte.charAt(0).toUpperCase() + periodoReporte.slice(1)}
                </h6>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={generarDatosPorPeriodo()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="presentes" fill="#28a745" name="Presentes" />
                    <Bar yAxisId="left" dataKey="ausentes" fill="#dc3545" name="Ausentes" />
                    <Line yAxisId="right" type="monotone" dataKey="porcentaje" stroke="#007bff" name="% Asistencia" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Comparativa si está habilitada */}
          {mostrarComparativa && (
            <div className="col-12">
              <div className="card shadow border-0">
                <div className="card-header bg-light">
                  <h6 className="mb-0">
                    <i className="bi bi-graph-up-arrow me-2"></i>Comparativa con Período Anterior
                  </h6>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={generarDatosComparativos().actuales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="presentes" fill="#28a745" name="Presentes (Actual)" />
                      <Bar dataKey="ausentes" fill="#dc3545" name="Ausentes (Actual)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* KPIs Avanzados */}
          <div className="col-12">
            <div className="row g-3">
              <div className="col-md-3">
                <div className="card bg-gradient-primary text-white border-0 shadow">
                  <div className="card-body text-center">
                    <i className="bi bi-trending-up display-6 mb-2"></i>
                    <h4 className="mb-1">{generarDatosPorPeriodo().length}</h4>
                    <p className="mb-0 small">Períodos Analizados</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-gradient-success text-white border-0 shadow">
                  <div className="card-body text-center">
                    <i className="bi bi-speedometer2 display-6 mb-2"></i>
                    <h4 className="mb-1">{Math.round(generarDatosPorPeriodo().reduce((acc, dato) => acc + dato.porcentaje, 0) / generarDatosPorPeriodo().length)}%</h4>
                    <p className="mb-0 small">Promedio Asistencia</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-gradient-info text-white border-0 shadow">
                  <div className="card-body text-center">
                    <i className="bi bi-calendar-check display-6 mb-2"></i>
                    <h4 className="mb-1">{generarDatosPorPeriodo().filter(d => d.porcentaje >= 90).length}</h4>
                    <p className="mb-0 small">Días Excelentes</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-gradient-warning text-white border-0 shadow">
                  <div className="card-body text-center">
                    <i className="bi bi-exclamation-triangle display-6 mb-2"></i>
                    <h4 className="mb-1">{generarDatosPorPeriodo().filter(d => d.porcentaje < 80).length}</h4>
                    <p className="mb-0 small">Días Críticos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reportes; 