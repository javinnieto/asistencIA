import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../config/api';
import { useToast } from '../../components/Toast';

interface Institucion { idInstitucion: number; nombre: string; }
interface Curso { idCurso: number; nombre: string; institucion: Institucion; activo: boolean; }
interface Horario {
    idHorario: number;
    curso: Curso;
    dia: string;
    hora_inicio: string;
    hora_fin: string;
    materia: string;
    activo: boolean;
}
interface Persona { idPersona: number; nombre: string; horarios: Horario[]; }

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const HorariosTab: React.FC = () => {
    const { showToast } = useToast();
    const [instituciones, setInstituciones] = useState<Institucion[]>([]);
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [horarios, setHorarios] = useState<Horario[]>([]);

    // Filters
    const [selectedInstId, setSelectedInstId] = useState<string>('');
    const [selectedCursoId, setSelectedCursoId] = useState<string>('');

    // Modal Horario
    const [isHorarioModalOpen, setIsHorarioModalOpen] = useState(false);
    const [currentHorario, setCurrentHorario] = useState<Partial<any>>({});

    // Modal Asignacion (Individual)
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedSchedulerId, setSelectedSchedulerId] = useState<number | null>(null);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [assignedPersonIds, setAssignedPersonIds] = useState<Set<number>>(new Set());

    // Load initial data
    useEffect(() => {
        apiRequest('/instituciones/').then(async res => {
            if (res.ok) setInstituciones((await res.json()).results || []);
        });
    }, []);

    // Load courses when inst changes
    useEffect(() => {
        if (!selectedInstId) {
            setCursos([]);
            return;
        }
        apiRequest(`/cursos/?institucion=${selectedInstId}`).then(async res => {
            if (res.ok) setCursos((await res.json()).results || []);
        });
    }, [selectedInstId]);

    // Load horarios when curso changes
    const fetchHorarios = async () => {
        if (!selectedCursoId) {
            setHorarios([]);
            return;
        }
        try {
            const res = await apiRequest(`/horarios/?curso=${selectedCursoId}`);
            if (res.ok) setHorarios((await res.json()).results || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchHorarios();
    }, [selectedCursoId]);

    // --- Actions ---

    const handleSaveHorario = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isEdit = !!currentHorario.idHorario;
            const url = isEdit ? `/horarios/${currentHorario.idHorario}/` : '/horarios/';
            const method = isEdit ? 'PUT' : 'POST';

            const payload = { ...currentHorario, curso: selectedCursoId };

            const res = await apiRequest(url, { method, body: JSON.stringify(payload) });
            if (res.ok) {
                showToast('Horario guardado', 'success');
                setIsHorarioModalOpen(false);
                fetchHorarios();
            } else {
                showToast('Error al guardar horario', 'error');
            }
        } catch (e) { showToast('Error de conexión', 'error'); }
    };

    const handleDeleteHorario = async (id: number) => {
        if (!window.confirm('¿Eliminar este horario?')) return;
        try {
            await apiRequest(`/horarios/${id}/`, { method: 'DELETE' });
            fetchHorarios();
            showToast('Horario eliminado', 'success');
        } catch (e) { showToast('Error', 'error'); }
    };

    // --- Bulk Propagation ---
    const handlePropagateSchedules = async () => {
        if (!selectedCursoId) return;
        if (!window.confirm('¿Estás seguro? Esto SOBREESCRIBIRÁ los horarios asignados individualmente a CADA ALUMNO de este curso con el esquema actual.')) {
            return;
        }

        try {
            showToast('Aplicando horarios a todos los alumnos...', 'info');
            const res = await apiRequest(`/cursos/${selectedCursoId}/propagate_schedules/`, {
                method: 'POST'
            });

            if (res.ok) {
                const data = await res.json();
                showToast(`¡Listo! ${data.message}`, 'success');
            } else {
                showToast('Error al propagar horarios', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error de conexión', 'error');
        }
    };


    // --- Individual Assignment Logic ---
    const openAssignmentModal = async (horarioId: number) => {
        setSelectedSchedulerId(horarioId);
        setIsAssignModalOpen(true);
        setPersonas([]);
        setAssignedPersonIds(new Set());

        try {
            const res = await apiRequest('/personas/?activo=true');
            if (res.ok) {
                const allPersonas = (await res.json()).results as Persona[];
                const assigned = new Set<number>();
                allPersonas.forEach(p => {
                    if (p.horarios && p.horarios.some(h => h.idHorario === horarioId)) {
                        assigned.add(p.idPersona);
                    }
                });
                setPersonas(allPersonas);
                setAssignedPersonIds(assigned);
            }
        } catch (e) { console.error(e); }
    };

    const toggleAssignment = (personaId: number) => {
        const newSet = new Set(assignedPersonIds);
        if (newSet.has(personaId)) newSet.delete(personaId);
        else newSet.add(personaId);
        setAssignedPersonIds(newSet);
    };

    // Manual save for individual assignments (legacy/fine-tuning)
    const saveAssignments = async () => {
        if (!selectedSchedulerId) return;
        showToast('Guardando asignaciones...', 'info');
        try {
            const res = await apiRequest('/personas/?activo=true');
            const allPersonas = (await res.json()).results as Persona[];

            const promises = allPersonas.map(async (p) => {
                const wasAssigned = p.horarios?.some(h => h.idHorario === selectedSchedulerId);
                const isAssignedNow = assignedPersonIds.has(p.idPersona);

                if (wasAssigned !== isAssignedNow) {
                    let currentHorarioIds = p.horarios?.map(h => h.idHorario) || [];
                    if (isAssignedNow) {
                        currentHorarioIds.push(selectedSchedulerId);
                    } else {
                        currentHorarioIds = currentHorarioIds.filter(hid => hid !== selectedSchedulerId);
                    }
                    await apiRequest(`/personas/${p.idPersona}/`, {
                        method: 'PATCH',
                        body: JSON.stringify({ horarios: currentHorarioIds })
                    });
                }
            });

            await Promise.all(promises);
            showToast('Asignaciones completadas', 'success');
            setIsAssignModalOpen(false);
        } catch (e) {
            showToast('Error al procesar asignaciones', 'error');
        }
    };

    return (
        <div>
            {/* Filters */}
            <div className="bg-slate-800 p-6 rounded-xl mb-8 border border-slate-700 shadow-xl">
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-2">Institución</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            value={selectedInstId}
                            onChange={e => { setSelectedInstId(e.target.value); setSelectedCursoId(''); }}
                        >
                            <option value="">Seleccionar Institución...</option>
                            {instituciones.map(i => <option key={i.idInstitucion} value={i.idInstitucion}>{i.nombre}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-2">Curso</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                            value={selectedCursoId}
                            onChange={e => setSelectedCursoId(e.target.value)}
                            disabled={!selectedInstId}
                        >
                            <option value="">Seleccionar Curso...</option>
                            {cursos.map(c => <option key={c.idCurso} value={c.idCurso}>{c.nombre}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Content Actions */}
            {selectedCursoId && (
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 animate-fade-in">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="bg-blue-600 w-2 h-8 rounded-full"></span>
                        Horarios Definidos
                    </h3>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            className="flex-1 md:flex-none bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                            onClick={handlePropagateSchedules}
                            title="Asignar estos horarios a todos los alumnos del curso"
                        >
                            <i className="bi bi-people-fill"></i> Aplicar a Todos los Alumnos
                        </button>
                        <button
                            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                            onClick={() => { setCurrentHorario({}); setIsHorarioModalOpen(true); }}
                        >
                            <span>+</span> Agregar Horario
                        </button>
                    </div>
                </div>
            )}

            {/* Grid */}
            {selectedCursoId ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
                    {horarios.map(h => (
                        <div key={h.idHorario} className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex flex-col relative overflow-hidden group hover:border-slate-500 transition-all">
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 rounded-bl-xl z-10">
                                <button onClick={() => { setCurrentHorario(h); setIsHorarioModalOpen(true); }} className="text-yellow-400 p-2 hover:bg-white/10 rounded">✏️</button>
                                <button onClick={() => handleDeleteHorario(h.idHorario)} className="text-red-400 p-2 hover:bg-white/10 rounded">🗑️</button>
                            </div>

                            <div className="p-5 border-b border-slate-700 relative">
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500"></div>
                                <h4 className="text-xl font-bold text-white mb-1">{h.dia}</h4>
                                <div className="text-3xl font-light text-blue-400">
                                    {h.hora_inicio.slice(0, 5)} <span className="text-gray-600 text-lg">-</span> {h.hora_fin.slice(0, 5)}
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-gray-400 text-sm font-medium uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    {h.materia || 'Sin materia asignada'}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-800/50 flex-grow flex flex-col justify-end">
                                <button
                                    className="w-full text-sm text-gray-400 hover:text-white py-2 rounded hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                                    onClick={() => openAssignmentModal(h.idHorario)}
                                >
                                    <span>👤</span> Asignar Individualmente
                                </button>
                            </div>
                        </div>
                    ))}
                    {horarios.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700">
                            <div className="text-4xl mb-4">📅</div>
                            <p>No hay horarios definidos para este curso.</p>
                            <button
                                onClick={() => { setCurrentHorario({}); setIsHorarioModalOpen(true); }}
                                className="mt-4 text-blue-400 hover:text-blue-300 underline"
                            >
                                Crea el primer horario
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 text-gray-500 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700">
                    <div className="text-6xl mb-6 opacity-30">👈</div>
                    <h3 className="text-xl font-medium text-gray-400">Comienza seleccionando una Institución y un Curso</h3>
                    <p className="text-sm mt-2 opacity-60">Gestiona los horarios y asignaciones de forma centralizada.</p>
                </div>
            )}

            {/* Modal Horario */}
            {isHorarioModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-600 shadow-2xl animate-scale-in">
                        <h3 className="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-2">
                            {currentHorario.idHorario ? 'Editar' : 'Nuevo'} Horario
                        </h3>
                        <form onSubmit={handleSaveHorario}>
                            <div className="space-y-5">
                                <div>
                                    <label className="text-gray-400 text-sm font-medium mb-1 block">Día de la Semana</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        value={currentHorario.dia || 'Lunes'}
                                        onChange={e => setCurrentHorario({ ...currentHorario, dia: e.target.value })}
                                    >
                                        {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-gray-400 text-sm font-medium mb-1 block">Hora Inicio</label>
                                        <input type="time" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            value={currentHorario.hora_inicio || ''}
                                            onChange={e => setCurrentHorario({ ...currentHorario, hora_inicio: e.target.value })} required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-sm font-medium mb-1 block">Hora Fin</label>
                                        <input type="time" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            value={currentHorario.hora_fin || ''}
                                            onChange={e => setCurrentHorario({ ...currentHorario, hora_fin: e.target.value })} required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm font-medium mb-1 block">Materia / Asignatura</label>
                                    <input className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        value={currentHorario.materia || ''}
                                        onChange={e => setCurrentHorario({ ...currentHorario, materia: e.target.value })}
                                        placeholder="Ej: Matemática"
                                    />
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsHorarioModalOpen(false)} className="text-gray-400 px-4 py-2 hover:text-white transition-colors">Cancelar</button>
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 shadow-lg shadow-blue-500/20">Guardar Horario</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Assignment (Legacy) */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-xl w-full max-w-2xl border border-slate-600 flex flex-col max-h-[90vh] shadow-2xl">
                        <div className="p-6 border-b border-slate-700 bg-slate-900/50 rounded-t-xl">
                            <h3 className="text-white font-bold text-lg">Asignar Personas al Horario</h3>
                            <p className="text-gray-400 text-sm mt-1">Selecciona manualmente las personas para este horario específico.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {personas.map(p => {
                                    const isSelected = assignedPersonIds.has(p.idPersona);
                                    return (
                                        <div
                                            key={p.idPersona}
                                            onClick={() => toggleAssignment(p.idPersona)}
                                            className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${isSelected
                                                ? 'bg-blue-600/20 border-blue-500/50 shadow-inner'
                                                : 'bg-slate-900 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-500'
                                                }`}>
                                                {isSelected && <span className="text-white text-xs">✓</span>}
                                            </div>
                                            <span className="text-gray-200">{p.nombre}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-700 bg-slate-900/50 rounded-b-xl flex justify-between items-center">
                            <span className="text-gray-400 text-sm">{assignedPersonIds.size} personas seleccionadas</span>
                            <div className="flex gap-3">
                                <button onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 text-gray-300 hover:text-white transition-colors">Cancelar</button>
                                <button onClick={saveAssignments} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium shadow-lg shadow-green-500/20">
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HorariosTab;
