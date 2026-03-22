import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import { apiRequest } from '../config/api';
import { useModalBackButton } from '../hooks/useModalBackButton';
import TablePagination from './TablePagination';
import ExportButton from './ExportButton';
import { useAuth } from '../context/AuthContext';
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
  const { rol, cursosProfesor, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('info');
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [roleStats, setRoleStats] = useState<RoleStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<number[]>([]);

  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Pagination for Records
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

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
          const roleId = role.idPersonaInstitucion;
          const instId = role.institucion?.idInstitucion;

          let url = `/asistencias/stats/?persona=${person.id}`;
          if (cursoId) {
            url += `&horario__curso=${cursoId}`;
          } else if (roleId) {
            url += `&horario__persona_institucion=${roleId}`;
          }

          if (instId) {
            url += `&institucion=${instId}`;
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

  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const res = await apiRequest(`/asistencias/?persona=${person.id}&page=${currentPage}&page_size=${itemsPerPage}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.results || data || []);
        if (data.count !== undefined) {
           setTotalRecords(data.count);
        } else {
           setTotalRecords(data.length || 0);
        }
      }
    } catch (e) {
      console.error('Error fetching records:', e);
    } finally {
      setLoadingRecords(false);
    }
  }, [person.id, currentPage, itemsPerPage]);

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchRecords();
    }
  }, [activeTab, fetchRecords]);

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
            person.roles.map((role, idx) => {
              const isExpanded = expandedRoles.includes(idx);
              const horarios = role.curso ? role.curso.horarios : role.horarios_personalizados;
              const hasHorarios = horarios && horarios.length > 0;

              return (
                <div key={idx} className="details-role-item" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <div className="role-item-main" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="role-institucion">{role.institucion?.nombre}</span>
                        <span className="role-tipo">{role.tipo?.nombre}</span>
                        {role.curso && <span className="role-curso-badge">{role.curso.nombre}</span>}
                      </div>
                      {hasHorarios && (
                        <button 
                          className="btn-toggle-horarios" 
                          onClick={() => setExpandedRoles(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])}
                          style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '1.2rem', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                        >
                          <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                        </button>
                      )}
                    </div>
                    
                    {isExpanded && hasHorarios && (
                      <div className="details-custom-schedules" style={{ width: '100%', marginTop: '8px', padding: '10px', background: 'rgba(99,102,241,0.05)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.1)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#818cf8', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <i className="bi bi-clock-history"></i> {role.curso ? 'Horarios del Curso' : 'Horarios Personalizados'}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {horarios.map((h: any, i: number) => (
                            <div key={i} style={{ fontSize: '0.85rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                              <span style={{ minWidth: '85px', display: 'inline-block', fontWeight: 600 }}>{h.dia}</span>
                              <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', fontVariantNumeric: 'tabular-nums', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {h.hora_inicio.slice(0, 5)} - {h.hora_fin.slice(0, 5)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!hasHorarios && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>Sin horarios asignados</span>
                    )}
                  </div>
                </div>
              );
            })
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

          {/* Historial de Asistencias (Merged) */}
          <div className="stats-roles-section" style={{ marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 className="stats-section-title" style={{ margin: 0 }}>
                <i className="bi bi-list-check"></i> Historial de Asistencias
              </h4>
              {totalRecords > 0 && (
                <ExportButton 
                  onFetchData={async () => {
                    const res = await apiRequest(`/asistencias/?persona=${person.id}&page_size=10000`);
                    if (res.ok) {
                       const data = await res.json();
                       const allRecords = data.results || data || [];
                       // Filtrar para incluir solo Presente, Ausente y Tardanza
                       return allRecords.filter((r: any) => 
                         ['Presente', 'Ausente', 'Tardanza'].includes(r.estado?.nombre)
                       );
                    }
                    return [];
                  }}
                  summaryData={globalStats ? [{
                    'Presentes': globalStats.presentes,
                    'Ausentes': globalStats.ausentes,
                    'Tardanzas': globalStats.tardanzas,
                    'Veces que debió venir': globalStats.total,
                    'Porcentaje Asistencia': `${globalStats.porcentajeAsistencia}%`
                  }] : []}
                  filename={`asistencias_${person.nombre}_${person.apellido}`.replace(/\s+/g, '_').toLowerCase()}
                />
              )}
            </div>

            {loadingRecords ? (
                <div className="stats-loading" style={{ margin: '20px 0' }}>
                  <div className="stats-spinner"></div>
                  <span>Cargando registros...</span>
                </div>
            ) : records.length > 0 ? (
              <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.2)', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>FECHA/HORA</th>
                      <th style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>CURSO / ROL</th>
                      <th style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>ESTADO</th>
                      <th style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>TEMP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' }}>
                        <td style={{ padding: '10px 14px' }}>{formatDateTime(r.fechaHora)}</td>
                        <td style={{ padding: '10px 14px', color: '#818cf8' }}>{r.horario?.curso?.nombre || 'General'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ 
                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                            background: r.estado.nombre === 'Presente' ? 'rgba(16,185,129,0.15)' : 
                                        r.estado.nombre === 'Ausente' ? 'rgba(239,68,68,0.15)' :
                                        r.estado.nombre === 'Tardanza' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.1)',
                            color: r.estado.nombre === 'Presente' ? '#34d399' : 
                                   r.estado.nombre === 'Ausente' ? '#f87171' :
                                   r.estado.nombre === 'Tardanza' ? '#fbbf24' : '#e2e8f0',
                          }}>
                            {r.estado.nombre}
                            {r.justificado && '✓'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {r.temperatura > 0 ? `${r.temperatura}°C` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
                <div className="stats-empty-state" style={{ margin: '20px 0' }}>
                  <i className="bi bi-inbox"></i>
                  <p>Esta persona no tiene registros de asistencia en el sistema.</p>
                </div>
            )}
            {!loadingRecords && totalRecords > itemsPerPage && (
              <div style={{ marginTop: '16px' }}>
                <TablePagination
                  currentPage={currentPage}
                  totalPages={Math.max(1, Math.ceil(totalRecords / itemsPerPage))}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={(newCount) => {
                    setItemsPerPage(newCount);
                    setCurrentPage(1);
                  }}
                  totalItems={totalRecords}
                />
              </div>
            )}
          </div>

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

  const formatDateTime = (isoString: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  };



  const modalContent = (
    <div 
      className="persona-details-overlay" 
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="persona-details-modal" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
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
          {activeTab === 'info' && renderInfoTab()}
          {activeTab === 'stats' && renderStatsTab()}


          <div className="details-actions">
            {(isAdmin || rol === 'guardia' || (rol === 'profesor' && person.roles?.some((r: any) => cursosProfesor.includes(r.curso?.idCurso)))) && (
              <button className="btn-edit-details" onClick={handleEdit}>
                ✏️ Editar Información
              </button>
            )}
            <button className="btn-close-details" onClick={onClose}>Cerrar</button>
          </div>

        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default PersonaDetails;