import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../config/api';
import { useToast } from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';
import './CursosHorarios.css';

// Interfaces
interface Institucion {
    idInstitucion: number;
    nombre: string;
    descripcion: string;
    activa: boolean;
}

const InstitucionesTab: React.FC = () => {
    const { showToast } = useToast();
    const [instituciones, setInstituciones] = useState<Institucion[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentInst, setCurrentInst] = useState<Partial<Institucion>>({});

    // Confirm Modal State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Fetch Data
    const fetchInstituciones = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiRequest('/instituciones/');
            if (res.ok) {
                const data = await res.json();
                setInstituciones(data.results || []);
            } else {
                console.error('Error fetching instituciones:', res.status);
            }
        } catch (error) {
            console.error(error);
            showToast('Error al cargar instituciones', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchInstituciones();
    }, [fetchInstituciones]);

    // Save Handler
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isEdit = !!currentInst.idInstitucion;
            const url = isEdit ? `/instituciones/${currentInst.idInstitucion}/` : '/instituciones/';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await apiRequest(url, {
                method,
                body: JSON.stringify(currentInst)
            });

            if (res.ok) {
                showToast(isEdit ? 'Institución actualizada' : 'Institución creada', 'success');
                setIsModalOpen(false);
                fetchInstituciones();
            } else {
                const err = await res.json();
                showToast('Error: ' + (err.detail || JSON.stringify(err)), 'error');
            }
        } catch (error) {
            showToast('Error de conexión', 'error');
        }
    };

    // Open confirm modal
    const promptDelete = (id: number) => {
        setItemToDelete(id);
        setConfirmOpen(true);
    };

    // Execute Delete
    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setDeleting(true);

        try {
            const res = await apiRequest(`/instituciones/${itemToDelete}/`, { method: 'DELETE' });

            if (res.ok || res.status === 204) {
                showToast('Institución eliminada correctamente', 'success');
                setInstituciones(prev => prev.filter(i => i.idInstitucion !== itemToDelete));
                fetchInstituciones();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast('Error al eliminar: ' + (err.detail || 'Error desconocido'), 'error');
            }
        } catch (error) {
            console.error('Delete network error:', error);
            showToast('Error de conexión al eliminar', 'error');
        } finally {
            setDeleting(false);
            setConfirmOpen(false);
            setItemToDelete(null);
        }
    };

    const filteredInstituciones = instituciones.filter(inst =>
        inst.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="ch-tab-wrapper">
            {/* Header */}
            <div className="ch-header-controls">
                <div className="ch-controls-row">
                    <div className="search-container">
                        <i className="bi bi-search search-icon-pos"></i>
                        <input
                            type="text"
                            placeholder="Buscar instituciones..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input-styled"
                        />
                    </div>
                    <button
                        onClick={() => { setCurrentInst({ activa: true }); setIsModalOpen(true); }}
                        className="btn-primary-action"
                    >
                        <i className="bi bi-plus-lg"></i>
                        Nueva Institución
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="ch-table-responsive">
                <table className="ch-table">
                    <thead className="ch-thead">
                        <tr>
                            <th className="ch-th">ID</th>
                            <th className="ch-th">NOMBRE</th>
                            <th className="ch-th">DESCRIPCIÓN</th>
                            <th className="ch-th">ESTADO</th>
                            <th className="ch-th text-right">ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInstituciones.map((inst) => (
                            <tr key={inst.idInstitucion} className="ch-tr">
                                <td className="ch-td dimmed">#{inst.idInstitucion}</td>
                                <td className="ch-td bold">{inst.nombre}</td>
                                <td className="ch-td dimmed">{inst.descripcion || '-'}</td>
                                <td className="ch-td">
                                    <span className={`ch-badge ${inst.activa ? 'active' : 'inactive'}`}>
                                        {inst.activa ? 'ACTIVA' : 'INACTIVA'}
                                    </span>
                                </td>
                                <td className="ch-td text-right">
                                    <div className="action-buttons">
                                        <button
                                            type="button"
                                            onClick={() => { setCurrentInst(inst); setIsModalOpen(true); }}
                                            className="btn-icon btn-edit"
                                            title="Editar"
                                        >
                                            <i className="bi bi-pencil-fill"></i>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                promptDelete(inst.idInstitucion);
                                            }}
                                            className="btn-icon btn-delete"
                                            title="Eliminar"
                                        >
                                            <i className="bi bi-trash-fill"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredInstituciones.length === 0 && !loading && (
                    <div className="ch-empty-state">
                        <i className="bi bi-search ch-empty-icon"></i>
                        No se encontraron instituciones.
                    </div>
                )}
            </div>

            {/* Modal Edit */}
            {isModalOpen && (
                <div className="ch-modal-overlay">
                    <div className="ch-modal-content">
                        <h2 className="ch-modal-title">
                            {currentInst.idInstitucion ? 'Editar' : 'Nueva'} Institución
                        </h2>
                        <form onSubmit={handleSave}>
                            <div className="ch-form-group">
                                <label className="ch-label">Nombre</label>
                                <input
                                    className="ch-input"
                                    value={currentInst.nombre || ''}
                                    onChange={e => setCurrentInst({ ...currentInst, nombre: e.target.value })}
                                    required
                                    placeholder="Ej: Escuela Técnica N°1"
                                />
                            </div>
                            <div className="ch-form-group">
                                <label className="ch-label">Descripción</label>
                                <textarea
                                    className="ch-textarea"
                                    value={currentInst.descripcion || ''}
                                    onChange={e => setCurrentInst({ ...currentInst, descripcion: e.target.value })}
                                    placeholder="Información adicional..."
                                />
                            </div>
                            <div className="ch-form-group">
                                <label className="ch-checkbox-group">
                                    <div style={{ position: 'relative', width: '24px', height: '24px' }}>
                                        <input
                                            type="checkbox"
                                            checked={currentInst.activa !== false}
                                            onChange={e => setCurrentInst({ ...currentInst, activa: e.target.checked })}
                                            className="ch-checkbox"
                                        />
                                    </div>
                                    <span style={{ fontSize: '1rem' }}>Institución Activa</span>
                                </label>
                            </div>
                            <div className="ch-modal-actions">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="ch-btn-cancel"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="ch-btn-save"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar Institución?"
                message="Esta acción no se puede deshacer. Se eliminarán permanentemente la institución y todas sus relaciones."
                confirmText="Sí, Eliminar"
                isLoading={deleting}
            />
        </div>
    );
};

export default InstitucionesTab;
