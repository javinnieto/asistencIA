import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { apiRequest } from '../../config/api';
import { useToast } from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';
import { getLocalDateString } from '../../utils/dateUtils';
import { useModalBackButton } from '../../hooks/useModalBackButton';
import './CursosHorarios.css';

interface Institucion {
    idInstitucion: number;
    nombre: string;
}

interface Curso {
    idCurso: number;
    nombre: string;
    institucion: Institucion;
}

interface TipoPersona {
    idTipoPersona: number;
    nombre: string;
    institucion: Institucion;
}

interface PersonaSimple {
    idPersona: number;
    nombre: string;
}

interface DiaNoLaborable {
    idDia?: number;
    fecha_inicio: string;
    fecha_fin?: string;
    motivo: string;
    institucion: number | Institucion;
    aplica_a_todos: boolean;
    cursos_afectados?: (number | Curso)[];
    tipos_persona_afectados?: (number | TipoPersona)[];
    personas_afectadas?: (number | PersonaSimple)[];
}

// ─── Reusable checkbox list panel ───
const CheckboxPanel: React.FC<{
    title: string;
    icon: string;
    items: { id: number; label: string }[];
    selected: number[];
    onChange: (ids: number[]) => void;
    searchable?: boolean;
}> = ({ title, icon, items, selected, onChange, searchable = false }) => {
    const [search, setSearch] = useState('');
    const [collapsed, setCollapsed] = useState(false);

    const filtered = searchable && search
        ? items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
        : items;

    const toggle = (id: number) => {
        onChange(
            selected.includes(id)
                ? selected.filter(s => s !== id)
                : [...selected, id]
        );
    };

    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '16px'
        }}>
            {/* Header */}
            <div
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', cursor: 'pointer',
                    background: 'rgba(30, 41, 59, 0.8)',
                    borderBottom: collapsed ? 'none' : '1px solid rgba(102, 126, 234, 0.2)'
                }}
            >
                <span style={{ color: '#a5b4fc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className={`bi bi-${icon}`}></i> {title}
                    {selected.length > 0 && (
                        <span style={{
                            background: '#3b82f6', color: '#fff', borderRadius: '12px',
                            padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700
                        }}>{selected.length}</span>
                    )}
                </span>
                <i className={`bi bi-chevron-${collapsed ? 'down' : 'up'}`} style={{ color: '#64748b' }}></i>
            </div>

            {/* Body */}
            {!collapsed && (
                <div style={{ padding: '12px 16px' }}>
                    {searchable && (
                        <div style={{ position: 'relative', marginBottom: '12px' }}>
                            <i className="bi bi-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.85rem' }}></i>
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="ch-input"
                                style={{ paddingLeft: '32px', padding: '8px 8px 8px 32px', fontSize: '0.85rem' }}
                            />
                        </div>
                    )}
                    {filtered.length === 0 ? (
                        <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', padding: '8px 0' }}>
                            {search ? 'Sin resultados' : 'No hay opciones disponibles'}
                        </div>
                    ) : (
                        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {filtered.map(item => (
                                <label
                                    key={item.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                                        background: selected.includes(item.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                        border: `1px solid ${selected.includes(item.id) ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(item.id)}
                                        onChange={() => toggle(item.id)}
                                        style={{ accentColor: '#3b82f6', width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


const DiasNoLaborablesTab: React.FC = () => {
    const { showToast } = useToast();
    const [dias, setDias] = useState<DiaNoLaborable[]>([]);
    const [instituciones, setInstituciones] = useState<Institucion[]>([]);
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [tiposPersona, setTiposPersona] = useState<TipoPersona[]>([]);
    const [personas, setPersonas] = useState<PersonaSimple[]>([]);

    const [loading, setLoading] = useState(false);
    const [selectedInstId, setSelectedInstId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<DiaNoLaborable>({
        fecha_inicio: getLocalDateString(),
        fecha_fin: '',
        motivo: '',
        institucion: '',
        aplica_a_todos: true,
        cursos_afectados: [],
        tipos_persona_afectados: [],
        personas_afectadas: []
    } as any);

    // Delete modal
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Botón atrás: cierra el modal de nuevo/editar día no laborable
    useModalBackButton(isModalOpen, () => setIsModalOpen(false));

    // Fetch instituciones on mount
    useEffect(() => {
        apiRequest('/instituciones/').then(async res => {
            if (res.ok) setInstituciones((await res.json()).results || []);
        });
    }, []);

    const fetchDias = useCallback(async () => {
        setLoading(true);
        try {
            let url = '/dias-no-laborables/';
            if (selectedInstId) url += `?institucion=${selectedInstId}`;
            const res = await apiRequest(url);
            if (res.ok) {
                const data = await res.json();
                setDias(data.results || data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [selectedInstId]);

    // Fetch cursos, tipos, personas
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [cursosRes, tiposRes, personasRes] = await Promise.all([
                    apiRequest('/cursos/'),
                    apiRequest('/tipos-persona/'),
                    apiRequest('/personas/')
                ]);
                if (cursosRes.ok) setCursos((await cursosRes.json()).results || []);
                if (tiposRes.ok) setTiposPersona((await tiposRes.json()).results || []);
                if (personasRes.ok) {
                    const pData = await personasRes.json();
                    const pList = pData.results || pData || [];
                    setPersonas(pList.map((p: any) => ({ idPersona: p.idPersona, nombre: p.nombre })));
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchOptions();
    }, []);

    useEffect(() => { fetchDias(); }, [fetchDias]);

    const openModal = (dia?: DiaNoLaborable) => {
        if (dia) {
            setFormData({
                ...dia,
                institucion: typeof dia.institucion === 'object' ? dia.institucion.idInstitucion : dia.institucion,
                cursos_afectados: (dia.cursos_afectados || []).map((c: any) => typeof c === 'object' ? c.idCurso : c),
                tipos_persona_afectados: (dia.tipos_persona_afectados || []).map((t: any) => typeof t === 'object' ? t.idTipoPersona : t),
                personas_afectadas: (dia.personas_afectadas || []).map((p: any) => typeof p === 'object' ? p.idPersona : p)
            });
        } else {
            setFormData({
                fecha_inicio: getLocalDateString(),
                fecha_fin: '',
                motivo: '',
                institucion: selectedInstId ? parseInt(selectedInstId) : (instituciones[0]?.idInstitucion || ''),
                aplica_a_todos: true,
                cursos_afectados: [],
                tipos_persona_afectados: [],
                personas_afectadas: []
            } as any);
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isEditing = !!formData.idDia;
            const url = isEditing ? `/dias-no-laborables/${formData.idDia}/` : '/dias-no-laborables/';
            const method = isEditing ? 'PUT' : 'POST';

            const payload = { ...formData, fecha_fin: formData.fecha_fin || null };
            const res = await apiRequest(url, {
                method,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast(`Día no laborable ${isEditing ? 'actualizado' : 'creado'} exitosamente`, 'success');
                setIsModalOpen(false);
                fetchDias();
            } else {
                const err = await res.json();
                showToast('Error: ' + (err.detail || JSON.stringify(err)), 'error');
            }
        } catch (error) {
            console.error('Error saving dia no laborable:', error);
            showToast('Error de conexión', 'error');
        }
    };

    const promptDelete = (id: number) => {
        setItemToDelete(id);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setDeleting(true);
        try {
            const res = await apiRequest(`/dias-no-laborables/${itemToDelete}/`, { method: 'DELETE' });
            if (res.ok || res.status === 204) {
                showToast('Día eliminado correctamente', 'success');
                setDias(prev => prev.filter(d => d.idDia !== itemToDelete));
                fetchDias();
            } else {
                showToast('Error al eliminar', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error de conexión', 'error');
        } finally {
            setDeleting(false);
            setConfirmOpen(false);
            setItemToDelete(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    // Filter cursos/tipos by selected institucion in modal
    const modalInstId = typeof formData.institucion === 'number' ? formData.institucion : parseInt(String(formData.institucion));
    const filteredCursos = cursos.filter(c =>
        (typeof c.institucion === 'object' ? c.institucion.idInstitucion : (c as any).institucion) === modalInstId
    );
    const filteredTipos = tiposPersona.filter(t =>
        (typeof t.institucion === 'object' ? t.institucion.idInstitucion : (t as any).institucion) === modalInstId
    );

    const filteredDias = dias.filter(d =>
        d.motivo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Build scope summary for table
    const getScopeSummary = (dia: DiaNoLaborable) => {
        if (dia.aplica_a_todos) return <span className="ch-badge bg-success text-white">General</span>;

        const parts: React.ReactNode[] = [];
        if (dia.cursos_afectados && dia.cursos_afectados.length > 0) {
            parts.push(
                <div key="cursos" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    <i className="bi bi-book me-1"></i>
                    {dia.cursos_afectados.map((c: any) => c.nombre || c).join(', ')}
                </div>
            );
        }
        if (dia.tipos_persona_afectados && dia.tipos_persona_afectados.length > 0) {
            parts.push(
                <div key="roles" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    <i className="bi bi-people me-1"></i>
                    {dia.tipos_persona_afectados.map((t: any) => t.nombre || t).join(', ')}
                </div>
            );
        }
        if (dia.personas_afectadas && dia.personas_afectadas.length > 0) {
            parts.push(
                <div key="personas" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    <i className="bi bi-person me-1"></i>
                    {dia.personas_afectadas.map((p: any) => p.nombre || p).join(', ')}
                </div>
            );
        }
        if (parts.length === 0) return <span className="ch-badge inactive">SIN ASIGNAR</span>;
        return <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>{parts}</div>;
    };

    return (
        <div className="ch-tab-wrapper">
            {/* Header - matches CursosTab pattern */}
            <div className={`ch-header-controls column-layout`}>
                <div className="ch-controls-row right" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 700 }}>
                            Días No Laborables
                        </h1>
                        <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                            Feriados, jornadas y excepciones
                        </p>
                    </div>
                    <button onClick={() => openModal()} className="btn-primary-action btn-fab-mobile">
                        <i className="bi bi-plus-lg"></i> <span className="hide-on-mobile-fab">Nuevo Día</span>
                    </button>
                </div>

                <div className="ch-controls-row nowrap">
                    <div className="search-container" style={{ flex: '1' }}>
                        <i className="bi bi-search search-icon-pos"></i>
                        <input
                            type="text"
                            placeholder="Buscar por motivo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input-styled"
                        />
                    </div>

                    <select
                        className="ch-select"
                        style={{ minWidth: '180px', maxWidth: '300px', cursor: 'pointer', flexShrink: 0 }}
                        value={selectedInstId}
                        onChange={e => setSelectedInstId(e.target.value)}
                    >
                        <option value="">Todas las Instituciones</option>
                        {instituciones.map(i => <option key={i.idInstitucion} value={i.idInstitucion}>{i.nombre}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="ch-table-responsive">
                <table className="ch-table">
                    <thead className="ch-thead">
                        <tr>
                            {['FECHA', 'MOTIVO', 'INSTITUCIÓN', 'ALCANCE', 'ACCIONES'].map((h, i) => (
                                <th key={i} className="ch-th">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDias.map(dia => (
                            <tr key={dia.idDia} className="ch-tr clickable" style={{ cursor: 'default' }}>
                                {/* Mobile Title Area */}
                                <td className="ch-td bold ch-mobile-title" data-label="Fecha">
                                    <div className="d-flex justify-content-between align-items-start w-100">
                                        <div className="text-wrap me-2">
                                            {dia.motivo}
                                        </div>
                                        <div className="hide-on-desktop d-flex flex-column align-items-end flex-shrink-0">
                                            {getScopeSummary(dia)}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '4px', fontWeight: 'normal' }}>
                                        <i className="bi bi-calendar-event me-2"></i>
                                        {formatDate(dia.fecha_inicio)}
                                        {dia.fecha_fin && dia.fecha_fin !== dia.fecha_inicio && (
                                            <span> → {formatDate(dia.fecha_fin)}</span>
                                        )}
                                    </div>
                                </td>

                                {/* Desktop Columns that combine motive and date */}
                                <td className="ch-td bold hide-on-mobile" data-label="Motivo">{dia.motivo}</td>

                                <td className="ch-td dimmed ch-mobile-institucion" data-label="Institución">
                                    <i className="bi bi-building me-2 hide-on-desktop"></i>
                                    {typeof dia.institucion === 'object' ? dia.institucion.nombre : ''}
                                </td>

                                <td className="ch-td hide-on-mobile" data-label="Alcance">{getScopeSummary(dia)}</td>
                                <td className="ch-td ch-mobile-actions">
                                    <div className="action-buttons d-flex gap-2">
                                        <button onClick={() => openModal(dia)} className="btn-icon btn-edit" title="Editar">
                                            <i className="bi bi-pencil-fill"></i>
                                        </button>
                                        <button onClick={() => promptDelete(dia.idDia!)} className="btn-icon btn-delete" title="Eliminar">
                                            <i className="bi bi-trash-fill"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredDias.length === 0 && !loading && (
                            <tr><td colSpan={5} style={{ padding: 0 }}>
                                <div className="ch-empty-state">
                                    <i className="bi bi-calendar-x ch-empty-icon"></i>
                                    No se encontraron días no laborables.
                                </div>
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal - Rendered via Portal */}
            {isModalOpen && ReactDOM.createPortal(
                <div className="ch-modal-overlay">
                    <div className="ch-modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2 className="ch-modal-title mb-0">{formData.idDia ? 'Editar' : 'Nuevo'} Día No Laborable</h2>
                            <button 
                                type="button" 
                                className="btn-close btn-close-white" 
                                onClick={() => setIsModalOpen(false)}
                                aria-label="Close"
                            ></button>
                        </div>

                        <form onSubmit={handleSave}>
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '1rem', color: '#a5b4fc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="bi bi-calendar-event"></i> Datos del Día
                                </h3>

                                <div className="ch-form-group">
                                    <label className="ch-label">Institución</label>
                                    <select
                                        className="ch-select"
                                        value={formData.institucion as any}
                                        onChange={e => setFormData({ ...formData, institucion: parseInt(e.target.value) })}
                                        required
                                    >
                                        <option value="">Seleccionar...</option>
                                        {instituciones.map(i => <option key={i.idInstitucion} value={i.idInstitucion}>{i.nombre}</option>)}
                                    </select>
                                </div>

                                <div className="ch-form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label className="ch-label">Fecha inicio</label>
                                        <input
                                            type="date"
                                            className="ch-input"
                                            style={{ colorScheme: 'dark' }}
                                            required
                                            value={formData.fecha_inicio}
                                            onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="ch-label">Fecha fin <span style={{ color: '#64748b', fontWeight: 400 }}>(opcional)</span></label>
                                        <input
                                            type="date"
                                            className="ch-input"
                                            style={{ colorScheme: 'dark' }}
                                            value={formData.fecha_fin || ''}
                                            min={formData.fecha_inicio}
                                            onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value || undefined })}
                                        />
                                    </div>
                                </div>

                                <div className="ch-form-group">
                                    <label className="ch-label">Motivo</label>
                                    <input
                                        className="ch-input"
                                        value={formData.motivo}
                                        onChange={e => setFormData({ ...formData, motivo: e.target.value })}
                                        placeholder="Ej: Feriado Nacional, Vacaciones"
                                        required
                                    />
                                </div>

                                <div className="ch-form-group">
                                    <label className="ch-checkbox-group">
                                        <input
                                            type="checkbox"
                                            checked={formData.aplica_a_todos}
                                            onChange={e => setFormData({ ...formData, aplica_a_todos: e.target.checked })}
                                            className="ch-checkbox"
                                        />
                                        <span style={{ fontSize: '1rem' }}>Aplica a toda la Institución</span>
                                    </label>
                                </div>
                            </div>

                            {/* Granular scope with checkboxes */}
                            {!formData.aplica_a_todos && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '1rem', color: '#a5b4fc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="bi bi-funnel"></i> Alcance específico
                                    </h3>

                                    <CheckboxPanel
                                        title="Cursos afectados"
                                        icon="book"
                                        items={filteredCursos.map(c => ({ id: c.idCurso, label: c.nombre }))}
                                        selected={(formData.cursos_afectados || []) as number[]}
                                        onChange={ids => setFormData({ ...formData, cursos_afectados: ids })}
                                        searchable={filteredCursos.length > 5}
                                    />

                                    <CheckboxPanel
                                        title="Roles afectados"
                                        icon="people"
                                        items={filteredTipos.map(t => ({ id: t.idTipoPersona, label: t.nombre }))}
                                        selected={(formData.tipos_persona_afectados || []) as number[]}
                                        onChange={ids => setFormData({ ...formData, tipos_persona_afectados: ids })}
                                    />

                                    <CheckboxPanel
                                        title="Personas específicas"
                                        icon="person"
                                        items={personas.map(p => ({ id: p.idPersona, label: p.nombre }))}
                                        selected={(formData.personas_afectadas || []) as number[]}
                                        onChange={ids => setFormData({ ...formData, personas_afectadas: ids })}
                                        searchable={true}
                                    />
                                </div>
                            )}

                            <div className="ch-modal-actions">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="ch-btn-cancel">Cancelar</button>
                                <button type="submit" className="ch-btn-save">💾 Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            <ConfirmModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar Día No Laborable?"
                message="Se eliminará este día no laborable y se volverá a exigir asistencia para esta fecha. Esta acción no se puede deshacer."
                confirmText="Sí, Eliminar"
                isLoading={deleting}
            />
        </div>
    );
};

export default DiasNoLaborablesTab;
