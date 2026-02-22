import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../config/api';
import { useToast } from './Toast';

interface Institucion {
    idInstitucion: number;
    nombre: string;
}

interface Curso {
    idCurso: number;
    nombre: string;
    institucion: Institucion;
    activo: boolean;
}

const CursosTab: React.FC = () => {
    const { showToast } = useToast();
    const [instituciones, setInstituciones] = useState<Institucion[]>([]);
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [selectedInstId, setSelectedInstId] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCurso, setCurrentCurso] = useState<Partial<any>>({}); // using any for form handling simplicity with nested objects

    useEffect(() => {
        // Load institutions for filter
        apiRequest('/instituciones/').then(async res => {
            if (res.ok) {
                const data = await res.json();
                setInstituciones(data.results || []);
            }
        });
    }, []);

    const fetchCursos = async () => {
        setLoading(true);
        let url = '/cursos/';
        if (selectedInstId) {
            url += `?institucion=${selectedInstId}`;
        }
        try {
            const res = await apiRequest(url);
            if (res.ok) {
                const data = await res.json();
                setCursos(data.results || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCursos();
    }, [selectedInstId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isEdit = !!currentCurso.idCurso;
            const url = isEdit ? `/cursos/${currentCurso.idCurso}/` : '/cursos/';
            const method = isEdit ? 'PUT' : 'POST';

            const payload = {
                ...currentCurso,
                institucion: currentCurso.institucion_id // Send ID, not object
            };

            const res = await apiRequest(url, {
                method,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast('Curso guardado exitosamente', 'success');
                setIsModalOpen(false);
                fetchCursos();
            } else {
                const err = await res.json();
                showToast('Error: ' + JSON.stringify(err), 'error');
            }
        } catch (error) {
            showToast('Error de conexión', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Eliminar curso?')) return;
        try {
            const res = await apiRequest(`/cursos/${id}/`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Curso eliminado', 'success');
                fetchCursos();
            }
        } catch (e) {
            showToast('Error', 'error');
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-white">Cursos</h2>

                <div className="flex gap-4 items-center w-full md:w-auto">
                    <select
                        className="bg-slate-700 text-white border border-slate-600 rounded px-3 py-2 outline-none focus:border-blue-500"
                        value={selectedInstId}
                        onChange={e => setSelectedInstId(e.target.value)}
                    >
                        <option value="">Todas las Instituciones</option>
                        {instituciones.map(i => (
                            <option key={i.idInstitucion} value={i.idInstitucion}>{i.nombre}</option>
                        ))}
                    </select>

                    <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                        onClick={() => {
                            setCurrentCurso({ active: true, institucion_id: selectedInstId || (instituciones[0]?.idInstitucion) });
                            setIsModalOpen(true);
                        }}
                    >
                        + Nuevo Curso
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cursos.map(curso => (
                    <div key={curso.idCurso} className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-slate-500 transition-all shadow-lg flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg text-white">{curso.nombre}</h3>
                            <p className="text-sm text-gray-400">{curso.institucion?.nombre}</p>
                            <div className="mt-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${curso.activo ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                    {curso.activo ? 'ACTIVO' : 'INACTIVO'}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    setCurrentCurso({
                                        ...curso,
                                        institucion_id: curso.institucion?.idInstitucion
                                    });
                                    setIsModalOpen(true);
                                }}
                                className="p-2 bg-slate-700 rounded hover:bg-slate-600 text-yellow-400"
                            >
                                ✏️
                            </button>
                            <button
                                onClick={() => handleDelete(curso.idCurso)}
                                className="p-2 bg-slate-700 rounded hover:bg-slate-600 text-red-400"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
                {cursos.length === 0 && !loading && (
                    <div className="col-span-full text-center text-gray-500 py-10">No se encontraron cursos.</div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-600 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-6">
                            {currentCurso.idCurso ? 'Editar' : 'Nuevo'} Curso
                        </h3>
                        <form onSubmit={handleSave}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Institución</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                        value={currentCurso.institucion_id || ''}
                                        onChange={e => setCurrentCurso({ ...currentCurso, institucion_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Seleccionar...</option>
                                        {instituciones.map(i => (
                                            <option key={i.idInstitucion} value={i.idInstitucion}>{i.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del Curso</label>
                                    <input
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                        value={currentCurso.nombre || ''}
                                        onChange={e => setCurrentCurso({ ...currentCurso, nombre: e.target.value })}
                                        placeholder="Ej: 5to Año 'A'"
                                        required
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="curso-activo"
                                        className="mr-2 w-4 h-4 accent-blue-600"
                                        checked={currentCurso.activo !== false}
                                        onChange={e => setCurrentCurso({ ...currentCurso, activo: e.target.checked })}
                                    />
                                    <label htmlFor="curso-activo" className="text-gray-300">Curso Activo</label>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
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

export default CursosTab;
