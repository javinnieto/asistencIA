import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8001/api').replace(/\/api$/, '');

interface Change { field: string; old: string; new: string; }

interface AuditEntry {
  id: number;
  model: string;
  object_id: string;
  object_repr: string;
  action: string;
  action_raw: string;
  user: string | null;
  date: string;
  changes: Change[] | null;
}

interface AuditResponse {
  count: number; page: number; pages: number;
  results: AuditEntry[]; models: string[];
}

const ACTION_COLOR: Record<string, string> = { '+': '#22c55e', '~': '#f59e0b', '-': '#ef4444' };
const ACTION_TEXT:  Record<string, string> = { '+': 'creó', '~': 'modificó', '-': 'eliminó' };
const MODEL_ICON:   Record<string, string> = {
  Persona: 'bi-person-badge', Asistencia: 'bi-calendar-check', Curso: 'bi-book',
  Institucion: 'bi-building', TipoPersona: 'bi-tag', Horario: 'bi-clock',
  PersonaInstitucion: 'bi-diagram-3', EstadoAsistencia: 'bi-patch-check', DiaNoLaborable: 'bi-calendar-x',
};

const PAGE_SIZE = 25;

// Helper to format raw database date strings (like "2026-03-10 16:17:01+00:00") into local time
const formatValue = (val: string) => {
  if (!val) return val;
  // Regex matches ISO dates with or without T, with or without timezone
  if (/^\d{4}-\d{2}-\d{2}( [T]?\d{2}:\d{2}:\d{2}(\.\d+)?([\+\-]\d{2}:\d{2}|Z))?$/.test(val)) {
    const normalized = val.replace(' ', 'T');
    const d = new Date(normalized);
    if (!isNaN(d.getTime())) {
      if (normalized.includes('T')) {
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
          + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      } else {
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    }
  }
  return val;
};

// ── Sub-component: field-level diff ──────────────────────────────────────────
const ChangeDiff: React.FC<{ changes: Change[] | null; action_raw: string }> = ({ changes, action_raw }) => {
  if (action_raw === '+') {
    return null; // Not showing generic text, the header already says "creó"
  }
  if (action_raw === '-') {
    return null; // The header already says "eliminó"
  }
  if (!changes || changes.length === 0) {
    return <div style={{ color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>Actualización interna (sin cambios de datos visibles)</div>;
  }
  return (
    <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {changes.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.75rem', background: '#1e293b', color: '#94a3b8',
              padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', fontWeight: 600
            }}>
              {c.field}
            </span>
            {c.old && (
              <span style={{ color: '#ef4444', fontSize: '0.8rem', textDecoration: 'line-through' }} title={c.old}>
                {formatValue(c.old)}
              </span>
            )}
            {c.old && c.new && (
              <i className="bi bi-arrow-right" style={{ color: '#475569', fontSize: '0.7rem' }} />
            )}
            {c.new && (
              <span style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 500 }} title={c.new}>
                {formatValue(c.new)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AuditLog: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterModel, setFilterModel] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
      if (filterModel)  params.model     = filterModel;
      if (filterAction) params.action    = filterAction;
      if (filterUser)   params.user      = filterUser;
      if (dateFrom)     params.date_from = dateFrom;
      if (dateTo)       params.date_to   = dateTo;
      const res = await axios.get(`${API_BASE}/api/audit-log/`, {
        headers: { Authorization: `Bearer ${token}` }, params,
      });
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, page, filterModel, filterAction, filterUser, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleFilter = (e: React.FormEvent) => { e.preventDefault(); setPage(1); };
  const clearFilters = () => {
    setFilterModel(''); setFilterAction(''); setFilterUser('');
    setDateFrom(''); setDateTo(''); setSearch(''); setPage(1);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const filtered = (data?.results || []).filter(r =>
    search === '' ||
    r.object_repr.toLowerCase().includes(search.toLowerCase()) ||
    (r.user || '').toLowerCase().includes(search.toLowerCase()) ||
    r.model.toLowerCase().includes(search.toLowerCase())
  );

  // ── Styles (all dark) ─────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: '#1e293b', borderRadius: 12, border: '1px solid #334155',
  };
  const inputStyle: React.CSSProperties = {
    background: '#0f172a', color: 'white', border: '1px solid #334155',
    colorScheme: 'dark' as any,
  };
  const labelStyle: React.CSSProperties = {
    color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 4,
  };

  return (
    <div className="container-fluid mt-4" style={{ paddingBottom: 48 }}>
      {/* Header */}
      <div className="d-flex align-items-start justify-content-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="mb-0" style={{ color: 'white', fontWeight: 700, fontSize: '1.55rem' }}>
            <i className="bi bi-clock-history me-2" style={{ color: '#818cf8' }} />
            Historial de Actividad
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '0.85rem' }}>
            Registro cronológico de los eventos y cambios en el sistema
            {data && <span className="ms-3 badge" style={{ background: '#312e81', color: '#a5b4fc', fontWeight: 500 }}>{data.count} eventos</span>}
          </p>
        </div>
        <button className="btn btn-sm" style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', height: 'fit-content' }} onClick={fetchLogs}>
          <i className="bi bi-arrow-clockwise me-1" />Actualizar
        </button>
      </div>

      <div className="row">
        {/* Left Side: Filters (Sticky on desktop) */}
        <div className="col-lg-3 mb-4">
          <form onSubmit={handleFilter} style={{ position: 'sticky', top: 20 }}>
            <div style={{ ...cardStyle, padding: '20px' }}>
              <h6 style={{ color: 'white', marginBottom: 16, fontSize: '0.9rem', fontWeight: 600 }}>Filtros de Búsqueda</h6>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Búsqueda rápida</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text" style={{ background: '#0f172a', border: '1px solid #334155', borderRight: 'none', color: '#64748b' }}><i className="bi bi-search"></i></span>
                    <input type="text" className="form-control" style={{ ...inputStyle, borderLeft: 'none', paddingLeft: 0 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Módulo / Modelo</label>
                  <select className="form-select form-select-sm" style={inputStyle} value={filterModel} onChange={e => setFilterModel(e.target.value)}>
                    <option value="">Todos los módulos</option>
                    {data?.models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Tipo de acción</label>
                  <select className="form-select form-select-sm" style={inputStyle} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
                    <option value="">Cualquier acción</option>
                    <option value="+">Creación</option>
                    <option value="~">Modificación</option>
                    <option value="-">Eliminación</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Usuario responsable</label>
                  <input type="text" className="form-control form-control-sm" style={inputStyle} placeholder="Ej. javinnieto" value={filterUser} onChange={e => setFilterUser(e.target.value)} />
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <label style={labelStyle}>Desde</label>
                    <input type="date" className="form-control form-control-sm" style={inputStyle} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label style={labelStyle}>Hasta</label>
                    <input type="date" className="form-control form-control-sm" style={inputStyle} value={dateTo} onChange={e => setDateTo(e.target.value)} />
                  </div>
                </div>
                
                <div className="d-flex gap-2 mt-2">
                  <button type="submit" className="btn btn-primary btn-sm flex-grow-1" style={{ fontWeight: 500 }}>
                    Aplicar filtros
                  </button>
                  <button type="button" className="btn btn-sm" style={{ background: '#0f172a', color: '#64748b', border: '1px solid #334155' }} onClick={clearFilters} title="Limpiar todo">
                    <i className="bi bi-trash3" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right Side: Timeline Feed */}
        <div className="col-lg-9">
          {loading ? (
            <div className="text-center py-5" style={{ color: '#475569' }}>
              <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem', opacity: 0.5 }}></div>
              <p className="mt-3 mb-0" style={{ fontSize: '0.9rem' }}>Recopilando historial tecnológico…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5" style={{ ...cardStyle }}>
              <i className="bi bi-wind" style={{ fontSize: '3rem', color: '#334155' }} />
              <h5 className="mt-3 mb-1" style={{ color: '#94a3b8' }}>No hay actividad aquí</h5>
              <p style={{ color: '#475569', fontSize: '0.9rem' }}>Intenta ajustar tus filtros de búsqueda.</p>
            </div>
          ) : (
            <>
              {/* Timeline Container */}
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                {/* Vertical Line */}
                <div style={{ position: 'absolute', left: 8, top: 16, bottom: 0, width: 2, background: '#334155', borderRadius: 2 }}></div>

                {filtered.map((entry) => {
                  const actionColor = ACTION_COLOR[entry.action_raw] || '#94a3b8';
                  const actionText = ACTION_TEXT[entry.action_raw] || 'interactuó con';
                  
                  return (
                    <div key={entry.id} style={{ position: 'relative', marginBottom: 24 }}>
                      
                      {/* Timeline Dot */}
                      <div style={{ 
                        position: 'absolute', left: -24, top: 16, width: 16, height: 16, 
                        borderRadius: '50%', background: actionColor, border: '3px solid #0f172a',
                        boxShadow: `0 0 0 2px ${actionColor}20`
                      }}></div>

                      {/* Timeline Card */}
                      <div style={{ 
                        background: '#1e293b', borderRadius: 12, padding: 20, 
                        border: '1px solid #334155', transition: 'transform 0.2s',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}>
                        
                        {/* Feed Header */}
                        <div className="d-flex justify-content-between align-items-start mb-2" style={{ flexWrap: 'wrap', gap: 10 }}>
                          <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                            {entry.user ? (
                              <span style={{ color: 'white', fontWeight: 600 }}>
                                <i className="bi bi-person-circle me-1" style={{ color: '#818cf8', opacity: 0.8 }} />
                                {entry.user}
                              </span>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                                <i className="bi bi-cpu me-1" style={{ color: '#94a3b8' }} />
                                Sistema Automático
                              </span>
                            )}
                            {' '}
                            <span style={{ color: actionColor, fontWeight: 500 }}>{actionText}</span> el registro de {' '}
                            <span style={{ color: '#cbd5e1', fontWeight: 500, background: '#0f172a', padding: '2px 8px', borderRadius: 6, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                              <i className={`bi ${MODEL_ICON[entry.model] || 'bi-box'} me-1`} style={{ color: '#818cf8' }} />
                              {entry.model}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="bi bi-clock"></i>
                            {formatDate(entry.date)}
                          </span>
                        </div>

                        {/* Record Targeted */}
                        <h5 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600, marginTop: 8, marginBottom: entry.changes?.length ? 16 : 0 }}>
                          {entry.object_repr}
                        </h5>

                        {/* Detailed Changes */}
                        <ChangeDiff changes={entry.changes} action_raw={entry.action_raw} />
                        
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {data && data.pages > 1 && (
                <div className="d-flex align-items-center justify-content-between mt-4" style={{ ...cardStyle, padding: '12px 20px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Página <strong style={{ color: 'white' }}>{data.page}</strong> de {data.pages}
                  </span>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm" style={{ background: '#0f172a', color: 'white', border: '1px solid #334155' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <i className="bi bi-chevron-left me-1" /> Anterior
                    </button>
                    <button className="btn btn-sm" style={{ background: '#0f172a', color: 'white', border: '1px solid #334155' }} disabled={page >= (data?.pages || 1)} onClick={() => setPage(p => p + 1)}>
                      Siguiente <i className="bi bi-chevron-right ms-1" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
