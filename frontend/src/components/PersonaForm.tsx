import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { apiRequest } from '../config/api';
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
  const [formData, setFormData] = useState<Omit<Person, 'id'>>({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    telefono_emergencia: '',
    departamento: '',
    cargo: '',
    fechaIngreso: new Date().toISOString().split('T')[0],
    estado: 'activo',
    foto: '',
    roles: []
  });

  const [institutions, setInstitutions] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
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
        roles: person.roles || []
      });
    }
  }, [person, mode]);

  const filteredTypes = useMemo(() => {
    if (!selectedInstId) return [];
    return types.filter(t => t.institucion?.idInstitucion?.toString() === selectedInstId && t.activo);
  }, [selectedInstId, types]);

  const filteredCourses = useMemo(() => {
    if (!selectedInstId) return [];
    return courses.filter(c => c.institucion?.idInstitucion?.toString() === selectedInstId && c.activo);
  }, [selectedInstId, courses]);

  const handleAddRole = () => {
    if (!selectedInstId || !selectedTypeId || !selectedCourseId) return;
    const inst = institutions.find(i => i.idInstitucion?.toString() === selectedInstId);
    const type = types.find(t => t.idTipoPersona?.toString() === selectedTypeId);
    const course = courses.find(c => c.idCurso?.toString() === selectedCourseId);
    setFormData(prev => ({ ...prev, roles: [...(prev.roles || []), { institucion: inst, tipo: type, curso: course, tempId: Date.now() }] }));
    setSelectedTypeId('');
    setSelectedCourseId('');
    // Limpiar errores al agregar rol válido
    if (errors.roles) {
      setErrors(prev => ({ ...prev, roles: '' }));
    }
  };

  const handleRemoveRole = (index: number) => {
    setFormData(prev => ({ ...prev, roles: prev.roles?.filter((_, i) => i !== index) }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.nombre?.trim()) newErrors.nombre = 'Nombre requerido';
    if (!formData.apellido?.trim()) newErrors.apellido = 'Apellido requerido';

    // Validar que todos los roles tengan curso asignado
    if (formData.roles && formData.roles.length > 0) {
      const rolesWithoutCurso = formData.roles.filter(role => !role.curso);
      if (rolesWithoutCurso.length > 0) {
        newErrors.roles = `Hay ${rolesWithoutCurso.length} categoría(s) sin curso asignado. Todas las categorías deben tener un curso.`;
      }
    }

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
    <div className="persona-form-overlay" onClick={onClose}>
      <div className="persona-form-modal" onClick={(e) => e.stopPropagation()}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
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
                    <option value="inactivo">❌ Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="roles-section">
                <div className="roles-section-header">🏢 Roles y Cursos</div>
                <div className="role-input-row" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Institución</label>
                    <select className="form-select" value={selectedInstId} onChange={e => { setSelectedInstId(e.target.value); setSelectedTypeId(''); setSelectedCourseId(''); }}>
                      <option value="">Seleccionar...</option>
                      {institutions.map(i => <option key={i.idInstitucion} value={i.idInstitucion}>{i.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Tipo</label>
                    <select className="form-select" value={selectedTypeId} onChange={e => setSelectedTypeId(e.target.value)} disabled={!selectedInstId}>
                      <option value="">Seleccionar...</option>
                      {filteredTypes.map(t => <option key={t.idTipoPersona} value={t.idTipoPersona}>{t.nombre}</option>)}
                    </select>
                  </div>
                  {/* Campo Curso - SIEMPRE OBLIGATORIO */}
                  {selectedTypeId && (
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Curso <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span></label>
                      <select
                        className={`form-select ${!selectedCourseId && selectedTypeId ? 'error' : ''}`}
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        required
                      >
                        <option value="">Seleccionar curso...</option>
                        {filteredCourses.map(curso => (
                          <option key={curso.idCurso} value={curso.idCurso?.toString()}>
                            {curso.nombre}
                          </option>
                        ))}
                      </select>
                      {!selectedCourseId && selectedTypeId && (
                        <span className="error-message" style={{ fontSize: '0.75rem', color: '#ef4444' }}>El curso es obligatorio</span>
                      )}
                    </div>
                  )}
                  <div style={{ alignSelf: 'flex-end', paddingBottom: '2px' }}>
                    <button type="button" className="btn-add-role" onClick={handleAddRole} disabled={!selectedInstId || !selectedTypeId || !selectedCourseId}>➕</button>
                  </div>
                </div>
                <div className="roles-list">
                  {formData.roles && formData.roles.length > 0 ? formData.roles.map((role, idx) => (
                    <div key={idx} className={`role-item ${!role.curso ? 'role-item-error' : ''}`}>
                      <div className="role-item-content">
                        <div className="role-item-inst">{role.institucion?.nombre}</div>
                        <div className="role-item-details">
                          <span>{role.tipo?.nombre}</span>
                          {role.curso ? (
                            <span className="role-item-course">{role.curso.nombre}</span>
                          ) : (
                            <span className="role-item-error-badge">⚠️ Sin curso</span>
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
                disabled={isSubmitting || (formData.roles && formData.roles.some(r => !r.curso))}
                title={formData.roles && formData.roles.some(r => !r.curso) ? 'Todas las categorías deben tener un curso asignado' : ''}
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