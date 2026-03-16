import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import { apiRequest } from '../config/api';
import { useModalBackButton } from '../hooks/useModalBackButton';
import './PersonaDetails.css';

interface Person {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  departamento: string;
  cargo: string;
  fechaIngreso: string;
  estado: 'activo' | 'inactivo';
  foto?: string;
  roles?: any[];
}

interface PersonaDetailsProps {
  person: Person;
  onClose: () => void;
  onEdit: (person: Person) => void;
}

interface RoleStats {
  roleLabel: string;
  cursoId?: number;
  institucionNombre: string;
  tipoNombre: string;
  cursoNombre?: string;
  total: number;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  justificados: number;
  porcentajeAsistencia: number;
  porcentajeTardanza: number;
  porcentajeAusencia: number;
}

interface GlobalStats {
  total: number;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  justificados: number;
  porcentajeAsistencia: number;
}

type ActiveTab = 'info' | 'stats';

const COLORS = {
  presente: '#10b981',
  tardanza: '#f59e0b',
  ausente: '#ef4444',
};

const PersonaDetails: React.FC<PersonaDetailsProps> = ({ person, onClose, onEdit }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('info');
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [roleStats, setRoleStats] = useState<RoleStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Botón atrás del navegador/sistema cierra el modal (siempre montado cuando visible)
  useModalBackButton(true, onClose);

  const handleEdit = () => {
    onEdit(person);
    onClose();
  };

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      // Fetch global stats for the person
      const globalRes = await apiRequest(`/asistencias/stats/?persona=${person.id}`);
      if (globalRes.ok) {
        const data = await globalRes.json();
        const total = data.total || 0;
        const justificados = data.justificados || 0;
        setGlobalStats({
          total,
          presentes: data.presentes || 0,
          ausentes: data.ausentes || 0,
          tardanzas: data.tardanzas || 0,
          justificados,
          porcentajeAsistencia: total > 0 ? Math.round((((data.presentes || 0) + (data.tardanzas || 0) + justificados) / total) * 100) : 0,
        });
      }

      // Fetch per-role stats
      if (person.roles && person.roles.length > 0) {
        const rolePromises = person.roles.map(async (role: any) => {
          const cursoId = role.curso?.idCurso;
          let url = `/asistencias/stats/?persona=${person.id}`;
          if (cursoId) {
            url += `&horario__curso=${cursoId}`;
          }

          const res = await apiRequest(url);
          if (res.ok) {
            const data = await res.json();
            const total = data.total || 0;
            const justificados = data.justificados || 0;
            return {
              roleLabel: cursoId
                ? `${role.curso?.nombre} — ${role.institucion?.nombre}`
                : `${role.tipo?.nombre} — ${role.institucion?.nombre}`,
              cursoId,
              institucionNombre: role.institucion?.nombre || '',
              tipoNombre: role.tipo?.nombre || '',
              cursoNombre: role.curso?.nombre || undefined,
              total,
              presentes: data.presentes || 0,
              ausentes: data.ausentes || 0,
              tardanzas: data.tardanzas || 0,
              justificados,
              porcentajeAsistencia: total > 0 ? Math.round((((data.presentes || 0) + (data.tardanzas || 0) + justificados) / total) * 100) : 0,
              porcentajeTardanza: total > 0 ? Math.round(((data.tardanzas || 0) / total) * 100) : 0,
              porcentajeAusencia: total > 0 ? Math.round(((data.ausentes || 0) / total) * 100) : 0,
            } as RoleStats;
          }
          return null;
        });

        const results = await Promise.all(rolePromises);
        setRoleStats(results.filter(Boolean) as RoleStats[]);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [person.id, person.roles]);

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
    }
  }, [activeTab, fetchStats]);

  // Donut chart data for global stats
  const donutData = globalStats && globalStats.total > 0
    ? [
        { name: 'Presentes', value: globalStats.presentes },
        { name: 'Tardanzas', value: globalStats.tardanzas },
        { name: 'Ausentes', value: globalStats.ausentes },
      ]
    : [];

  const donutColors = [COLORS.presente, COLORS.tardanza, COLORS.ausente];

  const renderInfoTab = () => (
    <>
      <div className="details-main-section">
        <div className="details-photo-section">
          <div className="details-photo-container">
            {person.foto ? (
              <img src={person.foto} alt={`${person.nombre} ${person.apellido}`} />
            ) : (
              <div className="details-photo-placeholder">
                <span style={{ fontSize: '48px' }}>👤</span>
              </div>
            )}
          </div>
          <span className={`details-status-badge ${person.estado}`}>
            {person.estado === 'activo' ? '✓ Activo' : '✗ Inactivo'}
          </span>
        </div>

        <div className="details-info-section">
          <h3 className="details-name">{person.nombre} {person.apellido}</h3>
          <p className="details-id">ID: {person.id}</p>

          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">📧 Email</span>
              <div className="detail-value">{person.email}</div>
            </div>
            <div className="detail-item">
              <span className="detail-label">📞 Teléfono</span>
              <div className="detail-value">{person.telefono}</div>
            </div>
            <div className="detail-item">
              <span className="detail-label">📅 Fecha de Ingreso</span>
              <div className="detail-value">{person.fechaIngreso}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="details-roles-section">
        <h4 className="roles-section-title">🏢 Roles e Instituciones</h4>
        <div className="roles-list">
          {person.roles && person.roles.length > 0 ? (
            person.roles.map((role, idx) => (
              <div key={idx} className="details-role-item">
                <div className="role-item-main" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="role-institucion">{role.institucion?.nombre}</span>
                    <span className="role-tipo">{role.tipo?.nombre}</span>
                  </div>
                  
                  {role.curso ? (
                    <span className="role-curso-badge" style={{ marginTop: '4px' }}>{role.curso.nombre}</span>
                  ) : (
                    <div className="details-custom-schedules" style={{ width: '100%', marginTop: '4px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Horarios Personalizados:</span>
                      {role.horarios_personalizados && role.horarios_personalizados.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {role.horarios_personalizados.map((h: any, i: number) => (
                            <div key={i} style={{ fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ minWidth: '70px', display: 'inline-block' }}>{h.dia}</span>
                              <span style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', border: '1px solid #334155' }}>{h.hora_inicio.slice(0, 5)} - {h.hora_fin.slice(0, 5)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#ef4444', fontStyle: 'italic' }}>Sin horarios asignados</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <em className="no-roles">Sin roles asignados</em>
          )}
        </div>
      </div>
    </>
  );

  const renderStatsTab = () => (
    <div className="stats-tab-content">
      {loadingStats ? (
        <div className="stats-loading">
          <div className="stats-spinner"></div>
          <span>Cargando estadísticas...</span>
        </div>
      ) : (
        <>
          {/* Global Summary */}
          {globalStats && (
            <div className="stats-global-section">
              <h4 className="stats-section-title">
                <i className="bi bi-bar-chart-fill"></i> Resumen General
              </h4>
              <div className="stats-global-layout">
                {/* Donut Chart */}
                <div className="stats-donut-wrapper">
                  {donutData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {donutData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={donutColors[index]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid rgba(102,126,234,0.3)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '13px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="stats-no-data">
                      <i className="bi bi-inbox"></i>
                      <span>Sin registros</span>
                    </div>
                  )}
                  {/* Center label */}
                  {globalStats.total > 0 && (
                    <div className="donut-center-label">
                      <span className="donut-percentage">{globalStats.porcentajeAsistencia}%</span>
                      <span className="donut-sublabel">Asistencia</span>
                    </div>
                  )}
                </div>

                {/* Mini stat cards */}
                <div className="stats-mini-cards">
                  <div className="mini-stat-card">
                    <div className="mini-stat-icon total">
                      <i className="bi bi-journal-text"></i>
                    </div>
                    <div className="mini-stat-info">
                      <span className="mini-stat-value">{globalStats.total}</span>
                      <span className="mini-stat-label">Registros</span>
                    </div>
                  </div>
                  <div className="mini-stat-card">
                    <div className="mini-stat-icon presente">
                      <i className="bi bi-check-circle-fill"></i>
                    </div>
                    <div className="mini-stat-info">
                      <span className="mini-stat-value">{globalStats.presentes}</span>
                      <span className="mini-stat-label">Presentes</span>
                    </div>
                  </div>
                  <div className="mini-stat-card">
                    <div className="mini-stat-icon tardanza">
                      <i className="bi bi-clock-fill"></i>
                    </div>
                    <div className="mini-stat-info">
                      <span className="mini-stat-value">{globalStats.tardanzas}</span>
                      <span className="mini-stat-label">Tardanzas</span>
                    </div>
                  </div>
                  <div className="mini-stat-card">
                    <div className="mini-stat-icon ausente">
                      <i className="bi bi-x-circle-fill"></i>
                    </div>
                    <div className="mini-stat-info">
                      <span className="mini-stat-value">{globalStats.ausentes}</span>
                      <span className="mini-stat-label">Ausentes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Per-Role Stats */}
          {roleStats.length > 0 && (
            <div className="stats-roles-section">
              <h4 className="stats-section-title">
                <i className="bi bi-people-fill"></i> Detalle por Curso / Empleo
              </h4>
              <div className="stats-roles-list">
                {roleStats.map((rs, idx) => (
                  <div key={idx} className="stats-role-card">
                    <div className="stats-role-header">
                      <span className="stats-role-name">{rs.roleLabel}</span>
                      <span className="stats-role-total">{rs.total} registros</span>
                    </div>

                    {rs.total > 0 ? (
                      <>
                        {/* Percentage bar */}
                        <div className="stats-progress-bar">
                          <div
                            className="stats-progress-segment presente"
                            style={{ width: `${rs.porcentajeAsistencia}%` }}
                            title={`Presente: ${rs.porcentajeAsistencia}%`}
                          ></div>
                          <div
                            className="stats-progress-segment tardanza"
                            style={{ width: `${rs.porcentajeTardanza}%` }}
                            title={`Tardanza: ${rs.porcentajeTardanza}%`}
                          ></div>
                          <div
                            className="stats-progress-segment ausente"
                            style={{ width: `${rs.porcentajeAusencia}%` }}
                            title={`Ausente: ${rs.porcentajeAusencia}%`}
                          ></div>
                        </div>

                        {/* Breakdown numbers */}
                        <div className="stats-role-breakdown">
                          <div className="breakdown-item">
                            <span className="breakdown-dot presente"></span>
                            <span className="breakdown-label">Presente</span>
                            <span className="breakdown-value">{rs.porcentajeAsistencia}%</span>
                          </div>
                          <div className="breakdown-item">
                            <span className="breakdown-dot tardanza"></span>
                            <span className="breakdown-label">Tardanza</span>
                            <span className="breakdown-value">{rs.porcentajeTardanza}%</span>
                          </div>
                          <div className="breakdown-item">
                            <span className="breakdown-dot ausente"></span>
                            <span className="breakdown-label">Ausente</span>
                            <span className="breakdown-value">{rs.porcentajeAusencia}%</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="stats-role-empty">Sin registros de asistencia</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No roles at all */}
          {roleStats.length === 0 && globalStats && globalStats.total === 0 && (
            <div className="stats-empty-state">
              <i className="bi bi-clipboard-data"></i>
              <h4>Sin datos de asistencia</h4>
              <p>Todavía no hay registros de asistencia para esta persona.</p>
            </div>
          )}
        </>
      )}
    </div>
  );

  const modalContent = (
    <div className="persona-details-overlay" onClick={onClose}>
      <div className="persona-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="persona-details-header">
          <h2>Detalles de la Persona</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        {/* Tab Navigation */}
        <div className="persona-details-tabs">
          <button
            className={`details-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <i className="bi bi-person-fill"></i>
            <span>Información</span>
          </button>
          <button
            className={`details-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <i className="bi bi-graph-up"></i>
            <span>Estadísticas</span>
          </button>
        </div>

        <div className="persona-details-content">
          {activeTab === 'info' ? renderInfoTab() : renderStatsTab()}

          <div className="details-actions">
            <button className="btn-edit-details" onClick={handleEdit}>
              ✏️ Editar Información
            </button>
            <button className="btn-close-details" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default PersonaDetails;