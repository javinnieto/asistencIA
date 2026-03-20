import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../config/api';
import { useToast } from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';
import './CursosHorarios.css';

interface Institucion { idInstitucion: number; nombre: string; }
interface Curso { idCurso: number; nombre: string; institucion: Institucion; activo: boolean; }
interface Horario {
    idHorario: number;
    curso: Curso;
    dia: string;
    hora_inicio: string;
    hora_fin: string;
    activo: boolean;
    semana: string;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const HorariosTab: React.FC = () => {
    const { showToast } = useToast();
    const { isAdmin, rol, cursosProfesor } = useAuth();
    const [instituciones, setInstituciones] = useState<Institucion[]>([]);
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [horarios, setHorarios] = useState<Horario[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedInstId, setSelectedInstId] = useState<string>('');
    const [selectedCursoId, setSelectedCursoId] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentHorario, setCurrentHorario] = useState<Partial<Horario>>({});

    // Semana A/B
    const [semanaActual, setSemanaActual] = useState<string>('A');
    const [filtroSemana, setFiltroSemana] = useState<string>('');
    const [configSemana, setConfigSemana] = useState<{id?: number, fecha_referencia_semana_a: string}>({fecha_referencia_semana_a: ''});
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    // Confirm Modal
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchConfigSemana = async () => {
        try {
            const resData = await apiRequest('/configuracion-semana/actual/');
            if (resData.ok) {
                const data = await resData.json();
                setSemanaActual(data.semana || 'A');
            }
            const resConfig = await apiRequest('/configuracion-semana/');
            if (resConfig.ok) {
                const configData = await resConfig.json();
                if (configData.results && configData.results.length > 0) {
                    setConfigSemana(configData.results[0]);
                }
            }
        } catch(e) { console.error(e) }
    };

    useEffect(() => {
        apiRequest('/instituciones/').then(async res => {
            if (res.ok) setInstituciones((await res.json()).results || []);
        });
        fetchConfigSemana();
    }, []);

    useEffect(() => {
        if (!selectedInstId) { setCursos([]); setSelectedCursoId(''); setHorarios([]); return; }
        apiRequest(`/cursos/?institucion=${selectedInstId}`).then(async res => {
            if (res.ok) setCursos((await res.json()).results || []);
        });
    }, [selectedInstId]);

    const fetchHorarios = useCallback(async () => {
        if (!selectedCursoId) { setHorarios([]); return; }
        setLoading(true);
        try {
            const res = await apiRequest(`/horarios/?curso=${selectedCursoId}&page_size=100`);
            if (res.ok) {
                const data = await res.json();
                setHorarios(data.results || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [selectedCursoId]);

    useEffect(() => { fetchHorarios(); }, [fetchHorarios]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isEdit = !!currentHorario.idHorario;
            const url = isEdit ? `/horarios/${currentHorario.idHorario}/` : '/horarios/';
            const method = isEdit ? 'PUT' : 'POST';
            const payload = { ...currentHorario, curso: selectedCursoId, activo: true, semana: currentHorario.semana || 'Todas' };
            const res = await apiRequest(url, { method, body: JSON.stringify(payload) });
            if (res.ok) {
                showToast(isEdit ? 'Horario actualizado' : 'Horario creado', 'success');
                setIsModalOpen(false);
                fetchHorarios();
            } else {
                const err = await res.json();
                showToast('Error: ' + (err.detail || JSON.stringify(err)), 'error');
            }
        } catch (e) { showToast('Error de conexión', 'error'); }
    };

    const promptDelete = (id: number) => {
        setItemToDelete(id);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setDeleting(true);
        try {
            const res = await apiRequest(`/horarios/${itemToDelete}/`, { method: 'DELETE' });
            if (res.ok || res.status === 204) {
                showToast('Horario eliminado correctamente', 'success');
                fetchHorarios();
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

    const handleSaveConfigSemana = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (configSemana.id) {
                const res = await apiRequest(`/configuracion-semana/${configSemana.id}/`, {
                    method: 'PUT',
                    body: JSON.stringify({ fecha_referencia_semana_a: configSemana.fecha_referencia_semana_a })
                });
                if (res.ok) {
                    showToast('Configuración actualizada', 'success');
                    setIsConfigModalOpen(false);
                    fetchConfigSemana();
                } else {
                    showToast('Error al actualizar configuración', 'error');
                }
            }
        } catch (e) { showToast('Error de conexión', 'error'); }
    };

    // Group by day, filtered by semana
    const horariosFiltrados = filtroSemana 
        ? horarios.filter(h => h.semana === filtroSemana || h.semana === 'Todas')
        : horarios;

    const horariosAgrupados = DIAS.reduce((acc, dia) => {
        const delDia = horariosFiltrados.filter(h => h.dia === dia);
        if (delDia.length > 0) acc[dia] = delDia;
        return acc;
    }, {} as Record<string, Horario[]>);

    const diasConHorarios = Object.keys(horariosAgrupados);

    return (
        <div className="ch-tab-wrapper">
            {/* Filters */}
            <div className="ch-header-controls">
                <div className="ch-horarios-grid" style={{ width: '100%' }}>
                    <div>
                        <label className="ch-label" style={{ color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Institución</label>
                        <select
                            className="ch-select"
                            value={selectedInstId}
                            onChange={e => { setSelectedInstId(e.target.value); setSelectedCursoId(''); }}
                        >
                            <option value="">Seleccionar Institución...</option>
                            {instituciones.map(i => <option key={i.idInstitucion} value={i.idInstitucion}>{i.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="ch-label" style={{ color: selectedInstId ? '#60a5fa' : '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Curso</label>
                        <select
                            className="ch-select"
                            style={{ opacity: selectedInstId ? 1 : 0.5, cursor: selectedInstId ? 'pointer' : 'not-allowed' }}
                            value={selectedCursoId}
                            onChange={e => setSelectedCursoId(e.target.value)}
                            disabled={!selectedInstId}
                        >
                            <option value="">{selectedInstId ? 'Seleccionar Curso...' : '← Seleccione institución'}</option>
                            {cursos.map(c => <option key={c.idCurso} value={c.idCurso}>{c.nombre}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Content */}
            {selectedCursoId ? (
                <>
                    <div className="ch-horario-header">
                        <div className="ch-title-group">
                            <div className="ch-title-bar"></div>
                            <h3 className="ch-page-title">Horarios</h3>
                            <span className="ch-count-badge">{horariosFiltrados.length} CLASES</span>
                            <span style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: semanaActual === 'A' ? 'rgba(59,130,246,0.2)' : 'rgba(168,85,247,0.2)',
                                color: semanaActual === 'A' ? '#60a5fa' : '#c084fc',
                                marginLeft: '8px'
                            }}>
                                Semana Actual: {semanaActual}
                            </span>
                            {isAdmin && (
                                <button
                                    onClick={() => setIsConfigModalOpen(true)}
                                    style={{
                                        marginLeft: '8px',
                                        background: 'none',
                                        border: '1px solid #475569',
                                        color: '#94a3b8',
                                        borderRadius: '6px',
                                        padding: '4px 8px',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                    title="Configurar Semana A/B"
                                >
                                    <i className="bi bi-gear-fill"></i>
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <select
                                className="ch-select"
                                value={filtroSemana}
                                onChange={e => setFiltroSemana(e.target.value)}
                                style={{ width: 'auto', minWidth: '130px' }}
                            >
                                <option value="">Todas las semanas</option>
                                <option value="A">Semana A</option>
                                <option value="B">Semana B</option>
                            </select>
                            {(isAdmin || (rol === 'profesor' && cursosProfesor.includes(Number(selectedCursoId)))) && (
                                <button
                                    onClick={() => { setCurrentHorario({ dia: 'Lunes', semana: 'Todas' } as Partial<Horario>); setIsModalOpen(true); }}
                                    className="btn-primary-action"
                                >
                                    <i className="bi bi-clock-fill"></i> Agregar Horario
                                </button>
                            )}
                        </div>
                    </div>

                    {diasConHorarios.length > 0 ? (
                        <div className="ch-days-container">
                            {diasConHorarios.map(dia => (
                                <div key={dia} className="ch-day-card">
                                    <div className="ch-day-header">{dia}</div>
                                    <div className="ch-day-content">
                                        {horariosAgrupados[dia].map(h => (
                                            <div key={h.idHorario} className="ch-horario-item">
                                                <div className="ch-time-display">
                                                    <i className="bi bi-clock" style={{ color: '#60a5fa', fontSize: '1.2rem' }}></i>
                                                    <span className="ch-time-text">
                                                        {h.hora_inicio?.slice(0, 5)} - {h.hora_fin?.slice(0, 5)}
                                                    </span>
                                                    {h.semana !== 'Todas' && (
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '8px',
                                                            fontSize: '0.65rem',
                                                            fontWeight: 700,
                                                            background: h.semana === 'A' ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)',
                                                            color: h.semana === 'A' ? '#60a5fa' : '#c084fc',
                                                            marginLeft: '6px'
                                                        }}>
                                                            Sem {h.semana}
                                                        </span>
                                                    )}
                                                </div>
                                                {(isAdmin || (rol === 'profesor' && cursosProfesor.includes(Number(selectedCursoId)))) && (
                                                    <div className="action-buttons">
                                                        <button
                                                            onClick={() => { setCurrentHorario(h); setIsModalOpen(true); }}
                                                            className="btn-icon btn-edit"
                                                            title="Editar"
                                                        >
                                                            <i className="bi bi-pencil-fill"></i>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); promptDelete(h.idHorario); }}
                                                            className="btn-icon btn-delete"
                                                            title="Eliminar"
                                                        >
                                                            <i className="bi bi-trash-fill"></i>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="ch-no-selection">
                            <i className="bi bi-calendar-x" style={{ fontSize: '3rem', marginBottom: '16px', display: 'block', opacity: 0.5 }}></i>
                            No hay horarios definidos para este curso.
                        </div>
                    )}
                </>
            ) : (
                <div className="ch-no-selection">
                    <i className="bi bi-arrow-up-circle" style={{ fontSize: '3rem', marginBottom: '20px', display: 'block', opacity: 0.5 }}></i>
                    Seleccione una Institución y un Curso para gestionar los horarios.
                </div>
            )}

            {isModalOpen && (
                <div className="ch-modal-overlay">
                    <div className="ch-modal-content">
                        <h2 className="ch-modal-title">{currentHorario.idHorario ? 'Editar' : 'Nuevo'} Horario</h2>
                        <form onSubmit={handleSave}>
                            <div className="ch-form-group">
                                <label className="ch-label">Día de la semana</label>
                                <select className="ch-select" value={currentHorario.dia || 'Lunes'} onChange={e => setCurrentHorario({ ...currentHorario, dia: e.target.value })}>
                                    {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="ch-form-group">
                                <label className="ch-label">Semana</label>
                                <select className="ch-select" value={currentHorario.semana || 'Todas'} onChange={e => setCurrentHorario({ ...currentHorario, semana: e.target.value })}>
                                    <option value="Todas">Todas (ambas semanas)</option>
                                    <option value="A">Semana A</option>
                                    <option value="B">Semana B</option>
                                </select>
                            </div>
                            <div className="ch-form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label className="ch-label">Entrada</label>
                                    <input type="time" className="ch-input" lang="en-GB" style={{ colorScheme: 'dark' }} value={currentHorario.hora_inicio || ''} onChange={e => setCurrentHorario({ ...currentHorario, hora_inicio: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="ch-label">Salida</label>
                                    <input type="time" className="ch-input" lang="en-GB" style={{ colorScheme: 'dark' }} value={currentHorario.hora_fin || ''} onChange={e => setCurrentHorario({ ...currentHorario, hora_fin: e.target.value })} required />
                                </div>
                            </div>
                            <div className="ch-modal-actions">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="ch-btn-cancel">Cancelar</button>
                                <button type="submit" className="ch-btn-save">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isConfigModalOpen && (
                <div className="ch-modal-overlay">
                    <div className="ch-modal-content" style={{maxWidth: '400px'}}>
                        <h2 className="ch-modal-title">Configuración Semana A/B</h2>
                        <form onSubmit={handleSaveConfigSemana}>
                            <div className="ch-form-group">
                                <label className="ch-label">Fecha de referencia (Semana A)</label>
                                <p style={{fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px', lineHeight: '1.4'}}>
                                    Seleccione cualquier fecha que haya caído en <strong>Semana A</strong>. El sistema calculará automáticamente las semanas B y A futuras basándose en esta fecha.
                                </p>
                                <input 
                                    type="date" 
                                    className="ch-input" 
                                    style={{ colorScheme: 'dark' }} 
                                    value={configSemana.fecha_referencia_semana_a || ''} 
                                    onChange={e => setConfigSemana({ ...configSemana, fecha_referencia_semana_a: e.target.value })} 
                                    required 
                                />
                            </div>
                            <div className="ch-modal-actions">
                                <button type="button" onClick={() => setIsConfigModalOpen(false)} className="ch-btn-cancel">Cancelar</button>
                                <button type="submit" className="ch-btn-save">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar Horario?"
                message="Esta acción eliminará el horario de clases seleccionado permanentemente."
                confirmText="Eliminar Horario"
            />
        </div>
    );
};

export default HorariosTab;
