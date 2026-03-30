import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './AuditLog.css';

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

const formatValue = (val: string) => {
  if (!val) return val;
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

const ChangeDiff: React.FC<{ changes: Change[] | null; action_raw: string }> = ({ changes, action_raw }) => {
  if (action_raw === '+' || action_raw === '-') return null;
  if (!changes || changes.length === 0) {
    return (
      <div style={{ color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>
        Actualización interna (sin cambios de datos visibles)
      </div>
    );
  }
  return (
    <div className="audit-diff">
      {changes.map((c, i) => (
        <div key={i} className="audit-diff-row">
          <span className="audit-diff-field">{c.field}</span>
          {c.old && <span className="audit-diff-old" title={c.old}>{formatValue(c.old)}</span>}
          {c.old && c.new && <i className="bi bi-arrow-right audit-diff-arrow" />}
          {c.new && <span className="audit-diff-new" title={c.new}>{formatValue(c.new)}</span>}
        </div>
      ))}
    </div>
  );
};

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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const hasActiveFilters = filterModel || filterAction || filterUser || dateFrom || dateTo || search;

  return (
    <div className="audit-page">
      {/* Header */}
      <div className="audit-header">
        <div>
          <h1 className="audit-title">
            <i className="bi bi-clock-history me-2" style={{ color: '#818cf8' }} />
            Historial de Actividad
          </h1>
          <p className="audit-subtitle">
            Registro cronológico de eventos y cambios en el sistema
            {data && (
              <span className="audit-badge">{data.count} eventos</span>
            )}
          </p>
        </div>
        <button className="audit-btn-refresh" onClick={fetchLogs}>
          <i className="bi bi-arrow-clockwise me-1" /> Actualizar
        </button>
      </div>

      {/* Layout */}
      <div className="audit-layout">

        {/* ── Filtros ── */}
        <div className="audit-filters-panel">

          {/* Botón toggle solo en mobile */}
          <button
            className="audit-mobile-filter-toggle"
            onClick={() => setFiltersOpen(v => !v)}
            type="button"
          >
            <span>
              <i className="bi bi-funnel me-2" />
              Filtros de búsqueda
              {hasActiveFilters && (
                <span className="audit-badge ms-2" style={{ marginLeft: 8 }}>Activos</span>
              )}
            </span>
            <i className={`bi bi-chevron-${filtersOpen ? 'up' : 'down'}`} />
          </button>

          <div className={`audit-mobile-panel${filtersOpen ? '' : ' collapsed'}`}>
            <form onSubmit={handleFilter} className="audit-filters-card">
              <div className="audit-filters-title">
                <i className="bi bi-funnel" />
                Filtros de Búsqueda
              </div>

              <div className="audit-filter-group">
                {/* Búsqueda rápida */}
                <div>
                  <label className="audit-filter-label">Búsqueda rápida</label>
                  <div className="audit-search-wrapper">
                    <i className="bi bi-search audit-search-icon" />
                    <input
                      type="text"
                      className="audit-search-input"
                      placeholder="Buscar..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Módulo */}
                <div>
                  <label className="audit-filter-label">Módulo / Modelo</label>
                  <select
                    className="audit-select"
                    value={filterModel}
                    onChange={e => setFilterModel(e.target.value)}
                  >
                    <option value="">Todos los módulos</option>
                    {data?.models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Tipo de acción */}
                <div>
                  <label className="audit-filter-label">Tipo de acción</label>
                  <select
                    className="audit-select"
                    value={filterAction}
                    onChange={e => setFilterAction(e.target.value)}
                  >
                    <option value="">Cualquier acción</option>
                    <option value="+">Creación</option>
                    <option value="~">Modificación</option>
                    <option value="-">Eliminación</option>
                  </select>
                </div>

                {/* Usuario */}
                <div>
                  <label className="audit-filter-label">Usuario responsable</label>
                  <input
                    type="text"
                    className="audit-text-input"
                    placeholder="Ej. javinnieto"
                    value={filterUser}
                    onChange={e => setFilterUser(e.target.value)}
                  />
                </div>

                {/* Fechas */}
                <div>
                  <label className="audit-filter-label">Rango de fechas</label>
                  <div className="audit-dates-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: '40px' }}>Desde:</span>
                      <input
                        type="date"
                        lang="es-AR"
                        className="audit-select"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        title="Desde"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', height: '32px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: '40px' }}>Hasta:</span>
                      <input
                        type="date"
                        lang="es-AR"
                        className="audit-select"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        title="Hasta"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', height: '32px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="audit-filter-actions">
                  <button type="submit" className="audit-btn-apply">
                    Aplicar filtros
                  </button>
                  <button type="button" className="audit-btn-clear" onClick={clearFilters} title="Limpiar todo">
                    <i className="bi bi-trash3" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* ── Feed Timeline ── */}
        <div className="audit-feed">
          {loading ? (
            <div className="audit-loading">
              <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem', opacity: 0.5 }} />
              <p className="mt-3 mb-0" style={{ fontSize: '0.9rem' }}>Recopilando historial…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="audit-empty">
              <i className="bi bi-wind audit-empty-icon" />
              <h5>No hay actividad aquí</h5>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Intentá ajustar los filtros de búsqueda.</p>
            </div>
          ) : (
            <>
              <div className="audit-timeline">
                <div className="audit-timeline-line" />
                {filtered.map((entry) => {
                  const actionColor = ACTION_COLOR[entry.action_raw] || '#94a3b8';
                  const actionText = ACTION_TEXT[entry.action_raw] || 'interactuó con';
                  return (
                    <div key={entry.id} className="audit-entry">
                      <div
                        className="audit-dot"
                        style={{ background: actionColor, boxShadow: `0 0 0 2px ${actionColor}30` }}
                      />
                      <div className="audit-card">
                        <div className="audit-card-header">
                          <div className="audit-card-who">
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
                            <span style={{ color: actionColor, fontWeight: 500 }}>{actionText}</span>
                            {' el registro de '}
                            <span style={{
                              color: '#cbd5e1', fontWeight: 500, background: '#0f172a',
                              padding: '2px 8px', borderRadius: 6, fontSize: '0.8rem',
                              display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap'
                            }}>
                              <i className={`bi ${MODEL_ICON[entry.model] || 'bi-box'} me-1`} style={{ color: '#818cf8' }} />
                              {entry.model}
                            </span>
                          </div>
                          <span className="audit-card-time">
                            <i className="bi bi-clock" />
                            {formatDate(entry.date)}
                          </span>
                        </div>

                        <div className="audit-card-repr">{entry.object_repr}</div>
                        <ChangeDiff changes={entry.changes} action_raw={entry.action_raw} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginación */}
              {data && data.pages > 1 && (
                <div className="audit-pagination">
                  <span className="audit-pagination-info">
                    Página <strong style={{ color: 'white' }}>{data.page}</strong> de {data.pages}
                    <span style={{ marginLeft: 12, color: '#475569' }}>({data.count} eventos totales)</span>
                  </span>
                  <div className="audit-pagination-btns">
                    <button
                      className="audit-btn-page"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <i className="bi bi-chevron-left me-1" /> Anterior
                    </button>
                    <button
                      className="audit-btn-page"
                      disabled={page >= (data?.pages || 1)}
                      onClick={() => setPage(p => p + 1)}
                    >
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
