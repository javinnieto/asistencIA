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
    if (!selectedInstId || !selectedTypeId) return;
    const inst = institutions.find(i => i.idInstitucion?.toString() === selectedInstId);
    const type = types.find(t => t.idTipoPersona?.toString() === selectedTypeId);
    const course = selectedCourseId ? courses.find(c => c.idCurso?.toString() === selectedCourseId) : null;
    setFormData(prev => ({ ...prev, roles: [...(prev.roles || []), { institucion: inst, tipo: type, curso: course, tempId: Date.now() }] }));
    setSelectedTypeId('');
    setSelectedCourseId('');
  };

  const handleRemoveRole = (index: number) => {
    setFormData(prev => ({ ...prev, roles: prev.roles?.filter((_, i) => i !== index) }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.nombre?.trim()) newErrors.nombre = 'Nombre requerido';
    if (!formData.apellido?.trim()) newErrors.apellido = 'Apellido requerido';
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
                <div className="role-input-row">
                  <div className="form-group">
                    <label>Institución</label>
                    <select className="form-select" value={selectedInstId} onChange={e => { setSelectedInstId(e.target.value); setSelectedTypeId(''); setSelectedCourseId(''); }}>
                      <option value="">Seleccionar...</option>
                      {institutions.map(i => <option key={i.idInstitucion} value={i.idInstitucion}>{i.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tipo</label>
                    <select className="form-select" value={selectedTypeId} onChange={e => setSelectedTypeId(e.target.value)} disabled={!selectedInstId}>
                      <option value="">Seleccionar...</option>
                      {filteredTypes.map(t => <option key={t.idTipoPersona} value={t.idTipoPersona}>{t.nombre}</option>)}
                    </select>
                    {/* Campo Curso - Solo mostrar para tipos que lo necesitan */}
                    {selectedTypeId && (() => {
                      // Lógica inteligente: determinar si el tipo necesita curso
                      const selectedType = filteredTypes.find(t => t.idTipoPersona?.toString() === selectedTypeId);
                      if (!selectedType) return null;

                      const tipoNombre = selectedType.nombre.toLowerCase();

                      // Tipos que SÍ necesitan curso (educativos)
                      const tiposConCurso = ['alumno', 'docente', 'profesor', 'estudiante', 'maestro', 'tutor'];
                      // Tipos que NO necesitan curso (administrativos/otros)
                      const tiposSinCurso = ['no docente', 'administrativo', 'personal', 'visitante', 'directivo', 'director'];

                      // Verificar si coincide con algún tipo que necesita curso
                      const necesitaCurso = tiposConCurso.some(tipo => tipoNombre.includes(tipo));
                      const noNecesitaCurso = tiposSinCurso.some(tipo => tipoNombre.includes(tipo));

                      // Si explícitamente no necesita, ocultar campo
                      if (noNecesitaCurso) return null;
                      // Si explícitamente necesita O por defecto (educativo), mostrar campo
                      if (!necesitaCurso && !noNecesitaCurso) {
                        // Default fallback: si no está en ninguna lista, asumir que necesita curso
                        // (más seguro para instituciones educativas)
                        return null; // Cambiar a mostrar si prefieres que por defecto aparezca
                      }

                      return (
                        <div className="form-group">
                          <label>Curso (Opcional)</label>
                          <select
                            className="form-select"
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                          >
                            <option value="">Sin curso específico</option>
                            {filteredCourses.map(curso => (
                              <option key={curso.idCurso} value={curso.idCurso?.toString()}>
                                {curso.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                  </div>
                  <button type="button" className="btn-add-role" onClick={handleAddRole} disabled={!selectedInstId || !selectedTypeId}>➕</button>
                </div>
                <div className="roles-list">
                  {formData.roles && formData.roles.length > 0 ? formData.roles.map((role, idx) => (
                    <div key={idx} className="role-item">
                      <div className="role-item-content">
                        <div className="role-item-inst">{role.institucion?.nombre}</div>
                        <div className="role-item-details">
                          <span>{role.tipo?.nombre}</span>
                          {role.curso && <span className="role-item-course">{role.curso.nombre}</span>}
                        </div>
                      </div>
                      <button type="button" className="btn-remove-role" onClick={() => handleRemoveRole(idx)}>🗑️</button>
                    </div>
                  )) : <div className="empty-roles">No hay roles asignados. Agregue uno usando los campos de arriba.</div>}
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
              <button type="submit" className="btn-save" disabled={isSubmitting}>💾 {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default PersonaForm;