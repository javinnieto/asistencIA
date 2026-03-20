import React, { useState, useEffect } from 'react';
import { apiRequest } from '../config/api';
import { useToast } from './Toast';

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

    // Modal Asignacion
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedSchedulerId, setSelectedSchedulerId] = useState<number | null>(null);
    const [personas, setPersonas] = useState<Persona[]>([]); // Personas de la institución/curso
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

    // Save Horario
    const handleSaveHorario = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isEdit = !!currentHorario.idHorario;
            const url = isEdit ? `/horarios/${currentHorario.idHorario}/` : '/horarios/';
            const method = isEdit ? 'PUT' : 'POST';

            const payload = { ...currentHorario, curso: selectedCursoId }; // Force current couse

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

    // --- Assignment Logic ---
    const openAssignmentModal = async (horarioId: number) => {
        setSelectedSchedulerId(horarioId);
        setIsAssignModalOpen(true);
        setPersonas([]);
        setAssignedPersonIds(new Set());

        // 1. Fetch personas valid for this context (simple approach: fetch all personas, filter client side or backend)
        // ideally backend should support filtering personas by curso/institution logic.
        // For now, let's fetch all personas and showing them.
        // Better: filter by 'activo=true'.
        try {
            const res = await apiRequest('/personas/?activo=true');
            if (res.ok) {
                const allPersonas = (await res.json()).results as Persona[];

                // 2. Identify which are already assigned to THIS horario
                // The `horarios` field in Persona is M2M.
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

    const saveAssignments = async () => {
        if (!selectedSchedulerId) return;
        // We need to update each persona... this is inefficient if we have many changes.
        // But our backend API is per-persona updating.
        // Ideally we'd have an endpoint `/horarios/{id}/assign_personas/` bulk.
        // Since we don't, we'll traverse the CHANGED ones or just all (careful).

        // Let's implement a smarter way:
        // We have the ORIGINAL assigned set (we should have stored it).
        // Iterate all personas.
        // If (in newSet AND NOT in oldSet) -> ADD schedule
        // If (NOT in newSet AND in oldSet) -> REMOVE schedule

        // For MVP/Proto: We will just save relevant ones.
        // Wait, `PersonaViewSet` update accepts `horarios` list.
        // If we update a persona, we reset their schedules list to what we send.
        // So we need to be careful not to delete their OTHER schedules for other courses.
        // This suggests the "Persona -> update schedules" approach is risky from this view.
        // WE NEED A CUSTOM ACTION on backend or be very careful.

        // BETTER APPROACH given current backend:
        // Identify which personas changed status for THIS schedule.
        // For each changed persona:
        // 1. Fetch their current schedules.
        // 2. Add or Remove this `selectedSchedulerId` from their list.
        // 3. PUT /personas/{idString} with `horarios: [new list ids]`

        showToast('Guardando asignaciones...', 'info');

        try {
            const res = await apiRequest('/personas/?activo=true'); // Re-fetch to be safe/clean
            const allPersonas = (await res.json()).results as Persona[];

            const promises = allPersonas.map(async (p) => {
                const wasAssigned = p.horarios?.some(h => h.idHorario === selectedSchedulerId);
                const isAssignedNow = assignedPersonIds.has(p.idPersona);

                if (wasAssigned !== isAssignedNow) {
                    // Change detected
                    let currentHorarioIds = p.horarios?.map(h => h.idHorario) || [];

                    if (isAssignedNow) {
                        currentHorarioIds.push(selectedSchedulerId);
                    } else {
                        currentHorarioIds = currentHorarioIds.filter(hid => hid !== selectedSchedulerId);
                    }

                    // Send update
                    // NOTE: We must send other required fields if the serializer demands them?
                    // PersonaCreateSerializer (used for update) only requires basics. 
                    // We can potentially PATCH.
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
            <div className="bg-slate-800 p-4 rounded-lg mb-6 border border-slate-700 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                    <label className="text-xs text-gray-400 block mb-1">Institución</label>
                    <select
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                        value={selectedInstId}
                        onChange={e => { setSelectedInstId(e.target.value); setSelectedCursoId(''); }}
                    >
                        <option value="">Seleccionar...</option>
                        {instituciones.map(i => <option key={i.idInstitucion} value={i.idInstitucion}>{i.nombre}</option>)}
                    </select>
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs text-gray-400 block mb-1">Curso</label>
                    <select
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                        value={selectedCursoId}
                        onChange={e => setSelectedCursoId(e.target.value)}
                        disabled={!selectedInstId}
                    >
                        <option value="">Seleccionar...</option>
                        {cursos.map(c => <option key={c.idCurso} value={c.idCurso}>{c.nombre}</option>)}
                    </select>
                </div>
                <div className="flex-none self-end">
                    <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!selectedCursoId}
                        onClick={() => { setCurrentHorario({}); setIsHorarioModalOpen(true); }}
                    >
                        + Agregar Horario
                    </button>
                </div>
            </div>

            {/* Grid */}
            {selectedCursoId ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {horarios.map(h => (
                        <div key={h.idHorario} className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex flex-col relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 rounded-bl-xl`}>
                                <button onClick={() => { setCurrentHorario(h); setIsHorarioModalOpen(true); }} className="text-yellow-400 mx-1">✏️</button>
                                <button onClick={() => handleDeleteHorario(h.idHorario)} className="text-red-400 mx-1">🗑️</button>
                            </div>
                            <div className="p-5 border-b border-slate-700">
                                <h4 className="text-lg font-bold text-white">{h.dia}</h4>
                                <div className="text-2xl font-light text-blue-400 mt-1">
                                    {h.hora_inicio.slice(0, 5)} - {h.hora_fin.slice(0, 5)}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-800/50 flex-grow flex flex-col justify-end">
                                <button
                                    className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 py-2 rounded border border-indigo-500/30 transition-colors flex items-center justify-center gap-2"
                                    onClick={() => openAssignmentModal(h.idHorario)}
                                >
                                    <i className="bi bi-people-fill"></i> Asignar Personas
                                </button>
                            </div>
                        </div>
                    ))}
                    {horarios.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            No hay horarios definidos para este curso.
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-500 bg-slate-800/30 rounded-lg border-2 border-dashed border-slate-700">
                    👈 Selecciona una Institución y un Curso para gestionar los horarios
                </div>
            )}

            {/* Modal Horario */}
            {isHorarioModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-600">
                        <h3 className="text-white font-bold text-lg mb-4">{currentHorario.idHorario ? 'Editar' : 'Nuevo'} Horario</h3>
                        <form onSubmit={handleSaveHorario}>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-gray-400 text-sm">Día</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                                        value={currentHorario.dia || 'Lunes'}
                                        onChange={e => setCurrentHorario({ ...currentHorario, dia: e.target.value })}
                                    >
                                        {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-gray-400 text-sm">Inicio</label>
                                        <input type="time" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                                            value={currentHorario.hora_inicio || ''}
                                            onChange={e => setCurrentHorario({ ...currentHorario, hora_inicio: e.target.value })} required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-sm">Fin</label>
                                        <input type="time" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                                            value={currentHorario.hora_fin || ''}
                                            onChange={e => setCurrentHorario({ ...currentHorario, hora_fin: e.target.value })} required
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsHorarioModalOpen(false)} className="text-gray-300 px-4 py-2 hover:text-white">Cancelar</button>
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Assignment */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-lg p-0 w-full max-w-2xl border border-slate-600 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-700">
                            <h3 className="text-white font-bold text-lg">Asignar Personas al Horario</h3>
                            <p className="text-gray-400 text-sm mt-1">Selecciona las personas que asisten a este horario.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {personas.map(p => {
                                    const isSelected = assignedPersonIds.has(p.idPersona);
                                    return (
                                        <div
                                            key={p.idPersona}
                                            onClick={() => toggleAssignment(p.idPersona)}
                                            className={`p-3 rounded border cursor-pointer flex items-center gap-3 transition-colors ${isSelected
                                                    ? 'bg-blue-600/20 border-blue-500/50'
                                                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-500'
                                                }`}>
                                                {isSelected && <span className="text-white text-xs">✓</span>}
                                            </div>
                                            <span className="text-gray-200">{p.nombre}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-700 bg-slate-900/50 rounded-b-lg flex justify-between items-center">
                            <span className="text-gray-400 text-sm">{assignedPersonIds.size} personas seleccionadas</span>
                            <div className="flex gap-3">
                                <button onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 text-gray-300 hover:text-white">Cancelar</button>
                                <button onClick={saveAssignments} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-medium shadow-lg">
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
