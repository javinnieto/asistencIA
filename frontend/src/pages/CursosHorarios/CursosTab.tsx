import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { apiRequest } from '../../config/api';
import { useToast } from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';
import './CursosHorarios.css';

interface Institucion { idInstitucion: number; nombre: string; }
interface Horario {
    idHorario?: number;
    dia: string;
    hora_inicio: string;
    hora_fin: string;
    materia: string;
    activo?: boolean;
}
interface Curso {
    idCurso: number;
    nombre: string;
    institucion: Institucion;
    activo: boolean;
    fecha_inicio?: string;
    fecha_fin?: string;
    horarios?: Horario[];
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const CursosTab: React.FC = () => {
    const { showToast } = useToast();
    const [instituciones, setInstituciones] = useState<Institucion[]>([]);
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [selectedInstId, setSelectedInstId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCurso, setCurrentCurso] = useState<Partial<any>>({});
    const [expandedCursoId, setExpandedCursoId] = useState<number | null>(null);

    // Horarios management in modal
    const [horarios, setHorarios] = useState<Horario[]>([]);

    // Confirm Modal
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        apiRequest('/instituciones/').then(async res => {
            if (res.ok) setInstituciones((await res.json()).results || []);
        });
    }, []);

    const fetchCursos = useCallback(async () => {
        setLoading(true);
        let url = '/cursos/';
        if (selectedInstId) url += `?institucion=${selectedInstId}`;
        try {
            const res = await apiRequest(url);
            if (res.ok) setCursos((await res.json()).results || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [selectedInstId]);

    useEffect(() => { fetchCursos(); }, [fetchCursos]);

    const openModal = (curso?: Curso) => {
        if (curso) {
            setCurrentCurso({ ...curso, institucion_id: curso.institucion?.idInstitucion });
            setHorarios(curso.horarios || []);
        } else {
            setCurrentCurso({ activo: true, institucion_id: selectedInstId || instituciones[0]?.idInstitucion });
            setHorarios([{ dia: 'Lunes', hora_inicio: '08:00', hora_fin: '09:00', materia: '', activo: true }]);
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validación: al menos 1 horario
        if (!horarios || horarios.length === 0) {
            showToast('Debe agregar al menos un horario al curso', 'error');
            return;
        }

        // Validar que los horarios tengan datos válidos
        const invalidHorario = horarios.find(h => !h.dia || !h.hora_inicio || !h.hora_fin);
        if (invalidHorario) {
            showToast('Todos los horarios deben tener día, hora de inicio y hora de fin', 'error');
            return;
        }

        try {
            const isEdit = !!currentCurso.idCurso;
            const payload = {
                nombre: currentCurso.nombre,
                institucion: currentCurso.institucion_id,
                activo: currentCurso.activo,
                fecha_inicio: currentCurso.fecha_inicio || null,
                fecha_fin: currentCurso.fecha_fin || null,
                horarios: horarios.map(h => ({
                    dia: h.dia,
                    hora_inicio: h.hora_inicio,
                    hora_fin: h.hora_fin,
                    materia: h.materia || '',
                    activo: h.activo !== false
                }))
            };

            if (isEdit) {
                // Para editar, necesitamos actualizar curso y horarios por separado
                const cursoRes = await apiRequest(`/cursos/${currentCurso.idCurso}/`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        nombre: currentCurso.nombre,
                        institucion: currentCurso.institucion_id,
                        activo: currentCurso.activo,
                        fecha_inicio: currentCurso.fecha_inicio || null,
                        fecha_fin: currentCurso.fecha_fin || null
                    })
                });

                if (!cursoRes.ok) {
                    const err = await cursoRes.json();
                    showToast('Error: ' + (err.detail || JSON.stringify(err)), 'error');
                    return;
                }

                // Eliminar horarios viejos y crear nuevos
                // Por simplicidad, eliminar todos y recrear
                const oldHorarios = currentCurso.horarios || [];
                for (const h of oldHorarios) {
                    if (h.idHorario) {
                        await apiRequest(`/horarios/${h.idHorario}/`, { method: 'DELETE' });
                    }
                }

                // Crear nuevos horarios
                for (const h of horarios) {
                    await apiRequest('/horarios/', {
                        method: 'POST',
                        body: JSON.stringify({
                            curso: currentCurso.idCurso,
                            dia: h.dia,
                            hora_inicio: h.hora_inicio,
                            hora_fin: h.hora_fin,
                            materia: h.materia || '',
                            activo: h.activo !== false
                        })
                    });
                }

                showToast('Curso actualizado exitosamente', 'success');
            } else {
                // Crear nuevo curso con horarios
                const res = await apiRequest('/cursos/', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    showToast('Curso creado exitosamente', 'success');
                } else {
                    const err = await res.json();
                    showToast('Error: ' + (err.detail || err.horarios?.[0] || JSON.stringify(err)), 'error');
                    return;
                }
            }

            setIsModalOpen(false);
            fetchCursos();
        } catch (e) {
            console.error(e);
            showToast('Error de conexión', 'error');
        }
    };

    const addHorario = () => {
        setHorarios([...horarios, { dia: 'Lunes', hora_inicio: '08:00', hora_fin: '09:00', materia: '', activo: true }]);
    };

    const removeHorario = (index: number) => {
        if (horarios.length <= 1) {
            showToast('Debe haber al menos un horario', 'error');
            return;
        }
        setHorarios(horarios.filter((_, i) => i !== index));
    };

    const updateHorario = (index: number, field: keyof Horario, value: any) => {
        const updated = [...horarios];
        updated[index] = { ...updated[index], [field]: value };
        setHorarios(updated);
    };

    const promptDelete = (id: number) => {
        setItemToDelete(id);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setDeleting(true);
        try {
            const res = await apiRequest(`/cursos/${itemToDelete}/`, { method: 'DELETE' });
            if (res.ok || res.status === 204) {
                showToast('Curso eliminado correctamente', 'success');
                setCursos(prev => prev.filter(c => c.idCurso !== itemToDelete));
                fetchCursos();
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

    const toggleExpand = async (cursoId: number) => {
        if (expandedCursoId === cursoId) {
            setExpandedCursoId(null);
        } else {
            // Cargar horarios del curso si no los tenemos
            const curso = cursos.find(c => c.idCurso === cursoId);
            if (!curso?.horarios) {
                const res = await apiRequest(`/horarios/?curso=${cursoId}`);
                if (res.ok) {
                    const data = await res.json();
                    setCursos(prev => prev.map(c =>
                        c.idCurso === cursoId ? { ...c, horarios: data.results || [] } : c
                    ));
                }
            }
            setExpandedCursoId(cursoId);
        }
    };

    const filteredCursos = cursos.filter(c => c.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="ch-tab-wrapper">
            {/* Header */}
            <div className={`ch-header-controls column-layout`}>
                {/* Top Row: Title & Actions */}
                <div className="ch-controls-row right" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 700 }}>
                            Gestionar Cursos y Horarios
                        </h1>
                        <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                            Administración académica
                        </p>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="btn-primary-action"
                    >
                        <i className="bi bi-plus-lg"></i> Nuevo Curso
                    </button>
                </div>

                {/* Bottom Row: Filters */}
                <div className="ch-controls-row nowrap">
                    <div className="search-container" style={{ flex: '1 1 200px', minWidth: '200px' }}>
                        <i className="bi bi-search search-icon-pos"></i>
                        <input
                            type="text"
                            placeholder="Buscar cursos..."
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
                            <th className="ch-th" style={{ width: '40px' }}></th>
                            {['ID', 'NOMBRE', 'INSTITUCIÓN', 'HORARIOS', 'VIGENCIA', 'ESTADO', 'ACCIONES'].map((h, i) => (
                                <th key={i} className="ch-th">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCursos.map(curso => (
                            <React.Fragment key={curso.idCurso}>
                                <tr
                                    className="ch-tr clickable"
                                    onClick={() => toggleExpand(curso.idCurso)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td className="ch-td">
                                        <i className={`bi bi-chevron-${expandedCursoId === curso.idCurso ? 'down' : 'right'}`} style={{ transition: 'transform 0.2s', fontSize: '0.9rem', color: '#94a3b8' }}></i>
                                    </td>
                                    <td className="ch-td dimmed">#{curso.idCurso}</td>
                                    <td className="ch-td bold">{curso.nombre}</td>
                                    <td className="ch-td dimmed">{curso.institucion?.nombre}</td>
                                    <td className="ch-td">
                                        <span className="horario-count-badge">
                                            {curso.horarios?.length || 0} horario{(curso.horarios?.length || 0) !== 1 ? 's' : ''}
                                        </span>
                                    </td>
                                    <td className="ch-td dimmed" style={{ fontSize: '0.9rem' }}>
                                        {curso.fecha_inicio ? `${curso.fecha_inicio} → ${curso.fecha_fin || '∞'}` : <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Sin fechas</span>}
                                    </td>
                                    <td className="ch-td">
                                        <span className={`ch-badge ${curso.activo ? 'active' : 'inactive'}`}>
                                            {curso.activo ? 'ACTIVO' : 'INACTIVO'}
                                        </span>
                                    </td>
                                    <td className="ch-td">
                                        <div className="action-buttons">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openModal(curso); }}
                                                className="btn-icon btn-edit"
                                                title="Editar"
                                            >
                                                <i className="bi bi-pencil-fill"></i>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); promptDelete(curso.idCurso); }}
                                                className="btn-icon btn-delete"
                                                title="Eliminar"
                                            >
                                                <i className="bi bi-trash-fill"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {expandedCursoId === curso.idCurso && (
                                    <tr className="expanded-row">
                                        <td colSpan={8} style={{ padding: 0, background: 'rgba(15, 23, 42, 0.8)' }}>
                                            <div className="horarios-expanded-container">
                                                <div className="horarios-header">
                                                    <i className="bi bi-clock-fill"></i>
                                                    <span>Horarios de {curso.nombre}</span>
                                                </div>
                                                {curso.horarios && curso.horarios.length > 0 ? (
                                                    <div className="horarios-grid">
                                                        {curso.horarios.map((h, idx) => (
                                                            <div key={idx} className="horario-card">
                                                                <div className="horario-day">{h.dia}</div>
                                                                <div className="horario-time">{h.hora_inicio} - {h.hora_fin}</div>
                                                                {h.materia && <div className="horario-subject">{h.materia}</div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="horarios-empty">
                                                        <i className="bi bi-calendar-x"></i>
                                                        <span>No hay horarios definidos para este curso</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {filteredCursos.length === 0 && !loading && (
                            <tr><td colSpan={8} style={{ padding: 0 }}>
                                <div className="ch-empty-state">
                                    <i className="bi bi-journal-x ch-empty-icon"></i>
                                    No se encontraron cursos.
                                </div>
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal - Rendered via Portal */}
            {isModalOpen && ReactDOM.createPortal(
                <div className="ch-modal-overlay">
                    <div className="ch-modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 className="ch-modal-title">{currentCurso.idCurso ? 'Editar' : 'Nuevo'} Curso</h2>
                        <form onSubmit={handleSave}>
                            {/* Datos del Curso */}
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '1rem', color: '#a5b4fc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="bi bi-book"></i> Datos del Curso
                                </h3>

                                <div className="ch-form-group">
                                    <label className="ch-label">Institución</label>
                                    <select
                                        className="ch-select"
                                        value={currentCurso.institucion_id || ''}
                                        onChange={e => setCurrentCurso({ ...currentCurso, institucion_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Seleccionar...</option>
                                        {instituciones.map(i => <option key={i.idInstitucion} value={i.idInstitucion}>{i.nombre}</option>)}
                                    </select>
                                </div>

                                <div className="ch-form-group">
                                    <label className="ch-label">Nombre</label>
                                    <input className="ch-input" value={currentCurso.nombre || ''} onChange={e => setCurrentCurso({ ...currentCurso, nombre: e.target.value })} placeholder="Ej: 5to Año 'A'" required />
                                </div>

                                <div className="ch-form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label className="ch-label">Inicio</label>
                                        <input type="date" className="ch-input" style={{ colorScheme: 'dark' }} value={currentCurso.fecha_inicio || ''} onChange={e => setCurrentCurso({ ...currentCurso, fecha_inicio: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="ch-label">Fin</label>
                                        <input type="date" className="ch-input" style={{ colorScheme: 'dark' }} value={currentCurso.fecha_fin || ''} onChange={e => setCurrentCurso({ ...currentCurso, fecha_fin: e.target.value })} />
                                    </div>
                                </div>

                                <div className="ch-form-group">
                                    <label className="ch-checkbox-group">
                                        <input type="checkbox" checked={currentCurso.activo !== false} onChange={e => setCurrentCurso({ ...currentCurso, activo: e.target.checked })} className="ch-checkbox" />
                                        <span style={{ fontSize: '1rem' }}>Curso Activo</span>
                                    </label>
                                </div>
                            </div>

                            {/* Horarios Section */}
                            <div style={{ marginBottom: '24px', padding: '20px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '1rem', color: '#a5b4fc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="bi bi-clock"></i> Horarios <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'normal' }}>(mínimo 1)</span>
                                    </h3>
                                    <button type="button" onClick={addHorario} className="btn-add-horario">
                                        <i className="bi bi-plus-lg"></i> Agregar Horario
                                    </button>
                                </div>

                                <div className="horarios-list-modal">
                                    {horarios.map((h, idx) => (
                                        <div key={idx} className="horario-item-modal">
                                            <div className="horario-item-number">{idx + 1}</div>
                                            <div className="horario-item-fields">
                                                <select
                                                    value={h.dia}
                                                    onChange={e => updateHorario(idx, 'dia', e.target.value)}
                                                    className="ch-input"
                                                    required
                                                >
                                                    {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                                <input
                                                    type="time"
                                                    value={h.hora_inicio}
                                                    onChange={e => updateHorario(idx, 'hora_inicio', e.target.value)}
                                                    className="ch-input"
                                                    style={{ colorScheme: 'dark' }}
                                                    required
                                                />
                                                <input
                                                    type="time"
                                                    value={h.hora_fin}
                                                    onChange={e => updateHorario(idx, 'hora_fin', e.target.value)}
                                                    className="ch-input"
                                                    style={{ colorScheme: 'dark' }}
                                                    required
                                                />
                                                <input
                                                    type="text"
                                                    value={h.materia || ''}
                                                    onChange={e => updateHorario(idx, 'materia', e.target.value)}
                                                    className="ch-input"
                                                    placeholder="Materia (opcional)"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeHorario(idx)}
                                                className="btn-remove-horario"
                                                disabled={horarios.length <= 1}
                                                title={horarios.length <= 1 ? 'Debe haber al menos un horario' : 'Eliminar horario'}
                                            >
                                                <i className="bi bi-trash-fill"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="ch-modal-actions">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="ch-btn-cancel">Cancelar</button>
                                <button type="submit" className="ch-btn-save">💾 Guardar Curso</button>
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
                title="¿Eliminar Curso?"
                message="Se eliminará el curso y toda la información asociada (horarios, asignaciones, etc). Esta acción no se puede deshacer."
                confirmText="Sí, Eliminar Curso"
                isLoading={deleting}
            />
        </div>
    );
};

export default CursosTab;
