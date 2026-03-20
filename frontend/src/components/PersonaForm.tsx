import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { apiRequest } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { getLocalDateString } from '../utils/dateUtils';
import { useModalBackButton } from '../hooks/useModalBackButton';
import './PersonaForm.css';

interface Person {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  telefono_emergencia?: string;
  departamento: string;
  cargo: string;
  fechaIngreso: string;
  estado: 'activo' | 'inactivo';
  foto?: string;
  requiere_salida?: boolean;
  roles?: any[];
}

interface PersonaFormProps {
  person?: Person;
  isOpen: boolean;
  onClose: () => void;
  onSave: (person: Omit<Person, 'id'>) => void;
  mode: 'add' | 'edit';
}

const PersonaForm: React.FC<PersonaFormProps> = ({
  person,
  isOpen,
  onClose,
  onSave,
  mode
}) => {
  const { rol } = useAuth();

  // Botón atrás del navegador/sistema cierra el modal
  useModalBackButton(isOpen, onClose);

  const [formData, setFormData] = useState<Omit<Person, 'id'>>({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    telefono_emergencia: '',
    departamento: '',
    cargo: '',
    fechaIngreso: getLocalDateString(),
    estado: 'activo',
    foto: '',
    roles: [],
    requiere_salida: true
  });

  const [institutions, setInstitutions] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [instRes, typesRes, coursesRes] = await Promise.all([
          apiRequest('/instituciones/'),
          apiRequest('/tipos-persona/'),
          apiRequest('/cursos/')
        ]);
        if (instRes.ok) setInstitutions((await instRes.json()).results || []);
        if (typesRes.ok) setTypes((await typesRes.json()).results || []);
        if (coursesRes.ok) setCourses((await coursesRes.json()).results || []);
      } catch (e) {
        console.error("Error fetching form data:", e);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (person && mode === 'edit') {
      setFormData({
        nombre: person.nombre,
        apellido: person.apellido,
        email: person.email,
        telefono: person.telefono,
        telefono_emergencia: person.telefono_emergencia || '',
        departamento: person.departamento,
        cargo: person.cargo,
        fechaIngreso: person.fechaIngreso,
        estado: person.estado,
        foto: person.foto || '',
        roles: person.roles || [],
        requiere_salida: person.requiere_salida || false
      });
    }
  }, [person, mode]);

  const filteredCourses = useMemo(() => {
    if (!selectedInstId) return [];
    return courses.filter(c => c.institucion?.idInstitucion?.toString() === selectedInstId && c.activo);
  }, [selectedInstId, courses]);

  const handleAddRole = () => {
    if (!selectedInstId || !selectedTypeId) return;
    const inst = institutions.find(i => i.idInstitucion?.toString() === selectedInstId);
    const tipo = types.find(t => t.idTipoPersona?.toString() === selectedTypeId);
    const course = selectedCourseId ? courses.find(c => c.idCurso?.toString() === selectedCourseId) : null;
    setFormData(prev => ({ ...prev, roles: [...(prev.roles || []), { institucion: inst, tipo: tipo, curso: course, horarios_personalizados: [], tempId: Date.now() }] }));
    setSelectedCourseId('');
    // No reseteamos el tipo e inst por defecto para que sea más fácil cargar varios
    // Limpiar errores al agregar rol válido
    if (errors.roles) {
      setErrors(prev => ({ ...prev, roles: '' }));
    }
  };

  const handleRemoveRole = (index: number) => {
    setFormData(prev => ({ ...prev, roles: prev.roles?.filter((_, i) => i !== index) }));
  };

  const handleAddCustomSchedule = (roleIdx: number) => {
    setFormData((prev: Omit<Person, 'id'>) => {
      const newRoles = (prev.roles || []).map((role: any, i: number) => {
        if (i !== roleIdx) return role;
        return {
          ...role,
          horarios_personalizados: [
            ...(role.horarios_personalizados || []),
            { dia: 'Lunes', hora_inicio: '08:00', hora_fin: '17:00', semana: 'Todas' }
          ]
        };
      });
      return { ...prev, roles: newRoles };
    });
  };

  const handleUpdateCustomSchedule = (roleIdx: number, scheduleIdx: number, field: string, value: string) => {
    setFormData((prev: Omit<Person, 'id'>) => {
      const newRoles = [...(prev.roles || [])];
      newRoles[roleIdx].horarios_personalizados[scheduleIdx] = {
        ...newRoles[roleIdx].horarios_personalizados[scheduleIdx],
        [field]: value
      };
      return { ...prev, roles: newRoles };
    });
  };

  const handleRemoveCustomSchedule = (roleIdx: number, scheduleIdx: number) => {
    setFormData((prev: Omit<Person, 'id'>) => {
      const newRoles = [...(prev.roles || [])];
      newRoles[roleIdx].horarios_personalizados = newRoles[roleIdx].horarios_personalizados.filter((_: any, i: number) => i !== scheduleIdx);
      return { ...prev, roles: newRoles };
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.nombre?.trim()) newErrors.nombre = 'Nombre requerido';
    // El apellido ya no es obligatorio

    // El curso ya no es obligatorio


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setFormData(prev => ({ ...prev, foto: event.target?.result as string }));
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="persona-form-overlay" 
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="persona-form-modal">
        <div className="persona-form-header">
          <h2>{mode === 'add' ? 'Agregar Persona' : 'Editar Persona'}</h2>
          <button type="button" className="close-button" onClick={onClose}>✕</button>
        </div>
        <div className="persona-form-content">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="photo-section">
                <div className="photo-preview">
                  {formData.foto ? <img src={formData.foto} alt="Foto" /> : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30, 41, 59, 0.8)', fontSize: '32px' }}>📷</div>
                  )}
                </div>
                <div className="photo-upload">
                  <label className="photo-upload-label">
                    📸 {formData.foto ? 'Cambiar Foto' : 'Subir Foto'}
                    <input type="file" accept="image/*" onChange={handleImageUpload} />
                  </label>
                  {formData.foto && <button type="button" className="btn-cancel-photo" onClick={() => setFormData(prev => ({ ...prev, foto: '' }))}>❌ Eliminar</button>}
                </div>
              </div>
              <div className="pf-grid-2col">
                <div className="form-group">
                  <label>👤 Nombre</label>
                  <input className={`form-input ${errors.nombre ? 'error' : ''}`} value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} placeholder="Ej: Juan" />
                  {errors.nombre && <span className="error-message">{errors.nombre}</span>}
                </div>
                <div className="form-group">
                  <label>👤 Apellido</label>
                  <input className={`form-input ${errors.apellido ? 'error' : ''}`} value={formData.apellido} onChange={e => setFormData({ ...formData, apellido: e.target.value })} placeholder="Ej: Pérez" />
                  {errors.apellido && <span className="error-message">{errors.apellido}</span>}
                </div>
              </div>
              <div className="pf-grid-3col">
                <div className="form-group">
                  <label>📧 Email</label>
                  <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="ejemplo@email.com" />
                </div>
                <div className="form-group">
                  <label>📞 Teléfono</label>
                  <input className="form-input" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} placeholder="+1 234 567 8900" />
                </div>
                <div className="form-group">
                  <label>🚨 Tel. Emergencia</label>
                  <input className="form-input" value={formData.telefono_emergencia} onChange={e => setFormData({ ...formData, telefono_emergencia: e.target.value })} placeholder="Contacto de emergencia" />
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <select
                    className="form-input"
                    value={formData.estado}
                    onChange={e => setFormData({ ...formData, estado: e.target.value as 'activo' | 'inactivo' })}
                  >
                    <option value="activo">✅ Activo</option>
                    <option value="inactivo">🚫 Inactivo</option>
                  </select>
                  {formData.estado === 'inactivo' && (
                    <div style={{ marginTop: '6px', padding: '8px 10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', fontSize: '0.78rem', color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="bi bi-exclamation-triangle-fill"></i>
                      La persona será puesta en <strong>Blacklist</strong> (se bloqueará el reconocimiento) y no podrá registrar asistencias.
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '24px' }}>
                    <input 
                      type="checkbox" 
                      className="form-checkbox" 
                      checked={formData.requiere_salida || false} 
                      onChange={e => setFormData({ ...formData, requiere_salida: e.target.checked })} 
                      style={{ width: '18px', height: '18px' }}
                    />
                    Requiere marcar salida
                  </label>
                </div>
              </div>
              <div className="roles-section">
                <div className="roles-section-header">🏢 Roles y Cursos</div>
                <div className="role-input-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Institución</label>
                    <select className="form-select" value={selectedInstId} onChange={(e: any) => { setSelectedInstId(e.target.value); setSelectedCourseId(''); }}>
                      <option value="">Seleccionar...</option>
                      {institutions.map((i: any) => <option key={i.idInstitucion} value={i.idInstitucion}>{i.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Tipo</label>
                    <select className="form-select" value={selectedTypeId} onChange={e => setSelectedTypeId(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {types.filter(t => t.activo).map(t => <option key={t.idTipoPersona} value={t.idTipoPersona}>{t.nombre}</option>)}
                    </select>
                  </div>
                  {/* Campo Curso - Opcional */}
                  <div className="form-group" style={{ flex: 1 }}>
                      <label>Curso <span style={{ color: '#888', fontWeight: 'normal' }}>(Opcional)</span></label>
                      <select
                        className="form-select"
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                      >
                        <option value="">Ninguno (Horario propio)...</option>
                        {filteredCourses.map(curso => (
                          <option key={curso.idCurso} value={curso.idCurso?.toString()}>
                            {curso.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  <div style={{ alignSelf: 'flex-end', paddingBottom: '2px' }}>
                    <button type="button" className="btn-add-role" onClick={handleAddRole} disabled={!selectedInstId || !selectedTypeId}>➕</button>
                  </div>
                </div>
                <div className="roles-list">
                  {formData.roles && formData.roles.length > 0 ? formData.roles.map((role, idx) => (
                    <div key={idx} className={`role-item ${!role.curso ? 'role-item-error' : ''}`}>
                      <div className="role-item-content">
                        <div className="role-item-inst">{role.institucion?.nombre} ({role.tipo?.nombre})</div>
                        <div className="role-item-details" style={{ width: '100%' }}>
                          {role.curso ? (
                            <span className="role-item-course" style={{ marginLeft: '8px' }}>{role.curso.nombre}</span>
                          ) : (
                            <div className="custom-schedules-container" style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e2e8f0' }}>Horarios Personalizados:</span>
                                {rol !== 'guardia' && (
                                  <button type="button" onClick={() => handleAddCustomSchedule(idx)} style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#3b82f6', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>+ Agregar</button>
                                )}
                              </div>
                              {role.horarios_personalizados?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {role.horarios_personalizados.map((h: any, hIdx: number) => (
                                    <div key={hIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                      <select value={h.dia} onChange={(e: any) => handleUpdateCustomSchedule(idx, hIdx, 'dia', e.target.value)} disabled={rol === 'guardia'} style={{ padding: '4px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #475569', background: '#1e293b', color: 'white' }}>
                                        <option value="Lunes">Lunes</option>
                                        <option value="Martes">Martes</option>
                                        <option value="Miércoles">Miércoles</option>
                                        <option value="Jueves">Jueves</option>
                                        <option value="Viernes">Viernes</option>
                                        <option value="Sábado">Sábado</option>
                                        <option value="Domingo">Domingo</option>
                                      </select>
                                      <select value={h.semana || 'Todas'} onChange={(e: any) => handleUpdateCustomSchedule(idx, hIdx, 'semana', e.target.value)} disabled={rol === 'guardia'} style={{ padding: '4px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #475569', background: '#1e293b', color: 'white' }}>
                                        <option value="Todas">Todas</option>
                                        <option value="A">Sem A</option>
                                        <option value="B">Sem B</option>
                                      </select>
                                      <input type="time" value={h.hora_inicio || '08:00'} onChange={(e: any) => handleUpdateCustomSchedule(idx, hIdx, 'hora_inicio', e.target.value)} disabled={rol === 'guardia'} lang="en-GB" style={{ padding: '4px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #475569', background: '#1e293b', color: 'white' }} />
                                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>a</span>
                                      <input type="time" value={h.hora_fin || '17:00'} onChange={(e: any) => handleUpdateCustomSchedule(idx, hIdx, 'hora_fin', e.target.value)} disabled={rol === 'guardia'} lang="en-GB" style={{ padding: '4px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #475569', background: '#1e293b', color: 'white' }} />
                                      {rol !== 'guardia' && (
                                        <button type="button" onClick={() => handleRemoveCustomSchedule(idx, hIdx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', marginLeft: 'auto' }}>✕</button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Sin horarios. La persona se considerará fuera de horario.</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <button type="button" className="btn-remove-role" onClick={() => handleRemoveRole(idx)}>🗑️</button>
                    </div>
                  )) : <div className="empty-roles">No hay roles asignados. Agregue uno usando los campos de arriba.</div>}
                  {errors.roles && <div className="error-message" style={{ marginTop: '8px', color: '#ef4444', fontSize: '0.85rem' }}>⚠️ {errors.roles}</div>}
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
              <button
                type="submit"
                className="btn-save"
                disabled={isSubmitting}
              >
                💾 {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default PersonaForm;