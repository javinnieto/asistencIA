import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { apiRequest } from '../../config/api';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';
import AsignacionMasivaAlumnosModal from '../../components/AsignacionMasivaAlumnosModal';
import TablePagination from '../../components/TablePagination';
import ExportButton from '../../components/ExportButton';
import { useModalBackButton } from '../../hooks/useModalBackButton';
import './CursosHorarios.css';


interface Institucion { idInstitucion: number; nombre: string; }
interface Horario {
    idHorario?: number;
    dia: string;
    hora_inicio: string;
    hora_fin: string;
    activo?: boolean;
    semana?: string;
}
interface Curso {
    idCurso: number;
    nombre: string;
    institucion: Institucion;
    activo: boolean;
    fecha_inicio?: string;
    fecha_fin?: string;
    horarios?: Horario[];
    cantidad_alumnos?: number;
    cantidad_horarios?: number;
    institucion_id?: string | number; // For form handling
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const CursosTab: React.FC = () => {
    const { showToast } = useToast();
    const { isAdmin, rol, cursosProfesor } = useAuth();

    const [instituciones, setInstituciones] = useState<Institucion[]>([]);
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [selectedInstId, setSelectedInstId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCurso, setCurrentCurso] = useState<Partial<Curso>>({});
    const [expandedCursoId, setExpandedCursoId] = useState<number | null>(null);

    // Paginación server-side
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // Sorting
    const [sortField, setSortField] = useState<'idCurso'|'nombre'|'institucion'|'cantidad_alumnos'|'activo'>('nombre');
    const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
    
    // Highlight
    const [highlightedHorarioIndices, setHighlightedHorarioIndices] = useState<number[]>([]);

    // Asignacion Masiva Modal State
    const [isAsignacionModalOpen, setIsAsignacionModalOpen] = useState(false);
    const [asignacionCurso, setAsignacionCurso] = useState<{id: number, nombre: string, institucion: number} | null>(null);

    // Horarios management in modal
    const [horarios, setHorarios] = useState<Horario[]>([]);
    const [diasMultiples, setDiasMultiples] = useState<string[]>(['Lunes']);
    const [bloqueDraft, setBloqueDraft] = useState({ hora_inicio: '08:00', hora_fin: '09:00', semana: 'Todas' });

    // Confirm Modal
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);

    const [deleting, setDeleting] = useState(false);

    // Ciclo Lectivo Confirmation Modals
    const [confirmAvanzarOpen, setConfirmAvanzarOpen] = useState(false);
    const [confirmRevertirOpen, setConfirmRevertirOpen] = useState(false);
    const [loadingCiclo, setLoadingCiclo] = useState(false);

    // Advanced options menu state
    const [showAdvancedActions, setShowAdvancedActions] = useState(false);

    const [formError, setFormError] = useState<string | null>(null);
    const [horarioErrors, setHorarioErrors] = useState<Record<number, string>>({});

    // Botón atrás: cierra el modal de nuevo/editar curso
    useModalBackButton(isModalOpen, () => setIsModalOpen(false));

    useEffect(() => {
        apiRequest('/instituciones/').then(async res => {
            if (res.ok) setInstituciones((await res.json()).results || []);
        });
    }, []);

    const fetchCursos = useCallback(async (page = currentPage, perPage = itemsPerPage, search = searchTerm, inst = selectedInstId) => {
        setLoading(true);
        let url = `/cursos/?page=${page}&page_size=${perPage}`;
        if (inst) url += `&institucion=${inst}`;
        if (search) url += `&search=${search}`;
        try {
            const res = await apiRequest(url);
            if (res.ok) {
                const data = await res.json();
                setCursos(data.results || []);
                setTotalRecords(data.count ?? 0);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { 
        fetchCursos(currentPage, itemsPerPage, searchTerm, selectedInstId); 
    }, [fetchCursos, currentPage, itemsPerPage, searchTerm, selectedInstId]);

    const openModal = (curso?: Curso) => {
        if (curso) {
            // Need to map Institucion object to ID for the form or keep it consistent
            // The form expects institucion_id which is not on the Curso interface from api
            // So we might need to cast or just use the ID from the nested object
            setCurrentCurso({ 
                ...curso, 
                institucion: curso.institucion,
                institucion_id: curso.institucion?.idInstitucion
            });
            setHorarios(curso.horarios || []);
        } else {
            setCurrentCurso({ activo: true, institucion: instituciones.find(i => i.idInstitucion === parseInt(selectedInstId)) });
            // Start with a smart default for new course too
            setHorarios([{ dia: 'Lunes', hora_inicio: '08:00', hora_fin: '09:00', activo: true, semana: 'Todas' }]);
        }
        setFormError(null);
        setHorarioErrors({});
        setHighlightedHorarioIndices([]);
        setIsModalOpen(true);
    };

    // Helper function to check if two time ranges overlap
    const timesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
        return start1 < end2 && end1 > start2;
    };

    // Check for overlapping horarios in the same course
    const checkHorarioOverlaps = (horariosList: Horario[]): { hasOverlap: boolean; conflictDetails?: string } => {
        for (let i = 0; i < horariosList.length; i++) {
            for (let j = i + 1; j < horariosList.length; j++) {
                const h1 = horariosList[i];
                const h2 = horariosList[j];

                // Only check if same day
                if (h1.dia === h2.dia) {
                    if (timesOverlap(h1.hora_inicio, h1.hora_fin, h2.hora_inicio, h2.hora_fin)) {
                        return {
                            hasOverlap: true,
                            conflictDetails: `Conflicto en ${h1.dia}: ${h1.hora_inicio}-${h1.hora_fin} se superpone con ${h2.hora_inicio}-${h2.hora_fin}`
                        };
                    }
                }
            }
        }
        return { hasOverlap: false };
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();


        setFormError(null);

        // Validación: al menos 1 horario
        if (!horarios || horarios.length === 0) {
            setFormError('Debe agregar al menos un horario al curso');
            return;
        }

        // Validar que los horarios tengan datos válidos
        const invalidHorario = horarios.find(h => !h.dia || !h.hora_inicio || !h.hora_fin);
        if (invalidHorario) {
            setFormError('Todos los horarios deben tener día, hora de inicio y hora de fin');
            return;
        }

        // Check for overlapping horarios
        const overlapCheck = checkHorarioOverlaps(horarios);
        if (overlapCheck.hasOverlap) {
            setFormError(overlapCheck.conflictDetails || 'Hay horarios que se superponen');
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
                    activo: h.activo !== false,
                    semana: h.semana || 'Todas'
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
                    const res = await apiRequest('/horarios/', {
                        method: 'POST',
                        body: JSON.stringify({
                            curso: currentCurso.idCurso,
                            dia: h.dia,
                            hora_inicio: h.hora_inicio,
                            hora_fin: h.hora_fin,
                            activo: h.activo !== false,
                            semana: h.semana || 'Todas'
                        })
                    });
                    
                    if (!res.ok) {
                        const err = await res.json();
                        showToast('Error agregando horario: ' + (err.detail || JSON.stringify(err)), 'error');
                        return; // Abortamos la creacion si uno falla.
                    }
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

    const getNextAvailableSlot = (currentHorarios: Horario[]): Horario => {
        // Find the last used time slot or default to Mon 8-9
        let baseDay = 'Lunes';
        let baseStart = 8; // 8:00 AM

        if (currentHorarios.length > 0) {
            const lastHorario = currentHorarios[currentHorarios.length - 1];
            baseDay = lastHorario.dia;
            const [lastHour] = lastHorario.hora_fin.split(':').map(Number);
            baseStart = lastHour;
        }

        // Try to find a slot that doesn't overlap
        // We'll try up to 10 slots to avoid infinite loops
        for (let attempt = 0; attempt < 10; attempt++) {
            let nextStart = baseStart + attempt;
            let nextEnd = nextStart + 1;

            // If we go past 22:00, switch to next day
            if (nextEnd > 22) {
                const dayIdx = DIAS_SEMANA.indexOf(baseDay);
                baseDay = DIAS_SEMANA[(dayIdx + 1) % DIAS_SEMANA.length];
                baseStart = 8;
                attempt = -1; // reset loop with new base
                continue;
            }

            const startStr = `${nextStart.toString().padStart(2, '0')}:00`;
            const endStr = `${nextEnd.toString().padStart(2, '0')}:00`;

            // Check if this proposed slot overlaps with ANY existing horario
            let overlaps = false;
            for (const h of currentHorarios) {
                if (h.dia === baseDay) {
                    if (timesOverlap(startStr, endStr, h.hora_inicio, h.hora_fin)) {
                        overlaps = true;
                        break;
                    }
                }
            }

            if (!overlaps) {
                return {
                    dia: baseDay,
                    hora_inicio: startStr,
                    hora_fin: endStr,
                    activo: true,
                    semana: 'Todas'
                };
            }
        }

        // Fallback if no slot found easily
        return { dia: 'Lunes', hora_inicio: '08:00', hora_fin: '09:00', activo: true, semana: 'Todas' };
    };

    const addHorario = () => {
        setFormError(null);
        if (diasMultiples.length === 0) {
            showToast('Seleccione al menos un día', 'error');
            return;
        }
        const updatedHorarios = [...horarios];
        const newIndices: number[] = [];
        
        for (const dia of diasMultiples) {
            newIndices.push(updatedHorarios.length);
            updatedHorarios.push({ ...bloqueDraft, dia, activo: true } as Horario);
        }
        setHorarios(updatedHorarios);
        
        const firstNewIndex = newIndices[0];
        setHighlightedHorarioIndices(newIndices);
        setTimeout(() => {
            const firstEl = document.getElementById(`horario-item-${firstNewIndex}`);
            if (firstEl) {
                firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            newIndices.forEach(idx => {
                const el = document.getElementById(`horario-item-${idx}`);
                if (el) {
                    el.classList.add('highlight-flash');
                    setTimeout(() => el.classList.remove('highlight-flash'), 2000);
                }
            });
        }, 100);
    };

    const removeHorario = (index: number) => {
        if (horarios.length <= 1) {
            showToast('Debe haber al menos un horario', 'error');
            return;
        }
        setHorarios(horarios.filter((_, i) => i !== index));
    };

    const updateHorario = (index: number, field: keyof Horario, value: string | boolean) => {
        const updated = [...horarios];
        const newHorario = { ...updated[index], [field]: value };
        updated[index] = newHorario;
        setHorarios(updated);

        // Real-time validation
        const errors = { ...horarioErrors };
        delete errors[index]; // Clear previous error

        // Check for overlaps against all other horarios
        let hasOverlap = false;
        for (let i = 0; i < updated.length; i++) {
            if (i === index) continue;
            if (updated[i].dia === newHorario.dia) {
                if (timesOverlap(newHorario.hora_inicio, newHorario.hora_fin, updated[i].hora_inicio, updated[i].hora_fin)) {
                    errors[index] = `Coincide con horario ${i + 1} (${updated[i].hora_inicio}-${updated[i].hora_fin})`;
                    hasOverlap = true;
                    break;
                }
            }
        }

        if (!hasOverlap) {
            // Check valid time range
            if (newHorario.hora_inicio >= newHorario.hora_fin) {
                errors[index] = 'Hora fin debe ser mayor a inicio';
            }
        }

        setHorarioErrors(errors);
        if (Object.keys(errors).length > 0) setFormError('Corrija los errores marcados en rojo');
        else setFormError(null);
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

    const handleAvanzarCiclo = async () => {
        setLoadingCiclo(true);
        try {
            const res = await apiRequest('/sistema/avanzar-anio/', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                showToast(`✅ ${data.mensaje} Procesados: ${data.stats.procesados}, Avanzaron: ${data.stats.avanzados}, Egresaron: ${data.stats.egresados}`, 'success');
                fetchCursos();
            } else {
                showToast(`Error: ${data.error || 'No se pudo avanzar el año.'}`, 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error de conexión', 'error');
        } finally {
            setLoadingCiclo(false);
            setConfirmAvanzarOpen(false);
        }
    };

    const handleRevertirCiclo = async () => {
        setLoadingCiclo(true);
        try {
            const res = await apiRequest('/sistema/revertir-anio/', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                showToast(`✅ ${data.mensaje} Restaurados: ${data.stats.restaurados}`, 'success');
                fetchCursos();
            } else {
                showToast(`Error: ${data.error || 'No se pudo revertir el año.'}`, 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error de conexión', 'error');
        } finally {
            setLoadingCiclo(false);
            setConfirmRevertirOpen(false);
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

    // Handle clicking a horario to edit it
    const handleEditHorario = (curso: Curso, horario: Horario, index: number) => {
        setCurrentCurso({ 
            ...curso, 
            institucion_id: curso.institucion?.idInstitucion 
        });
        setHorarios(curso.horarios || []);
        setFormError(null);
        setIsModalOpen(true);
        setHighlightedHorarioIndices([index]);
        
        setTimeout(() => {
            const el = document.getElementById(`horario-item-${index}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('highlight-flash');
                setTimeout(() => el.classList.remove('highlight-flash'), 2000);
            }
        }, 100);
    };

    const handleSort = (field: 'idCurso'|'nombre'|'institucion'|'cantidad_alumnos'|'activo') => {
        if (sortField === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    // Si bien usamos API search, el sorting lo mantenemos en la página actual
    const sortedCursos = [...cursos].sort((a, b) => {
            let valA: any = a[sortField];
            let valB: any = b[sortField];
            if (sortField === 'institucion') {
                valA = a.institucion?.nombre || '';
                valB = b.institucion?.nombre || '';
            } else if (sortField === 'cantidad_alumnos') {
                valA = a.cantidad_alumnos || 0;
                valB = b.cantidad_alumnos || 0;
            } else if (sortField === 'nombre') {
                valA = valA?.toLowerCase() || '';
                valB = valB?.toLowerCase() || '';
            }
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

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
                    {(isAdmin || rol === 'guardia') && (
                        <div className="d-flex gap-2 flex-wrap justify-content-end align-items-center">
                            
                            {/* Opciones Avanzadas Dropdown */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowAdvancedActions(!showAdvancedActions)}
                                    title="Opciones Avanzadas (Mantenimiento Anual)"
                                    style={{ 
                                        background: 'transparent', 
                                        border: 'none', 
                                        color: '#cbd5e1', 
                                        padding: '0.4rem', 
                                        cursor: 'pointer',
                                        fontSize: '1.6rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s ease',
                                        borderRadius: '50%'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.color = '#f8fafc';
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.color = '#cbd5e1';
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <i className="bi bi-gear-fill"></i>
                                </button>
                                
                                {showAdvancedActions && (
                                    <>
                                        {/* Overlay invisible para cerrar al hacer clic afuera */}
                                        <div 
                                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }}
                                            onClick={() => setShowAdvancedActions(false)}
                                        ></div>
                                        
                                        <div 
                                            style={{ 
                                                position: 'absolute', 
                                                right: 0, 
                                                top: '100%', 
                                                marginTop: '8px', 
                                                background: '#1e293b', 
                                                border: '1px solid rgba(148, 163, 184, 0.2)', 
                                                borderRadius: '8px', 
                                                zIndex: 10, 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                padding: '8px', 
                                                gap: '8px', 
                                                width: '240px', 
                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                                            }}
                                        >
                                            <div style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                                Mantenimiento Anual
                                            </div>
                                            <button
                                                onClick={() => { setShowAdvancedActions(false); setConfirmAvanzarOpen(true); }}
                                                className="btn-secondary-action w-100 justify-content-start"
                                                title="Avanzar a todos los estudiantes de ISAE al siguiente año"
                                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: 'none', borderLeft: '3px solid #ef4444' }}
                                            >
                                                <i className="bi bi-calendar2-check-fill w-20px text-center me-2"></i> Cerrar Año Lectivo
                                            </button>
                                            <button
                                                onClick={() => { setShowAdvancedActions(false); setConfirmRevertirOpen(true); }}
                                                className="btn-secondary-action w-100 justify-content-start"
                                                title="Deshacer el último cambio de año lectivo"
                                                style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: 'none', borderLeft: '3px solid #f59e0b' }}
                                            >
                                                <i className="bi bi-arrow-counterclockwise w-20px text-center me-2"></i> Revertir Año
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={() => openModal()}
                                className="btn-primary-action btn-fab-mobile"
                            >
                                <i className="bi bi-plus-lg"></i> <span className="hide-on-mobile-fab">Nuevo Curso</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Bottom Row: Filters */}
                <div className="ch-controls-row nowrap">
                    <div className="search-container" style={{ flex: '1' }}>
                        <i className="bi bi-search search-icon-pos"></i>
                        <input
                            type="text"
                            placeholder="Buscar cursos..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="search-input-styled"
                        />
                    </div>

                    <select
                        className="ch-select"
                        style={{ minWidth: '180px', maxWidth: '300px', cursor: 'pointer', flexShrink: 0 }}
                        value={selectedInstId}
                        onChange={e => { setSelectedInstId(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">Todas las Instituciones</option>
                        {instituciones.map(i => <option key={i.idInstitucion} value={i.idInstitucion}>{i.nombre}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="ch-table-responsive">
                <table className="ch-table mobile-cards-table">
                    <thead className="ch-thead hide-on-mobile">
                        <tr>
                            <th className="ch-th ch-th-expand"></th>
                            <th className="ch-th clickable-th" onClick={() => handleSort('nombre')}>NOMBRE {sortField==='nombre' && (sortDir==='asc'?'↑':'↓')}</th>
                            <th className="ch-th clickable-th" onClick={() => handleSort('institucion')}>INSTITUCIÓN {sortField==='institucion' && (sortDir==='asc'?'↑':'↓')}</th>
                            <th className="ch-th clickable-th" onClick={() => handleSort('cantidad_alumnos')}>ALUMNOS {sortField==='cantidad_alumnos' && (sortDir==='asc'?'↑':'↓')}</th>
                            <th className="ch-th clickable-th" onClick={() => handleSort('activo')}>ESTADO {sortField==='activo' && (sortDir==='asc'?'↑':'↓')}</th>
                            <th className="ch-th">ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedCursos.map(curso => (
                            <React.Fragment key={curso.idCurso}>
                                <tr 
                                    key={curso.idCurso} 
                                    className={`ch-tr clickable ${expandedCursoId === curso.idCurso ? 'expanded-active text-white' : ''}`}
                                    onClick={() => toggleExpand(curso.idCurso)}
                                >
                                    {/* Col 1: Expand chevron (desktop only) */}
                                    <td className="ch-td ch-td-expand hide-on-mobile">
                                        <i className={`bi bi-chevron-${expandedCursoId === curso.idCurso ? 'down' : 'right'}`} style={{ transition: 'transform 0.2s', fontSize: '0.9rem', color: '#94a3b8' }}></i>
                                    </td>

                                    {/* Col 2: Nombre — in mobile, this is the card title */}
                                    <td className="ch-td bold ch-mobile-title">
                                        <div className="d-flex justify-content-between align-items-start w-100">
                                            <span className="text-wrap me-2">{curso.nombre}</span>
                                            {/* Mobile-only badges at top right */}
                                            <div className="hide-on-desktop d-flex flex-column align-items-end gap-3 flex-shrink-0">
                                                <span className="horario-count-badge m-0">
                                                    {curso.cantidad_alumnos || 0} alumno{(curso.cantidad_alumnos || 0) !== 1 ? 's' : ''}
                                                </span>
                                                <span className={`ch-badge ${curso.activo ? 'active' : 'inactive'} m-0`}>
                                                    {curso.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Col 3: Institución */}
                                    <td className="ch-td dimmed ch-mobile-institucion">
                                        <i className="bi bi-building me-2 hide-on-desktop"></i>
                                        {curso.institucion?.nombre}
                                    </td>

                                    {/* Col 4: Alumnos (desktop only, as mobile is above) */}
                                    <td className="ch-td hide-on-mobile">
                                        <div className="d-flex gap-2 align-items-center">
                                            <span className="horario-count-badge">
                                                {curso.cantidad_alumnos || 0} alumno{(curso.cantidad_alumnos || 0) !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Col 5: Estado (desktop only) */}
                                    <td className="ch-td hide-on-mobile">
                                        <span className={`ch-badge ${curso.activo ? 'active' : 'inactive'}`}>
                                            {curso.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>

                                    {/* Col 6: Acciones — also contains mobile expand indicator */}
                                    <td className="ch-td ch-mobile-actions" onClick={(e) => e.stopPropagation()}>
                                        <div className="btn-group gap-2 d-flex action-buttons">
                                            {(isAdmin || rol === 'guardia' || (rol === 'profesor' && cursosProfesor.includes(curso.idCurso))) && (
                                                <>
                                                    <button
                                                        className="btn-icon text-success"
                                                        onClick={() => {
                                                            setAsignacionCurso({ id: curso.idCurso, nombre: curso.nombre, institucion: curso.institucion?.idInstitucion });
                                                            setIsAsignacionModalOpen(true);
                                                        }}
                                                        title="Asignación Masiva"
                                                    >
                                                        <i className="bi bi-people-fill"></i>
                                                    </button>
                                                    <button
                                                        className="btn-icon btn-edit"
                                                        onClick={() => openModal(curso)}
                                                        title="Editar"
                                                    >
                                                        <i className="bi bi-pencil-fill"></i>
                                                    </button>
                                                </>
                                            )}
                                            {(isAdmin || rol === 'guardia') && (
                                                <button
                                                    className="btn-icon btn-delete"
                                                    onClick={() => promptDelete(curso.idCurso)}
                                                    title="Eliminar"
                                                >
                                                    <i className="bi bi-trash-fill"></i>
                                                </button>
                                            )}
                                            {curso.horarios && curso.horarios.length > 0 && (isAdmin || rol === 'guardia' || (rol === 'profesor' && cursosProfesor.includes(curso.idCurso))) && (
                                                <ExportButton 
                                                    iconOnly
                                                    filename={`asistencias_curso_${curso.nombre.replace(/\s+/g, '_').toLowerCase()}`}
                                                    onFetchData={async () => {
                                                        try {
                                                            const [resRecords, resInscritos] = await Promise.all([
                                                                apiRequest(`/asistencias/?horario__curso=${curso.idCurso}&page_size=10000`),
                                                                apiRequest(`/persona-institucion/?curso=${curso.idCurso}&activo=true&limit=5000`)
                                                            ]);

                                                            if (resRecords.ok && resInscritos.ok) {
                                                                const dataRecords = await resRecords.json();
                                                                const dataInscritos = await resInscritos.json();
                                                                
                                                                const allRecords = dataRecords.results || dataRecords || [];
                                                                const inscritos = dataInscritos.results || dataInscritos || [];
                                                                
                                                                const dict: any = {};
                                                                let globP = 0, globA = 0, globT = 0, globTot = 0;

                                                                // Inicializamos dict con todos los alumnos inscritos
                                                                inscritos.forEach((pi: any) => {
                                                                    const p = typeof pi.persona === 'object' ? pi.persona : null;
                                                                    if (p) {
                                                                        dict[p.idPersona || p.id] = { persona: p, presentes: 0, ausentes: 0, tardanzas: 0, total: 0 };
                                                                    }
                                                                });

                                                                // Computar los registros válidos
                                                                allRecords.forEach((r: any) => {
                                                                    const estado = r.estado?.nombre;
                                                                    if (['Presente', 'Ausente', 'Tardanza'].includes(estado)) {
                                                                        const pId = r.persona?.id || r.persona?.idPersona;
                                                                        if (!pId) return;
                                                                        if (!dict[pId]) {
                                                                            dict[pId] = { persona: r.persona, presentes: 0, ausentes: 0, tardanzas: 0, total: 0 };
                                                                        }
                                                                        dict[pId].total += 1;
                                                                        globTot += 1;
                                                                        if (estado === 'Presente') { dict[pId].presentes += 1; globP += 1; }
                                                                        if (estado === 'Ausente') { dict[pId].ausentes += 1; globA += 1; }
                                                                        if (estado === 'Tardanza') { dict[pId].tardanzas += 1; globT += 1; }
                                                                    }
                                                                });

                                                                const records = Object.values(dict).map((s: any) => ({
                                                                    _isAggregated: true,
                                                                    'Alumno': `${s.persona?.nombre || ''} ${s.persona?.apellido || ''}`.trim() || 'Desconocido',
                                                                    'Presentes': s.presentes,
                                                                    'Ausentes': s.ausentes,
                                                                    'Tardanzas': s.tardanzas,
                                                                    'Veces que debió venir': s.total,
                                                                    'Porcentaje Asistencia': s.total > 0 ? `${Math.round(((s.presentes + s.tardanzas) / s.total) * 100)}%` : '0%'
                                                                }));

                                                                records.sort((a, b) => a.Alumno.localeCompare(b.Alumno));

                                                                const summary = [{
                                                                   'Total de alumnos asignados': records.length,
                                                                   'Porcentaje Global de Presentes': globTot > 0 ? `${Math.round((globP / globTot)*100)}%` : '0%',
                                                                   'Porcentaje Global de Ausentes': globTot > 0 ? `${Math.round((globA / globTot)*100)}%` : '0%',
                                                                   'Porcentaje Global de Tardanzas': globTot > 0 ? `${Math.round((globT / globTot)*100)}%` : '0%',
                                                                }];

                                                                return { records: records.length > 0 ? records : [{ _isAggregated: true, 'Aviso': 'Sin alumnos' }], summary };
                                                            }
                                                            return { records: [{ _isAggregated: true, 'Aviso': 'Sin alumnos' }], summary: [] };
                                                        } catch (err) {
                                                            console.error(err);
                                                            return { records: [], summary: [] };
                                                        }
                                                    }}
                                                />
                                            )}

                                        </div>

                                        {/* Mobile-only: "Ver/Ocultar Horarios" indicator — has its own click to bypass stopPropagation */}
                                        <div
                                            className="ch-mobile-expand-indicator hide-on-desktop mt-3 pt-2 border-top border-secondary text-center w-100 small fw-semibold"
                                            style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                                            onClick={(e) => { e.stopPropagation(); toggleExpand(curso.idCurso); }}
                                        >
                                            {expandedCursoId === curso.idCurso ? (
                                                <><i className="bi bi-chevron-up me-1"></i> Ocultar Horarios</>
                                            ) : (
                                                <><i className="bi bi-chevron-down me-1"></i> Ver {curso.cantidad_horarios} Horarios</>
                                            )}
                                        </div>
                                    </td>

                                </tr>

                                {expandedCursoId === curso.idCurso && (
                                    <tr className="expanded-row">
                                        <td colSpan={6} style={{ padding: 0, background: 'rgba(15, 23, 42, 0.8)' }}>
                                            <div className="horarios-expanded-container w-100">
                                                <div style={{ padding: '0px', display: 'flex', justifyContent: 'flex-end', borderBottom: '0px' }}>
                                                </div>
                                                {curso.horarios && curso.horarios.length > 0 ? (
                                                    <div className="horarios-by-day">
                                                        {(() => {
                                                            const canEditCurso = isAdmin || rol === 'guardia' || (rol === 'profesor' && cursosProfesor.includes(curso.idCurso));
                                                            const dayOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                                                            const sortedHorarios = [...curso.horarios].sort((a: any, b: any) => {
                                                                if (a.dia !== b.dia) {
                                                                     return dayOrder.indexOf(a.dia) - dayOrder.indexOf(b.dia);
                                                                }
                                                                return a.hora_inicio.localeCompare(b.hora_inicio);
                                                            });
                                                            return (
                                                                <div className="horarios-compact-grid">
                                                                    {sortedHorarios.map((h: any, idx: number) => {
                                                                        const absIdx = curso.horarios!.indexOf(h);
                                                                        return (
                                                                            <div
                                                                                key={absIdx}
                                                                                className={`horario-slot ${canEditCurso ? 'horario-card-clickable' : ''}`}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    canEditCurso && handleEditHorario(curso, h, absIdx);
                                                                                }}
                                                                                title={canEditCurso ? "Click para editar este horario" : ""}
                                                                                style={{ cursor: canEditCurso ? 'pointer' : 'default' }}
                                                                            >
                                                                                <div className="horario-time-compact">
                                                                                    <strong>{h.dia.slice(0, 3)}.</strong> {h.hora_inicio.slice(0, 5)} - {h.hora_fin.slice(0, 5)} {h.semana && h.semana !== 'Todas' ? `[S. ${h.semana}]` : ''}
                                                                                </div>
                                                                                {canEditCurso && <div className="horario-edit-hint-compact"><i className="bi bi-pencil"></i></div>}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        })()}
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
                        {sortedCursos.length === 0 && !loading && (
                            <tr><td colSpan={6} style={{ padding: 0 }}>
                                <div className="ch-empty-state">
                                    <i className="bi bi-journal-x ch-empty-icon"></i>
                                    No se encontraron cursos.
                                </div>
                            </td></tr>
                        )}
                        {loading && (
                            <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                                <i className="bi bi-arrow-repeat" style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: '8px' }}></i> Cargando cursos...
                            </td></tr>
                        )}
                    </tbody>
                </table>
                {!loading && cursos.length > 0 && (
                    <div className="ch-pagination" style={{ padding: '16px' }}>
                        <TablePagination
                            currentPage={currentPage}
                            totalPages={Math.max(1, Math.ceil(totalRecords / itemsPerPage))}
                            onPageChange={setCurrentPage}
                            itemsPerPage={itemsPerPage}
                            onItemsPerPageChange={(newCount) => {
                                setItemsPerPage(newCount);
                                setCurrentPage(1);
                            }}
                            totalItems={totalRecords}
                        />
                    </div>
                )}
            </div>

            {/* Edit Modal - Rendered via Portal */}
            {isModalOpen && ReactDOM.createPortal(
                <div className="ch-modal-overlay">
                    <div className="ch-modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2 className="ch-modal-title mb-0">{currentCurso.idCurso ? 'Editar' : 'Nuevo'} Curso</h2>
                            <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={() => setIsModalOpen(false)}></button>
                        </div>

                        {formError && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#fca5a5',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <i className="bi bi-exclamation-triangle-fill"></i>
                                {formError}
                            </div>
                        )}

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
                                        disabled={!!currentCurso.idCurso}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {instituciones.map(i => <option key={i.idInstitucion} value={i.idInstitucion}>{i.nombre}</option>)}
                                    </select>
                                </div>

                                <div className="ch-form-group">
                                    <label className="ch-label">Nombre</label>
                                    <input className="ch-input" value={currentCurso.nombre || ''} onChange={e => setCurrentCurso({ ...currentCurso, nombre: e.target.value })} placeholder="Ej: 5to Año 'A'" required />
                                </div>

                                <div className="ch-form-group ch-dates-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label className="ch-label">Inicio</label>
                                        <input type="date" lang="es-AR" className="ch-input" style={{ colorScheme: 'dark' }} value={currentCurso.fecha_inicio || ''} onChange={e => setCurrentCurso({ ...currentCurso, fecha_inicio: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="ch-label">Fin</label>
                                        <input type="date" lang="es-AR" className="ch-input" style={{ colorScheme: 'dark' }} value={currentCurso.fecha_fin || ''} onChange={e => setCurrentCurso({ ...currentCurso, fecha_fin: e.target.value })} />
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
                                <div className="horarios-section-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
                                    <h3 style={{ fontSize: '1rem', color: '#a5b4fc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <i className="bi bi-clock"></i> Horarios <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'normal' }}>(mínimo 1)</span>
                                    </h3>
                                    
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', background: 'rgba(51, 65, 85, 0.4)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.2)', width: '100%' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Inicio</span>
                                            <input type="time" value={bloqueDraft.hora_inicio} onChange={e => setBloqueDraft({...bloqueDraft, hora_inicio: e.target.value})} className="ch-input" style={{ width: '90px', padding: '4px', fontSize: '0.85rem' }} lang="en-GB" />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Fin</span>
                                            <input type="time" value={bloqueDraft.hora_fin} onChange={e => setBloqueDraft({...bloqueDraft, hora_fin: e.target.value})} className="ch-input" style={{ width: '90px', padding: '4px', fontSize: '0.85rem' }} lang="en-GB" />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Semana</span>
                                            <select value={bloqueDraft.semana} onChange={e => setBloqueDraft({...bloqueDraft, semana: e.target.value})} className="ch-input" style={{ minWidth: '90px', padding: '4px', fontSize: '0.85rem' }}>
                                                <option value="Todas">Todas</option>
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                            </select>
                                        </div>
                                        
                                        <div style={{ display: 'flex', alignContent: 'center', gap: '4px', flexWrap: 'wrap', flex: 1, minWidth: 'max-content' }}>
                                            {DIAS_SEMANA.map(d => (
                                                <label key={d} title={d} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '4px 6px', borderRadius: '4px', border: diasMultiples.includes(d) ? '1px solid #a5b4fc' : '1px solid transparent', fontSize: '0.8rem' }}>
                                                    <input type="checkbox" checked={diasMultiples.includes(d)} onChange={(e) => {
                                                        if (e.target.checked) setDiasMultiples([...diasMultiples, d]);
                                                        else setDiasMultiples(diasMultiples.filter(day => day !== d));
                                                    }} style={{ cursor: 'pointer', margin: 0, padding: 0 }} />
                                                    <span style={{ color: diasMultiples.includes(d) ? '#a5b4fc' : '#f1f5f9' }}>{d.slice(0, 3)}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <button type="button" onClick={addHorario} className="btn-add-horario btn-add-horario-inline">
                                            <i className="bi bi-plus-lg"></i> Agregar {diasMultiples.length}
                                        </button>
                                    </div>
                                </div>

                                <div className="horarios-list-modal">
                                    {horarios.map((h, idx) => (
                                        <div key={idx} id={`horario-item-${idx}`} className={`horario-item-modal ${highlightedHorarioIndices.includes(idx) ? 'highlighted-item' : ''}`}>
                                            <div className="horario-item-number">{idx + 1}</div>
                                            <div style={{ flex: 1 }}>
                                                <div className="horario-item-fields">
                                                    <select
                                                        value={h.dia}
                                                        onChange={e => updateHorario(idx, 'dia', e.target.value)}
                                                        className="ch-input"
                                                        style={{ ...(horarioErrors[idx] ? { borderColor: '#ef4444' } : {}), minWidth: '100px' }}
                                                        required
                                                    >
                                                        {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                    <select
                                                        value={h.semana || 'Todas'}
                                                        onChange={e => updateHorario(idx, 'semana', e.target.value)}
                                                        className="ch-input"
                                                        style={{ minWidth: '90px' }}
                                                        required
                                                    >
                                                        <option value="Todas">S. Todas</option>
                                                        <option value="A">Semana A</option>
                                                        <option value="B">Semana B</option>
                                                    </select>
                                                    <input
                                                        type="time"
                                                        value={h.hora_inicio}
                                                        onChange={e => updateHorario(idx, 'hora_inicio', e.target.value)}
                                                        className="ch-input"
                                                        lang="en-GB"
                                                        style={{ colorScheme: 'dark', ...(horarioErrors[idx] ? { borderColor: '#ef4444' } : {}) }}
                                                        required
                                                    />
                                                    <input
                                                        type="time"
                                                        value={h.hora_fin}
                                                        onChange={e => updateHorario(idx, 'hora_fin', e.target.value)}
                                                        className="ch-input"
                                                        lang="en-GB"
                                                        style={{ colorScheme: 'dark', ...(horarioErrors[idx] ? { borderColor: '#ef4444' } : {}) }}
                                                        required
                                                    />
                                                    {horarioErrors[idx] && (
                                                        <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <i className="bi bi-exclamation-circle"></i> {horarioErrors[idx]}
                                                        </div>
                                                    )}
                                                </div>
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

            {/* Confirm modals for actions */}
            <ConfirmModal
                isOpen={confirmOpen}
                title="Eliminar Curso"
                message="¿Estás seguro de que deseas eliminar este curso? Se perderán todos sus horarios asociados."
                onConfirm={handleConfirmDelete}
                onClose={() => setConfirmOpen(false)}
                isLoading={deleting}
            />

            <ConfirmModal
                isOpen={confirmAvanzarOpen}
                title="Cerrar Año Lectivo (Alerta Crítica)"
                message="¿Estás completamente seguro de que deseas avanzar a TODO el colegio ISAE al siguiente grado/año? Esto cambiará de curso a todos los estudiantes de manera masiva. Úsalo solo cuando haya terminado el ciclo lectivo y las mesas de exámenes."
                onConfirm={handleAvanzarCiclo}
                onClose={() => setConfirmAvanzarOpen(false)}
                isLoading={loadingCiclo}
                confirmText="SÍ, AVANZAR A TODOS"
                type="danger"
                requireDoubleConfirmText="CERRAR CICLO"
            />

            <ConfirmModal
                isOpen={confirmRevertirOpen}
                title="Revertir Cambio de Año"
                message="¿Te mandaste un moco? Esto restaurará a los estudiantes a sus cursos EXACTOS antes del último 'Cierre de Año Lectivo' que hayas hecho. ¿Continuar?"
                onConfirm={handleRevertirCiclo}
                onClose={() => setConfirmRevertirOpen(false)}
                isLoading={loadingCiclo}
                confirmText="SÍ, DESHACER"
                type="warning"
                requireDoubleConfirmText="R"
            />

            {/* Assignment Modal */}
            {isAsignacionModalOpen && asignacionCurso && (
                <AsignacionMasivaAlumnosModal
                    isOpen={isAsignacionModalOpen}
                    onClose={() => {
                        setIsAsignacionModalOpen(false);
                        setAsignacionCurso(null);
                    }}
                    cursoId={asignacionCurso.id}
                    institucionId={asignacionCurso.institucion}
                    courseName={asignacionCurso.nombre}
                    selectedRoleType={1} // Asumimos que 1 es Estudiante, tal vez requiera ajustes si es dinámico.
                    onSuccess={() => {
                        fetchCursos();
                    }}
                />
            )}
        </div>
    );
};

export default CursosTab;
