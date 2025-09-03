import React, { useState, useEffect, useMemo } from 'react';
import './PersonaForm.css';

// Iconos simples como componentes
const FaUser = ({ className }: { className?: string }) => <span className={className}>👤</span>;
const FaEnvelope = ({ className }: { className?: string }) => <span className={className}>📧</span>;
const FaPhone = ({ className }: { className?: string }) => <span className={className}>📞</span>;
const FaBuilding = ({ className }: { className?: string }) => <span className={className}>🏢</span>;
const FaBriefcase = ({ className }: { className?: string }) => <span className={className}>💼</span>;
const FaCalendar = ({ className }: { className?: string }) => <span className={className}>📅</span>;
const FaCamera = ({ className }: { className?: string }) => <span className={className}>📷</span>;
const FaTimes = ({ className }: { className?: string }) => <span className={className}>❌</span>;
const FaSave = ({ className }: { className?: string }) => <span className={className}>💾</span>;

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
  nivelEducativo?: 'Primaria' | 'Secundaria';
  grado?: string;
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
    nivelEducativo: undefined,
    grado: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Departamentos disponibles
  const departamentos = [
    'Alumnos',
    'Docentes', 
    'Personal No Docente'
  ];

  const nivelesEducativos = ['Primaria', 'Secundaria'];
  const gradosPrimaria = ['1er grado', '2do grado', '3er grado', '4to grado', '5to grado', '6to grado', '7mo grado'];
  const gradosSecundaria = ['1er año', '2do año', '3er año', '4to año', '5to año'];

  // Obtener grados disponibles según el nivel educativo seleccionado
  const gradosDisponibles = useMemo(() => {
    if (formData.nivelEducativo === 'Primaria') {
      return gradosPrimaria;
    } else if (formData.nivelEducativo === 'Secundaria') {
      return gradosSecundaria;
    }
    return [];
  }, [formData.nivelEducativo]);

  // Cargar datos si es modo edición
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
        nivelEducativo: person.nivelEducativo,
        grado: person.grado || ''
      });
    }
  }, [person, mode]);

  // Validación
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.apellido.trim()) {
      newErrors.apellido = 'El apellido es requerido';
    } else if (formData.apellido.length < 2) {
      newErrors.apellido = 'El apellido debe tener al menos 2 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido';
    }

    if (!formData.departamento.trim()) {
      newErrors.departamento = 'El departamento es requerido';
    }

    if (!formData.cargo.trim()) {
      newErrors.cargo = 'El cargo es requerido';
    }

    if (!formData.fechaIngreso) {
      newErrors.fechaIngreso = 'La fecha de ingreso es requerida';
    }

    if (formData.departamento === 'Alumnos' && !formData.nivelEducativo) {
      newErrors.nivelEducativo = 'El nivel educativo es requerido para alumnos';
    }

    if (formData.departamento === 'Alumnos' && formData.nivelEducativo === 'Secundaria' && !formData.grado) {
      newErrors.grado = 'El grado es requerido para secundaria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof Omit<Person, 'id'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo si existe
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error guardando persona:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFormData(prev => ({ ...prev, foto: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="persona-form-overlay" onClick={onClose}>
      <div className="persona-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="persona-form-header">
          <h2>{mode === 'add' ? 'Agregar Nueva Persona' : 'Editar Persona'}</h2>
          <p>{mode === 'add' ? 'Complete la información para agregar una nueva persona' : 'Modifique la información de la persona'}</p>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="persona-form-content">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="nombre">
                  <FaUser /> Nombre *
                </label>
                <input
                  type="text"
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  className={`form-input ${errors.nombre ? 'error' : ''}`}
                  placeholder="Ingrese el nombre"
                />
                {errors.nombre && <span className="error-message">{errors.nombre}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="apellido">
                  <FaUser /> Apellido *
                </label>
                <input
                  type="text"
                  id="apellido"
                  value={formData.apellido}
                  onChange={(e) => handleInputChange('apellido', e.target.value)}
                  className={`form-input ${errors.apellido ? 'error' : ''}`}
                  placeholder="Ingrese el apellido"
                />
                {errors.apellido && <span className="error-message">{errors.apellido}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  <FaEnvelope /> Email *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="ejemplo@empresa.com"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="telefono">
                  <FaPhone /> Teléfono *
                </label>
                <input
                  type="tel"
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  className={`form-input ${errors.telefono ? 'error' : ''}`}
                  placeholder="+1 (555) 123-4567"
                />
                {errors.telefono && <span className="error-message">{errors.telefono}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="departamento">
                  <FaBuilding /> Categoría *
                </label>
                <select
                  id="departamento"
                  value={formData.departamento}
                  onChange={(e) => {
                    handleInputChange('departamento', e.target.value);
                    // Resetear nivel educativo y grado si no es alumno
                    if (e.target.value !== 'Alumnos') {
                      setFormData(prev => ({ ...prev, nivelEducativo: undefined, grado: '' }));
                    }
                  }}
                  className={`form-select ${errors.departamento ? 'error' : ''}`}
                >
                  <option value="">Seleccione una categoría</option>
                  {departamentos.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                {errors.departamento && <span className="error-message">{errors.departamento}</span>}
              </div>

              {formData.departamento === 'Alumnos' && (
                <>
                  <div className="form-group">
                    <label htmlFor="nivelEducativo">
                      <FaBuilding /> Nivel Educativo *
                    </label>
                    <select
                      id="nivelEducativo"
                      value={formData.nivelEducativo || ''}
                      onChange={(e) => {
                        handleInputChange('nivelEducativo', e.target.value as 'Primaria' | 'Secundaria');
                        // Resetear grado cuando cambia el nivel
                        setFormData(prev => ({ ...prev, grado: '' }));
                      }}
                      className={`form-select ${errors.nivelEducativo ? 'error' : ''}`}
                    >
                      <option value="">Seleccione el nivel educativo</option>
                      {nivelesEducativos.map(nivel => (
                        <option key={nivel} value={nivel}>{nivel}</option>
                      ))}
                    </select>
                    {errors.nivelEducativo && <span className="error-message">{errors.nivelEducativo}</span>}
                  </div>

                  {formData.nivelEducativo && (
                    <div className="form-group">
                      <label htmlFor="grado">
                        <FaBuilding /> Grado *
                      </label>
                      <select
                        id="grado"
                        value={formData.grado}
                        onChange={(e) => handleInputChange('grado', e.target.value)}
                        className={`form-select ${errors.grado ? 'error' : ''}`}
                      >
                        <option value="">Seleccione el grado</option>
                        {gradosDisponibles.map(grado => (
                          <option key={grado} value={grado}>{grado}</option>
                        ))}
                      </select>
                      {errors.grado && <span className="error-message">{errors.grado}</span>}
                    </div>
                  )}
                </>
              )}

              <div className="form-group">
                <label htmlFor="cargo">
                  <FaBriefcase /> Cargo *
                </label>
                <input
                  type="text"
                  id="cargo"
                  value={formData.cargo}
                  onChange={(e) => handleInputChange('cargo', e.target.value)}
                  className={`form-input ${errors.cargo ? 'error' : ''}`}
                  placeholder="Ej: Desarrollador Senior"
                />
                {errors.cargo && <span className="error-message">{errors.cargo}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="fechaIngreso">
                  <FaCalendar /> Fecha de Ingreso *
                </label>
                <input
                  type="date"
                  id="fechaIngreso"
                  value={formData.fechaIngreso}
                  onChange={(e) => handleInputChange('fechaIngreso', e.target.value)}
                  className={`form-input ${errors.fechaIngreso ? 'error' : ''}`}
                />
                {errors.fechaIngreso && <span className="error-message">{errors.fechaIngreso}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="estado">Estado</label>
                <select
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => handleInputChange('estado', e.target.value as 'activo' | 'inactivo')}
                  className="form-select"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>

              {/* Sección de foto */}
              <div className="photo-section">
                <div className="photo-preview">
                  {formData.foto ? (
                    <img src={formData.foto} alt="Foto de perfil" />
                  ) : (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '12px',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '24px' }}>📷</span>
                      <span>Sin foto</span>
                    </div>
                  )}
                </div>
                
                <div className="photo-upload">
                  <label htmlFor="foto" className="photo-upload-label">
                    <FaCamera /> {formData.foto ? 'Cambiar Foto' : 'Subir Foto'}
                  </label>
                  <input
                    type="file"
                    id="foto"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  {formData.foto && (
                    <button
                      type="button"
                      className="btn-cancel-photo"
                      onClick={() => setFormData(prev => ({ ...prev, foto: '' }))}
                    >
                      <FaTimes /> Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`btn-save ${isSubmitting ? 'loading' : ''}`}
                disabled={isSubmitting}
              >
                <FaSave />
                {isSubmitting ? 'Guardando...' : mode === 'add' ? 'Agregar Persona' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PersonaForm; 