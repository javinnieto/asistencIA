import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { apiRequest } from '../config/api';
import { useToast } from './Toast';
import { useModalBackButton } from '../hooks/useModalBackButton';
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
  selectedRoleType: number;
  onSuccess: () => void;
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
  const [activeTab, setActiveTab] = useState<'todos' | 'asignados'>('todos');

  // Botón atrás del navegador/sistema cierra el modal
  useModalBackButton(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchPersonas();
      setSearchTerm('');
      setActiveTab('todos');
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const fetchPersonas = async () => {
    setLoading(true);
    try {
      const [resPersonas, resInscritos] = await Promise.all([
        apiRequest('/personas/?limit=500'),
        apiRequest(`/persona-institucion/?curso=${cursoId}&limit=500`)
      ]);
      
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
      showToast('Error cargando la lista de personas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPersonas = useMemo(() => {
    let list = activeTab === 'asignados'
      ? personas.filter(p => selectedIds.has(p.idPersona))
      : personas;
    
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
        p.departamento?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [personas, selectedIds, searchTerm, activeTab]);

  const toggleSelection = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (filteredPersonas.every(p => selectedIds.has(p.idPersona))) {
      const next = new Set(selectedIds);
      filteredPersonas.forEach(p => next.delete(p.idPersona));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filteredPersonas.forEach(p => next.add(p.idPersona));
      setSelectedIds(next);
    }
  };

  const pendingToAdd = useMemo(() =>
    Array.from(selectedIds).filter(id => !initialSelectedIds.has(id)),
    [selectedIds, initialSelectedIds]);

  const pendingToRemove = useMemo(() =>
    Array.from(initialSelectedIds).filter(id => !selectedIds.has(id)),
    [selectedIds, initialSelectedIds]);

  const hasChanges = pendingToAdd.length > 0 || pendingToRemove.length > 0;

  const handleSave = async () => {
    setSaving(true);
    let successCount = 0;
    let failCount = 0;
    const promises: Promise<any>[] = [];

    pendingToAdd.forEach(personaId => {
      promises.push((async () => {
        try {
          const res = await apiRequest('/persona-institucion/', {
            method: 'POST',
            body: JSON.stringify({ persona: personaId, curso: cursoId, tipo: selectedRoleType, institucion: institucionId, activo: true })
          });
          if (res.ok) successCount++; else failCount++;
        } catch { failCount++; }
      })());
    });

    pendingToRemove.forEach(personaId => {
      const piId = personInstitutions[personaId];
      if (piId) {
        promises.push((async () => {
          try {
            const res = await apiRequest(`/persona-institucion/${piId}/`, { method: 'DELETE' });
            if (res.ok) successCount++; else failCount++;
          } catch { failCount++; }
        })());
      }
    });

    await Promise.all(promises);

    if (!hasChanges) {
      showToast('No se realizaron cambios.', 'info');
    } else if (failCount === 0) {
      showToast(`${successCount} cambios guardados exitosamente.`, 'success');
    } else if (successCount > 0) {
      showToast(`${successCount} cambios guardados. ${failCount} fallaron.`, 'warning');
    } else {
      showToast('Error al efectuar los cambios.', 'error');
    }

    setSaving(false);
    onSuccess();
    onClose();
  };

  const getInitials = (nombre: string, apellido: string) =>
    `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();

  if (!isOpen) return null;

  const allFiltered = filteredPersonas.every(p => selectedIds.has(p.idPersona));
  const someFiltered = filteredPersonas.some(p => selectedIds.has(p.idPersona)) && !allFiltered;

  const modal = (
    <div 
      className="am-overlay" 
      onMouseDown={(e) => { if(e.target === e.currentTarget) onClose(); }}
    >
      <div className="am-sheet">

        {/* ── HEADER ── */}
        <div className="am-header">
          <div className="am-header-icon">
            <i className="bi bi-people-fill"></i>
          </div>
          <div className="am-header-text">
            <h2 className="am-title">Gestión de Estudiantes</h2>
            <p className="am-subtitle">
              <span className="am-course-name">{courseName}</span>
              <span className="am-dot">·</span>
              Asigná o remové alumnos del curso
            </p>
          </div>
          <button className="am-close-btn" onClick={onClose} aria-label="Cerrar">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* ── STATS BAR ── */}
        <div className="am-stats">
          <div className="am-stat am-stat-total">
            <span className="am-stat-num">{personas.length}</span>
            <span className="am-stat-lbl">Total personas</span>
          </div>
          <div className="am-stat-divider"></div>
          <div className="am-stat am-stat-assigned">
            <span className="am-stat-num">{initialSelectedIds.size}</span>
            <span className="am-stat-lbl">En el curso</span>
          </div>
          <div className="am-stat-divider"></div>
          {pendingToAdd.length > 0 && (
            <>
              <div className="am-stat am-stat-add">
                <span className="am-stat-num">+{pendingToAdd.length}</span>
                <span className="am-stat-lbl">Por agregar</span>
              </div>
              <div className="am-stat-divider"></div>
            </>
          )}
          {pendingToRemove.length > 0 && (
            <>
              <div className="am-stat am-stat-remove">
                <span className="am-stat-num">-{pendingToRemove.length}</span>
                <span className="am-stat-lbl">Por quitar</span>
              </div>
              <div className="am-stat-divider"></div>
            </>
          )}
          <div className="am-stat am-stat-selected">
            <span className="am-stat-num">{selectedIds.size}</span>
            <span className="am-stat-lbl">Seleccionados</span>
          </div>
        </div>

        {/* ── TOOLBAR ── */}
        <div className="am-toolbar">
          <div className="am-search-wrap">
            <i className="bi bi-search am-search-icon"></i>
            <input
              type="text"
              className="am-search"
              placeholder="Buscar por nombre o cargo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="am-search-clear" onClick={() => setSearchTerm('')}>
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
          <div className="am-tabs">
            <button
              className={`am-tab ${activeTab === 'todos' ? 'active' : ''}`}
              onClick={() => setActiveTab('todos')}
            >
              Todos
            </button>
            <button
              className={`am-tab ${activeTab === 'asignados' ? 'active' : ''}`}
              onClick={() => setActiveTab('asignados')}
            >
              Asignados <span className="am-tab-badge">{selectedIds.size}</span>
            </button>
          </div>
        </div>

        {/* ── LIST ── */}
        <div className="am-list-container">
          {loading ? (
            <div className="am-loading">
              <div className="am-spinner"></div>
              <span>Cargando personas...</span>
            </div>
          ) : filteredPersonas.length === 0 ? (
            <div className="am-empty">
              <i className="bi bi-person-slash"></i>
              <p>{searchTerm ? 'No hay resultados para tu búsqueda.' : 'No hay personas en esta vista.'}</p>
            </div>
          ) : (
            <>
              {/* Select-all header */}
              <div className="am-list-header">
                <label className="am-checkbox-wrap am-select-all-wrap">
                  <input
                    type="checkbox"
                    className="am-checkbox"
                    checked={allFiltered && filteredPersonas.length > 0}
                    ref={el => { if (el) el.indeterminate = someFiltered; }}
                    onChange={toggleSelectAll}
                  />
                  <span className="am-checkbox-custom"></span>
                </label>
                <span className="am-list-header-text">
                  {filteredPersonas.length} persona{filteredPersonas.length !== 1 ? 's' : ''}
                </span>
              </div>

              <ul className="am-list">
                {filteredPersonas.map(p => {
                  const isSelected = selectedIds.has(p.idPersona);
                  const wasInCourse = initialSelectedIds.has(p.idPersona);
                  const isNewlyAdded = !wasInCourse && isSelected;
                  const isNewlyRemoved = wasInCourse && !isSelected;

                  return (
                    <li
                      key={p.idPersona}
                      className={`am-person ${isSelected ? 'selected' : ''} ${isNewlyAdded ? 'newly-added' : ''} ${isNewlyRemoved ? 'newly-removed' : ''}`}
                      onClick={() => toggleSelection(p.idPersona)}
                    >
                      <label className="am-checkbox-wrap" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="am-checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(p.idPersona)}
                        />
                        <span className="am-checkbox-custom"></span>
                      </label>

                      <div className="am-avatar-wrap">
                        {p.foto ? (
                          <img src={p.foto} alt={p.nombre} className="am-avatar-img" />
                        ) : (
                          <div className="am-avatar-initials">
                            {getInitials(p.nombre, p.apellido)}
                          </div>
                        )}
                        {wasInCourse && !isNewlyRemoved && (
                          <span className="am-avatar-dot am-dot-in"></span>
                        )}
                      </div>

                      <div className="am-person-info">
                        <span className="am-person-name">{p.nombre} {p.apellido}</span>
                        {p.departamento && (
                          <span className="am-person-dept">
                            <i className="bi bi-briefcase me-1"></i>{p.departamento}
                          </span>
                        )}
                      </div>

                      <div className="am-person-status">
                        {isNewlyAdded && <span className="am-badge am-badge-add"><i className="bi bi-plus-circle"></i> Alta</span>}
                        {isNewlyRemoved && <span className="am-badge am-badge-remove"><i className="bi bi-dash-circle"></i> Baja</span>}
                        {wasInCourse && !isNewlyRemoved && !isNewlyAdded && (
                          <span className="am-badge am-badge-current"><i className="bi bi-check-circle"></i> Asignado</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="am-footer">
          {hasChanges && (
            <div className="am-changes-summary">
              {pendingToAdd.length > 0 && (
                <span className="am-change-pill am-pill-add">
                  <i className="bi bi-person-plus-fill"></i> {pendingToAdd.length} alta{pendingToAdd.length > 1 ? 's' : ''}
                </span>
              )}
              {pendingToRemove.length > 0 && (
                <span className="am-change-pill am-pill-remove">
                  <i className="bi bi-person-dash-fill"></i> {pendingToRemove.length} baja{pendingToRemove.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
          <div className="am-footer-actions">
            <button className="am-btn am-btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button
              className={`am-btn am-btn-primary ${!hasChanges ? 'am-btn-muted' : ''}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <><span className="am-spinner-sm"></span> Guardando...</>
              ) : (
                <><i className="bi bi-check2-circle"></i> Guardar Cambios</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};

export default AsignacionMasivaAlumnosModal;
