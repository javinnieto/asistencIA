import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { apiRequest } from '../config/api';
import './Dashboard.css';
import { getLocalDateString, formatDateAr } from '../utils/dateUtils';

// Types
type TimeRange = 'day' | 'week' | 'month' | 'custom';
type ScopeType = 'all' | 'institution' | 'course';
type ChartMode = 'attendance' | 'temperature';

interface Institucion {
  idInstitucion: number;
  nombre: string;
}

interface Curso {
  idCurso: number;
  nombre: string;
}

interface ChartData {
  name: string;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  avgTemp: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // UI State - Init from URL
  const [timeRange, setTimeRange] = useState<TimeRange>((searchParams.get('timeRange') as TimeRange) || 'day');
  const [scopeType, setScopeType] = useState<ScopeType>((searchParams.get('scopeType') as ScopeType) || 'all');
  const [selectedScopeId, setSelectedScopeId] = useState<string>(searchParams.get('scopeId') || '');
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<ChartMode>((searchParams.get('chartMode') as ChartMode) || 'attendance');

  // Custom Date Range State - Init from URL
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || getLocalDateString());
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || getLocalDateString());

  // Sync state changes to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('timeRange', timeRange);
    params.set('scopeType', scopeType);
    if (selectedScopeId) params.set('scopeId', selectedScopeId);
    params.set('chartMode', chartMode);

    if (timeRange === 'custom') {
      params.set('startDate', startDate);
      params.set('endDate', endDate);
    }

    setSearchParams(params, { replace: true });
  }, [timeRange, scopeType, selectedScopeId, chartMode, startDate, endDate]);

  // Data State
  const [stats, setStats] = useState({ total: 0, presentes: 0, ausentes: 0, tardanzas: 0, avgTemp: 0, fiebre: 0 });
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Select Options
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);

  useEffect(() => {
    // Load options
    apiRequest('/instituciones/').then(r => r.json()).then(d => setInstituciones(d.results || []));
    apiRequest('/cursos/').then(r => r.json()).then(d => setCursos(d.results || []));
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, scopeType, selectedScopeId, startDate, endDate]);

  // Build filter params shared by stats and chart-data endpoints
  const buildFilterParams = (): URLSearchParams => {
    const params = new URLSearchParams();
    const now = new Date();
    let startD = new Date();

    if (timeRange === 'day') {
      params.append('fechaHora__date', getLocalDateString(now));
    } else if (timeRange === 'week') {
      startD.setDate(now.getDate() - 7);
      params.append('fechaHora__gte', getLocalDateString(startD) + 'T00:00:00');
    } else if (timeRange === 'month') {
      startD.setMonth(now.getMonth() - 1);
      params.append('fechaHora__gte', getLocalDateString(startD) + 'T00:00:00');
    } else if (timeRange === 'custom') {
      params.append('fechaHora__gte', `${startDate}T00:00:00`);
      params.append('fechaHora__lte', `${endDate}T23:59:59`);
    }

    // Scope Filters
    if (scopeType === 'institution' && selectedScopeId) {
      params.append('institucion', selectedScopeId);
    } else if (scopeType === 'course' && selectedScopeId) {
      params.append('horario__curso', selectedScopeId);
    }

    return params;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const filterParams = buildFilterParams();

      // Fetch stats and chart data in PARALLEL
      const statsParams = new URLSearchParams(filterParams.toString());
      const chartParams = new URLSearchParams(filterParams.toString());
      chartParams.append('group_by', timeRange === 'day' ? 'hour' : 'date');

      const [statsRes, chartRes] = await Promise.all([
        apiRequest(`/asistencias/stats/?${statsParams.toString()}`),
        apiRequest(`/asistencias/chart-data/?${chartParams.toString()}`),
      ]);

      // Process stats
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(prev => ({
          ...prev,
          total: statsData.total,
          presentes: statsData.presentes,
          ausentes: statsData.ausentes,
          tardanzas: statsData.tardanzas,
          fiebre: statsData.fiebre,
        }));
      }

      // Process chart data
      if (chartRes.ok) {
        const chartResult: ChartData[] = await chartRes.json();
        
        const formattedResult = chartResult.map(c => ({
          ...c,
          name: timeRange === 'day' ? c.name : formatDateAr(c.name)
        }));
        
        setChartData(formattedResult);

        // Calculate avgTemp from chart data
        const tempsWithData = chartResult.filter(d => d.avgTemp > 0);
        const avgTemp = tempsWithData.length
          ? Number((tempsWithData.reduce((sum, d) => sum + d.avgTemp, 0) / tempsWithData.length).toFixed(1))
          : 0;
        setStats(prev => ({ ...prev, avgTemp }));
      }

      // Handle 401
      if (statsRes.status === 401 || chartRes.status === 401) {
        localStorage.removeItem('accessToken');
        navigate('/login');
        return;
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate dynamic Y-axis domains based on actual data
  const attendanceDomain = useMemo((): [number, number] => {
    if (chartData.length === 0) return [0, 10];

    const allValues = chartData.flatMap(d => [d.presentes, d.tardanzas]);
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);

    // If all values are 0, show 0 to 10
    if (maxVal === 0) return [0, 10];

    const range = maxVal - minVal;

    // Add padding: at least 1 unit or 20% of range
    const padding = Math.max(1, Math.ceil(range * 0.2));

    const domainMin = Math.max(0, minVal - padding);
    const domainMax = maxVal + padding;

    return [domainMin, domainMax];
  }, [chartData]);

  const temperatureDomain = useMemo((): [number, number] => {
    if (chartData.length === 0) return [35, 39];

    const temps = chartData.filter(d => d.avgTemp > 0).map(d => d.avgTemp);
    if (temps.length === 0) return [35, 39];

    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const range = maxTemp - minTemp;

    // For temperature: pad by at least 0.5°C or 20% of range
    const padding = Math.max(0.5, range * 0.2);

    const domainMin = Math.floor((minTemp - padding) * 2) / 2; // Round down to nearest 0.5
    const domainMax = Math.ceil((maxTemp + padding) * 2) / 2;  // Round up to nearest 0.5

    return [domainMin, domainMax];
  }, [chartData]);


  // Helper function to build Asistencias URL with current dashboard filters
  const buildAsistenciasUrl = (additionalParams: Record<string, string> = {}) => {
    const params = new URLSearchParams();

    // Add date filters based on current dashboard state
    const now = new Date();
    let startD = new Date();

    if (timeRange === 'day') {
      const dayStr = getLocalDateString(now);
      params.append('fechaInicio', dayStr);
      params.append('fechaFin', dayStr);
    } else if (timeRange === 'week') {
      startD.setDate(now.getDate() - 7);
      params.append('fechaInicio', getLocalDateString(startD));
      params.append('fechaFin', getLocalDateString(now));
    } else if (timeRange === 'month') {
      startD.setMonth(now.getMonth() - 1);
      params.append('fechaInicio', getLocalDateString(startD));
      params.append('fechaFin', getLocalDateString(now));
    } else if (timeRange === 'custom') {
      params.append('fechaInicio', startDate);
      params.append('fechaFin', endDate);
    }

    // Add scope filter if applicable
    if (scopeType === 'course' && selectedScopeId) {
      params.append('curso', selectedScopeId);
    }

    // Add additional parameters (like estado, minTemp, etc.)
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.append(key, value);
    });

    const queryString = params.toString();
    return `/asistencias${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="dashboard-container">
      <div className="header-title-group">
        <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          {timeRange === 'day' ? 'Datos del día de hoy' : 
           timeRange === 'week' ? 'Datos de los últimos 7 días' : 
           timeRange === 'month' ? 'Datos de los últimos 30 días' : 
           `Datos de Rango Personalizado`}
        </h1>
        <p style={{ color: '#94a3b8', margin: '4px 0 0 0', fontWeight: 500 }}>
           {timeRange === 'custom' ? `Desde el ${formatDateAr(startDate)} hasta el ${formatDateAr(endDate)}` : 'Monitoreo de Asistencias'}
        </p>
      </div>

      {/* Inline Filters Container */}
      <div className="header-filters-wrapper">
        <div className="filters-container inline-filters">
              {/* Time Range */}
              <div className="filter-group">
                  <button className={`filter-btn ${timeRange === 'day' ? 'active' : ''}`} onClick={() => setTimeRange('day')}>Hoy</button>
                  <button className={`filter-btn ${timeRange === 'week' ? 'active' : ''}`} onClick={() => setTimeRange('week')}>Semana</button>
                  <button className={`filter-btn ${timeRange === 'month' ? 'active' : ''}`} onClick={() => setTimeRange('month')}>Mes</button>
                  <button className={`filter-btn ${timeRange === 'custom' ? 'active' : ''}`} onClick={() => setTimeRange('custom')}>Custom</button>
              </div>

              {timeRange === 'custom' && (
                  <div className="custom-range-inputs d-flex gap-2 align-items-center">
                      <input
                          type="date"
                          className="ch-input border-0 bg-transparent text-white"
                          style={{ padding: '0 4px', fontSize: '0.85rem' }}
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                      />
                      <span style={{ color: '#64748b' }}>-</span>
                      <input
                          type="date"
                          lang="es-AR"
                          className="ch-input border-0 bg-transparent text-white"
                          style={{ padding: '0 4px', fontSize: '0.85rem' }}
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                      />
                  </div>
              )}

              <div className="filter-divider d-none d-md-block"></div>

              {/* Scope Selector */}
              <select
                  className="scope-select sleek-select"
                  value={scopeType}
                  onChange={(e) => {
                      setScopeType(e.target.value as ScopeType);
                      setSelectedScopeId('');
                  }}
              >
                  <option value="all" className="text-dark">Todos los Cursos</option>
                  <option value="institution" className="text-dark">Por Institución</option>
                  <option value="course" className="text-dark">Por Curso Específico</option>
              </select>

              {scopeType !== 'all' && (
                  <select
                      className="scope-select sleek-select"
                      value={selectedScopeId}
                      onChange={(e) => setSelectedScopeId(e.target.value)}
                  >
                      <option value="" className="text-dark">Seleccionar...</option>
                      {scopeType === 'institution'
                          ? instituciones.map(i => <option key={i.idInstitucion} value={i.idInstitucion} className="text-dark">{i.nombre}</option>)
                          : cursos.map(c => <option key={c.idCurso} value={c.idCurso} className="text-dark">{c.nombre}</option>)
                      }
                  </select>
              )}
          </div>
        </div>

      <div className="dashboard-main-layout">
        {/* Left Column: Metrics Grid */}
        <div className="stats-grid">
          <div onClick={() => navigate(buildAsistenciasUrl())} style={{ cursor: 'pointer' }}>
            <StatCard icon="bi-people-fill" label="Total Registros" value={stats.total} color="primary" />
          </div>
          <div onClick={() => navigate(buildAsistenciasUrl({ estado: 'Presente' }))} style={{ cursor: 'pointer' }}>
            <StatCard icon="bi-check-circle-fill" label="Presentes" value={stats.presentes} color="success" />
          </div>
          <div onClick={() => navigate(buildAsistenciasUrl({ estado: 'Tardanza' }))} style={{ cursor: 'pointer' }}>
            <StatCard icon="bi-exclamation-circle-fill" label="Tardanzas" value={stats.tardanzas} color="warning" />
          </div>
          <div onClick={() => navigate(buildAsistenciasUrl({ minTemp: '37.6' }))} style={{ cursor: 'pointer' }}>
            <StatCard icon="bi-thermometer-high" label="Fiebre (>37.5)" value={stats.fiebre} color="danger" />
          </div>
        </div>

        {/* Right Column: Chart Section */}
        <div className="dashboard-card chart-container">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="card-title">
              {chartMode === 'attendance' ? 'Tendencia de Asistencia' : 'Historial de Temperatura'}
            </h3>
            <div className="toggle-group filter-group" style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '4px', borderRadius: '100px' }}>
              <button
                className={`filter-btn ${chartMode === 'attendance' ? 'active' : ''}`}
                onClick={() => setChartMode('attendance')}
              >
                Asistencia
              </button>
              <button
                className={`filter-btn ${chartMode === 'temperature' ? 'active' : ''}`}
                onClick={() => setChartMode('temperature')}
              >
                Temperatura
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 350 }}>
              <div className="dashboard-spinner"></div>
            </div>
          ) : chartData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 350, color: '#64748b', fontSize: '1.1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <i className="bi bi-bar-chart" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px', opacity: 0.5 }}></i>
                No hay datos para el período seleccionado
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 400, paddingBottom: '20px', width: '100%' }}>
              <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 30 }}>
              <defs>
                <linearGradient id="colorPresentes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTardanzas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={chartMode === 'temperature' ? temperatureDomain : attendanceDomain}
                unit={chartMode === 'temperature' ? '°C' : ''}
                allowDataOverflow={false}
              />
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />

              {chartMode === 'attendance' ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="presentes"
                    name="Presentes"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorPresentes)"
                  />
                  <Area
                    type="monotone"
                    dataKey="tardanzas"
                    name="Tardanzas"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTardanzas)"
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="avgTemp"
                  name="Promedio Temp"
                  stroke="#ef4444"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTemp)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
           </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <div className="stat-card">
    <div className={`stat-icon-wrapper ${color}`}>
      <i className={`bi ${icon}`}></i>
    </div>
    <div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  </div>
);

export default Dashboard;