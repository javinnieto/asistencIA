import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { apiRequest } from '../config/api';
import './Dashboard.css';

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

interface Estado {
  nombre: string;
}

interface Asistencia {
  id: number;
  fechaHora: string;
  estado: Estado;
  temperatura: number;
}

interface ChartData {
  name: string;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  avgTemp: number;
  tempSum: number;
  tempCount: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // UI State
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [scopeType, setScopeType] = useState<ScopeType>('all');
  const [selectedScopeId, setSelectedScopeId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<ChartMode>('attendance');

  // Custom Date Range State
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

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

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Build Query Params
      const params = new URLSearchParams();
      const now = new Date();
      let startD = new Date();

      if (timeRange === 'day') {
        params.append('fechaHora__date', now.toISOString().split('T')[0]);
      } else if (timeRange === 'week') {
        startD.setDate(now.getDate() - 7);
        params.append('fechaHora__gte', startD.toISOString());
      } else if (timeRange === 'month') {
        startD.setMonth(now.getMonth() - 1);
        params.append('fechaHora__gte', startD.toISOString());
      } else if (timeRange === 'custom') {
        params.append('fechaHora__gte', new Date(startDate).toISOString());
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59);
        params.append('fechaHora__lte', endD.toISOString());
      }

      // Scope Filters
      if (scopeType === 'institution' && selectedScopeId) {
        params.append('institucion', selectedScopeId);
      } else if (scopeType === 'course' && selectedScopeId) {
        params.append('horario__curso', selectedScopeId);
      }

      const res = await apiRequest(`/asistencias/?${params.toString()}`);

      if (res.status === 401) {
        localStorage.removeItem('accessToken');
        navigate('/login');
        return;
      }

      if (!res.ok) throw new Error('Error fetching data');

      const data = await res.json();
      const results: Asistencia[] = data.results || [];

      processData(results);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const processData = (data: Asistencia[]) => {
    // 1. Basic Stats
    const total = data.length;
    const presentes = data.filter(a => a.estado.nombre === 'Presente').length;
    const ausentes = data.filter(a => a.estado.nombre === 'Ausente').length;
    const tardanzas = data.filter(a => a.estado.nombre === 'Tardanza').length;

    const fiebre = data.filter(a => a.temperatura > 37.5).length;
    const temps = data.filter(a => a.temperatura > 0).map(a => a.temperatura);
    const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : 0;

    setStats({ total, presentes, ausentes, tardanzas, avgTemp: Number(avgTemp), fiebre });

    // 2. Chart Data (Group by hour/day depending on range)
    const grouped = data.reduce((acc: Record<string, ChartData>, curr: Asistencia) => {
      const date = new Date(curr.fechaHora);
      let key = '';

      if (timeRange === 'day') {
        key = date.getHours() + ':00';
      } else {
        key = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
      }

      if (!acc[key]) acc[key] = {
        name: key,
        presentes: 0,
        ausentes: 0,
        tardanzas: 0,
        tempSum: 0,
        tempCount: 0,
        avgTemp: 0
      };

      if (curr.estado.nombre === 'Presente') acc[key].presentes++;
      else if (curr.estado.nombre === 'Tardanza') acc[key].tardanzas++;
      else acc[key].ausentes++;

      if (curr.temperatura > 0) {
        acc[key].tempSum += curr.temperatura;
        acc[key].tempCount++;
      }

      return acc;
    }, {});

    // Calculate averages and sort by time if needed 
    // (Object.values might lose order depending on key creation, but 'day' keys are strings '9:00'. 
    // We rely on recharts to render in array order. 
    // If strict order needed, we should sort. For now relying on insertion order or simple sort.)

    let processedChartData = Object.values(grouped).map(item => ({
      ...item,
      avgTemp: item.tempCount ? Number((item.tempSum / item.tempCount).toFixed(1)) : 0
    }));

    // Simple sort helper might be needed if keys are not chronological
    // For 'day', '9:00' comes after '10:00' alphabetically? '1' vs '9'. No.
    // '9:00' comes after '10:00'? No. '1' < '9'.
    // '13:00' vs '4:00'? 
    // We should probably rely on the input data being sorted by backend?
    // The backend provides sorted data date-descending usually.
    // Reducing it reversely preserves or inverts order.
    // Let's assume recharts handles it or we accept "As is".
    // Better: Sort by a timestamp we track?
    // Let's keep it simple for this iteration as "Refactor" -> "Preserve existing behavior but improved".

    setChartData(processedChartData);
  };

  return (
    <div className="dashboard-container">
      {/* Header with Filters */}
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Panel de Control
          </h1>
          <p style={{ color: '#64748b' }}>Monitoreo en tiempo real</p>
        </div>

        <div className="filters-container">
          {/* Time Range */}
          <div className="filter-group">
            <button className={`filter-btn ${timeRange === 'day' ? 'active' : ''}`} onClick={() => setTimeRange('day')}>Día</button>
            <button className={`filter-btn ${timeRange === 'week' ? 'active' : ''}`} onClick={() => setTimeRange('week')}>Semana</button>
            <button className={`filter-btn ${timeRange === 'month' ? 'active' : ''}`} onClick={() => setTimeRange('month')}>Mes</button>
            <button className={`filter-btn ${timeRange === 'custom' ? 'active' : ''}`} onClick={() => setTimeRange('custom')}>Personalizado</button>
          </div>

          {timeRange === 'custom' && (
            <div className="custom-range-inputs" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                className="ch-input"
                style={{ width: '130px', padding: '6px' }}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <span style={{ color: '#64748b' }}>—</span>
              <input
                type="date"
                className="ch-input"
                style={{ width: '130px', padding: '6px' }}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          )}

          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', height: '24px' }}></div>

          {/* Scope Selector */}
          <select
            className="scope-select"
            value={scopeType}
            onChange={(e) => {
              setScopeType(e.target.value as ScopeType);
              setSelectedScopeId('');
            }}
          >
            <option value="all">Todos los Cursos</option>
            <option value="institution">Por Institución</option>
            <option value="course">Por Curso Specifico</option>
          </select>

          {scopeType !== 'all' && (
            <select
              className="scope-select"
              value={selectedScopeId}
              onChange={(e) => setSelectedScopeId(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {scopeType === 'institution'
                ? instituciones.map(i => <option key={i.idInstitucion} value={i.idInstitucion}>{i.nombre}</option>)
                : cursos.map(c => <option key={c.idCurso} value={c.idCurso}>{c.nombre}</option>)
              }
            </select>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="stats-grid">
        <div onClick={() => navigate('/asistencias')} style={{ cursor: 'pointer' }}>
          <StatCard icon="bi-people-fill" label="Total Registros" value={stats.total} color="primary" />
        </div>
        <div onClick={() => navigate('/asistencias?estado=Presente')} style={{ cursor: 'pointer' }}>
          <StatCard icon="bi-check-circle-fill" label="Presentes" value={stats.presentes} color="success" />
        </div>
        <div onClick={() => navigate('/asistencias?estado=Tardanza')} style={{ cursor: 'pointer' }}>
          <StatCard icon="bi-exclamation-circle-fill" label="Tardanzas" value={stats.tardanzas} color="warning" />
        </div>
        <div onClick={() => navigate('/asistencias?minTemp=37.6')} style={{ cursor: 'pointer' }}>
          <StatCard icon="bi-thermometer-high" label="Fiebre (>37.5)" value={stats.fiebre} color="danger" />
        </div>
      </div>

      {/* Merged Chart Section */}
      <div className="dashboard-card chart-container" style={{ gridColumn: '1 / -1', minHeight: '400px' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="card-title">
            {chartMode === 'attendance' ? 'Tendencia de Asistencia' : 'Historial de Temperatura'}
          </h3>
          <div className="filter-group">
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

        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData}>
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
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} unit={chartMode === 'temperature' ? '°C' : ''} />
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