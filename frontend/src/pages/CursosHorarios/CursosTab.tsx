import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../config/api';
import { useToast } from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';
import './CursosHorarios.css';

interface Institucion { idInstitucion: number; nombre: string; }
interface Curso {
    idCurso: number;
    nombre: string;
    institucion: Institucion;
    activo: boolean;
    fecha_inicio?: string;
    fecha_fin?: string;
}

const CursosTab: React.FC = () => {
    const { showToast } = useToast();
    const [instituciones, setInstituciones] = useState<Institucion[]>([]);
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [selectedInstId, setSelectedInstId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCurso, setCurrentCurso] = useState<Partial<any>>({});

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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isEdit = !!currentCurso.idCurso;
            const url = isEdit ? `/cursos/${currentCurso.idCurso}/` : '/cursos/';
            const payload = { ...currentCurso, institucion: currentCurso.institucion_id };
            const res = await apiRequest(url, { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) });
            if (res.ok) {
                showToast(isEdit ? 'Curso actualizado' : 'Curso creado', 'success');
                setIsModalOpen(false);
                fetchCursos();
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

    const filteredCursos = cursos.filter(c => c.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="ch-tab-wrapper">
            {/* Header */}
            <div className={`ch-header-controls column-layout`}>
                {/* Top Row: Actions */}
                <div className="ch-controls-row right">
                    <button
                        onClick={() => { setCurrentCurso({ activo: true, institucion_id: selectedInstId || instituciones[0]?.idInstitucion }); setIsModalOpen(true); }}
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
                            {['ID', 'NOMBRE', 'INSTITUCIÓN', 'VIGENCIA', 'ESTADO', 'ACCIONES'].map((h, i) => (
                                <th key={i} className="ch-th">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCursos.map(curso => (
                            <tr key={curso.idCurso} className="ch-tr">
                                <td className="ch-td dimmed">#{curso.idCurso}</td>
                                <td className="ch-td bold">{curso.nombre}</td>
                                <td className="ch-td dimmed">{curso.institucion?.nombre}</td>
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
                                            onClick={() => { setCurrentCurso({ ...curso, institucion_id: curso.institucion?.idInstitucion }); setIsModalOpen(true); }}
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
                        ))}
                        {filteredCursos.length === 0 && !loading && (
                            <tr><td colSpan={6} style={{ padding: 0 }}>
                                <div className="ch-empty-state">
                                    <i className="bi bi-journal-x ch-empty-icon"></i>
                                    No se encontraron cursos.
                                </div>
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {isModalOpen && (
                <div className="ch-modal-overlay">
                    <div className="ch-modal-content">
                        <h2 className="ch-modal-title">{currentCurso.idCurso ? 'Editar' : 'Nuevo'} Curso</h2>
                        <form onSubmit={handleSave}>
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

                            <div className="ch-modal-actions">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="ch-btn-cancel">Cancelar</button>
                                <button type="submit" className="ch-btn-save">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
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
