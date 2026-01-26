import React, { useState, useEffect } from 'react';
import { apiRequest } from '../config/api';
import { useToast } from './Toast';

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

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentInst, setCurrentInst] = useState<Partial<Institucion>>({});

    const fetchInstituciones = async () => {
        setLoading(true);
        try {
            const res = await apiRequest('/instituciones/');
            if (res.ok) {
                const data = await res.json();
                setInstituciones(data.results || []);
            }
        } catch (error) {
            console.error(error);
            showToast('Error al cargar instituciones', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstituciones();
    }, []);

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
                showToast('Error al guardar', 'error');
            }
        } catch (error) {
            showToast('Error de conexión', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Seguro que deseas eliminar esta institución?')) return;
        try {
            const res = await apiRequest(`/instituciones/${id}/`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Institución eliminada', 'success');
                fetchInstituciones();
            } else {
                showToast('Error al eliminar', 'error');
            }
        } catch (error) {
            showToast('Error de conexión', 'error');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Instituciones</h2>
                <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    onClick={() => { setCurrentInst({ activa: true }); setIsModalOpen(true); }}
                >
                    + Nueva Institución
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-slate-900 text-gray-200 uppercase font-medium">
                        <tr>
                            <th className="px-6 py-3">ID</th>
                            <th className="px-6 py-3">Nombre</th>
                            <th className="px-6 py-3">Descripción</th>
                            <th className="px-6 py-3">Estado</th>
                            <th className="px-6 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {instituciones.map((inst) => (
                            <tr key={inst.idInstitucion} className="border-b border-slate-700 hover:bg-slate-700/50">
                                <td className="px-6 py-4">{inst.idInstitucion}</td>
                                <td className="px-6 py-4 font-bold text-white">{inst.nombre}</td>
                                <td className="px-6 py-4">{inst.descripcion}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${inst.activa ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {inst.activa ? 'ACTIVA' : 'INACTIVA'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setCurrentInst(inst); setIsModalOpen(true); }}
                                            className="text-yellow-400 hover:text-yellow-300"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(inst.idInstitucion)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {instituciones.length === 0 && !loading && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No hay instituciones registradas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-600 shadow-xl">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {currentInst.idInstitucion ? 'Editar' : 'Nueva'} Institución
                        </h3>
                        <form onSubmit={handleSave}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
                                    <input
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                        value={currentInst.nombre || ''}
                                        onChange={e => setCurrentInst({ ...currentInst, nombre: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                                    <textarea
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                        value={currentInst.descripcion || ''}
                                        onChange={e => setCurrentInst({ ...currentInst, descripcion: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="activa"
                                        className="mr-2"
                                        checked={currentInst.activa || false}
                                        onChange={e => setCurrentInst({ ...currentInst, activa: e.target.checked })}
                                    />
                                    <label htmlFor="activa" className="text-gray-300">Activa</label>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstitucionesTab;
