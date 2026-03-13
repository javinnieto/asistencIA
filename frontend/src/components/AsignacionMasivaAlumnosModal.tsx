import React, { useState, useEffect } from 'react';
import { apiRequest } from '../config/api';
import { useToast } from './Toast';
import './AsignacionMasivaAlumnosModal.css';

interface Person {
  idPersona: number;
  nombre: string;
  apellido: string;
  departamento: string;
  foto: string | null;
}

interface AsignacionMasivaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cursoId: number;
  institucionId: number;
  courseName: string;
  selectedRoleType: number; // Por defecto el ID del rol "Estudiante"
  onSuccess: () => void; // Para recargar los datos si es necesario
}

const AsignacionMasivaAlumnosModal: React.FC<AsignacionMasivaModalProps> = ({
  isOpen, onClose, cursoId, institucionId, courseName, selectedRoleType, onSuccess
}) => {
  const { showToast } = useToast();
  const [personas, setPersonas] = useState<Person[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [initialSelectedIds, setInitialSelectedIds] = useState<Set<number>>(new Set());
  const [personInstitutions, setPersonInstitutions] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPersonas();
      setSearchTerm('');
    }
  }, [isOpen]);

  const fetchPersonas = async () => {
    setLoading(true);
    try {
      // 1. Fetch all people
      const resPersonas = await apiRequest('/personas/?limit=500');
      // 2. Fetch people in this course
      const resInscritos = await apiRequest(`/persona-institucion/?curso=${cursoId}&limit=500`);
      
      if (resPersonas.ok && resInscritos.ok) {
        const dataPersonas = await resPersonas.json();
        const dataInscritos = await resInscritos.json();

        const inscritosList = dataInscritos.results || dataInscritos;
        const initialSet = new Set<number>();
        const piMap: Record<number, number> = {};

        inscritosList.forEach((pi: any) => {
            const pId = typeof pi.persona === 'object' ? pi.persona.idPersona : pi.persona;
            initialSet.add(pId);
            piMap[pId] = pi.idPersonaInstitucion;
        });

        const list = (dataPersonas.results || dataPersonas).map((p: any) => ({
          idPersona: p.idPersona || p.id,
          nombre: p.nombre,
          apellido: p.apellido || '',
          departamento: p.departamento || '',
          foto: p.foto || null
        }));

        list.sort((a: any, b: any) => {
            const aInscrito = initialSet.has(a.idPersona);
            const bInscrito = initialSet.has(b.idPersona);
            if (aInscrito && !bInscrito) return -1;
            if (!aInscrito && bInscrito) return 1;
            return a.nombre.localeCompare(b.nombre);
        });

        setPersonas(list);
        setSelectedIds(new Set(initialSet));
        setInitialSelectedIds(new Set(initialSet));
        setPersonInstitutions(piMap);
      }
    } catch (e) {
      console.error(e);
      showToast('Error cargando la lista de personas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPersonas = personas.filter(p => {
    const fullName = `${p.nombre} ${p.apellido}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || (p.departamento && p.departamento.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const toggleSelection = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPersonas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPersonas.map(p => p.idPersona)));
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    let successCount = 0;
    let failCount = 0;

    const toAdd = Array.from(selectedIds).filter(id => !initialSelectedIds.has(id));
    const toRemove = Array.from(initialSelectedIds).filter(id => !selectedIds.has(id));

    const promises: Promise<any>[] = [];

    // Adds
    toAdd.forEach(personaId => {
      promises.push((async () => {
        try {
          const payload = {
            persona: personaId,
            curso: cursoId,
            tipo: selectedRoleType,
            institucion: institucionId,
            activo: true
          };
          const res = await apiRequest('/persona-institucion/', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          if (res.ok) successCount++;
          else failCount++;
        } catch (e) {
          failCount++;
        }
      })());
    });

    // Removes
    toRemove.forEach(personaId => {
        const piId = personInstitutions[personaId];
        if (piId) {
            promises.push((async () => {
                try {
                    const res = await apiRequest(`/persona-institucion/${piId}/`, {
                        method: 'DELETE'
                    });
                    if (res.ok) successCount++;
                    else failCount++;
                } catch (e) {
                    failCount++;
                }
            })());
        }
    });

    await Promise.all(promises);

    if (failCount === 0 && (toAdd.length > 0 || toRemove.length > 0)) {
      showToast(`Se guardaron exitosamente ${successCount} cambios.`, 'success');
    } else if (successCount > 0) {
      showToast(`Se guardaron ${successCount} cambios. ${failCount} fallaron.`, 'warning');
    } else if (toAdd.length === 0 && toRemove.length === 0) {
      showToast('No se realizaron cambios.', 'info');
    } else {
      showToast('Error al efectuar los cambios.', 'error');
    }

    setSaving(false);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block asignacion-overlay" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        {/* Usamos dark-theme para marchar con el UI general según feedback */}
        <div className="modal-content glass-panel dark-theme border-0 shadow-lg" style={{ borderRadius: '15px' }}>
          <div className="modal-header border-0 pb-0 pt-4 px-4">
            <h5 className="modal-title fw-bold" style={{ color: 'var(--primary-color, #4da6ff)' }}>
              Estudiantes en <span className="text-white">{courseName}</span>
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Cerrar"></button>
          </div>
          <div className="modal-body px-4">
            <p className="text-muted small mb-3">
              Seleccioná los estudiantes que querés inscribir o desmarcalos para darlos de baja.
            </p>

            <div className="asignacion-search-wrapper mb-3">
              <i className="bi bi-search asignacion-search-icon"></i>
              <input
                type="text"
                className="asignacion-search-input"
                placeholder="Buscar por nombre o apellido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="card bg-transparent border border-secondary shadow-sm" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {loading ? (
                <div className="d-flex justify-content-center p-5">
                  <div className="spinner-border text-primary" role="status"></div>
                </div>
              ) : (
                 <table className="table table-hover table-dark table-borderless align-middle mb-0 text-start" style={{ minWidth: '0' }}>
                  <thead className="sticky-top" style={{ backgroundColor: '#212529', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', zIndex: 10 }}>
                    <tr>
                      <th scope="col" style={{ width: '50px' }} className="text-center py-3">
                        <div className="form-check d-flex justify-content-center m-0">
                          <input 
                            className="form-check-input cursor-pointer" 
                            type="checkbox" 
                            checked={filteredPersonas.length > 0 && selectedIds.size === filteredPersonas.length}
                            onChange={toggleSelectAll}
                          />
                        </div>
                      </th>
                      <th scope="col" style={{ width: '60px' }} className="py-3">Foto</th>
                      <th scope="col" className="py-3">Nombre del Estudiante</th>
                      <th scope="col" className="py-3 asignacion-col-cargo">Cargo/Aclaración</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPersonas.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-5 text-muted">No se encontraron personas con ese término.</td>
                      </tr>
                    ) : (
                      filteredPersonas.map(p => {
                        const isInscrito = initialSelectedIds.has(p.idPersona);
                        const isSelected = selectedIds.has(p.idPersona);
                        
                        // Resaltar visualmente si hay un cambio (para dar feedback)
                        const isNewlyAdded = !isInscrito && isSelected;
                        const isNewlyRemoved = isInscrito && !isSelected;
                        
                        let rowBg = 'transparent';
                        if (isNewlyAdded) rowBg = 'rgba(25, 135, 84, 0.1)'; // green fade
                        else if (isNewlyRemoved) rowBg = 'rgba(220, 53, 69, 0.1)'; // red fade
                        else if (isInscrito) rowBg = 'rgba(255, 255, 255, 0.03)'; // subtle highlight for enrolled

                        return (
                          <tr key={p.idPersona} onClick={() => toggleSelection(p.idPersona)} style={{ cursor: 'pointer', backgroundColor: rowBg, transition: 'background-color 0.2s' }}>
                            <td className="text-center border-bottom border-dark">
                              <div className="form-check d-flex justify-content-center m-0">
                                <input 
                                  className="form-check-input" 
                                  type="checkbox" 
                                  checked={isSelected}
                                  readOnly
                                />
                              </div>
                            </td>
                            <td className="border-bottom border-dark text-center">
                              {p.foto ? (
                                <img 
                                  src={p.foto} 
                                  alt={p.nombre} 
                                  className="rounded-circle object-fit-cover shadow-sm border border-secondary"
                                  style={{ width: '40px', height: '40px' }}
                                />
                              ) : (
                                <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold shadow-sm mx-auto" style={{ width: '40px', height: '40px' }}>
                                  {p.nombre.charAt(0)}
                                </div>
                              )}
                            </td>
                            <td className="border-bottom border-dark">
                              <div className="fw-semibold d-flex align-items-center gap-2 text-white">
                                {p.nombre} {p.apellido} 
                                {isInscrito && !isNewlyRemoved && <span className="badge bg-primary text-white" style={{fontSize: '0.65rem'}}>Asignado</span>}
                                {isNewlyRemoved && <span className="badge bg-danger text-white" style={{fontSize: '0.65rem'}}>Baja pendiente</span>}
                                {isNewlyAdded && <span className="badge bg-success text-white" style={{fontSize: '0.65rem'}}>Alta pendiente</span>}
                              </div>
                              <div className="text-muted small" style={{ fontSize: '0.75rem'}}>ID: {p.idPersona}</div>
                            </td>
                            <td className="border-bottom border-dark asignacion-col-cargo">
                              <span className="badge bg-dark text-light border border-secondary">{p.departamento || 'Sin asignar'}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <div className="modal-footer border-0 pt-3 pb-4 px-4 bg-transparent d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              <i className="bi bi-people-fill me-2"></i>
              {selectedIds.size} seleccionados
            </span>
            <div>
                <button type="button" className="btn btn-dark rounded-pill px-4 shadow-sm border border-secondary me-2 hover-opacity" onClick={onClose} disabled={saving}>
                Cancelar
                </button>
                <button 
                type="button" 
                className="btn btn-primary rounded-pill px-4 shadow text-white fw-semibold hover-scale"
                onClick={handleConfirm}
                disabled={saving}
                >
                {saving ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
                ) : (
                    <><i className="bi bi-check2-circle me-2"></i>Guardar Cambios</>
                )}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AsignacionMasivaAlumnosModal;
