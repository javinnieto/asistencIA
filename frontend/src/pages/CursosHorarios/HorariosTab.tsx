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
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const HorariosTab: React.FC = () => {
    const { showToast } = useToast();
    const [instituciones, setInstituciones] = useState<Institucion[]>([]);
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [horarios, setHorarios] = useState<Horario[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedInstId, setSelectedInstId] = useState<string>('');
    const [selectedCursoId, setSelectedCursoId] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentHorario, setCurrentHorario] = useState<Partial<Horario>>({});

    // Confirm Modal
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        apiRequest('/instituciones/').then(async res => {
            if (res.ok) setInstituciones((await res.json()).results || []);
        });
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
            const res = await apiRequest(`/horarios/?curso=${selectedCursoId}`);
            if (res.ok) setHorarios((await res.json()).results || []);
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
            const payload = { ...currentHorario, curso: selectedCursoId, activo: true };
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

    // Group by day
    const horariosAgrupados = DIAS.reduce((acc, dia) => {
        const delDia = horarios.filter(h => h.dia === dia);
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
                            <span className="ch-count-badge">{horarios.length} CLASES</span>
                        </div>
                        <button
                            onClick={() => { setCurrentHorario({ dia: 'Lunes' } as Partial<Horario>); setIsModalOpen(true); }}
                            className="btn-primary-action"
                        >
                            <i className="bi bi-clock-fill"></i> Agregar Horario
                        </button>
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
                                                </div>
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
                            <div className="ch-form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label className="ch-label">Entrada</label>
                                    <input type="time" className="ch-input" style={{ colorScheme: 'dark' }} value={currentHorario.hora_inicio || ''} onChange={e => setCurrentHorario({ ...currentHorario, hora_inicio: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="ch-label">Salida</label>
                                    <input type="time" className="ch-input" style={{ colorScheme: 'dark' }} value={currentHorario.hora_fin || ''} onChange={e => setCurrentHorario({ ...currentHorario, hora_fin: e.target.value })} required />
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
