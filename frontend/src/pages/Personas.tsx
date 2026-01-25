import React, { useState, useEffect } from 'react';
import PersonasTable from '../components/PersonasTable';
import PersonaForm from '../components/PersonaForm';
import PersonaDetails from '../components/PersonaDetails';
import { apiRequest } from '../config/api';
import './Personas.css';

interface Person {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  departamento: string; // Used for primary role display
  cargo: string;
  fechaIngreso: string;
  estado: 'activo' | 'inactivo';
  foto?: string;
  roles?: any[]; // Full roles data for modal
  nivelEducativo?: 'Primaria' | 'Secundaria';
  grado?: string;
}

const Personas: React.FC = () => {
  const [personas, setPersonas] = useState<Person[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [isLoading, setIsLoading] = useState(true);

  // Datos de ejemplo
  const mockPersonas: Person[] = [
    {
      id: 'EMP001',
      nombre: 'Juan Carlos',
      apellido: 'García',
      email: 'juan.garcia@institucion.com',
      telefono: '+1 (555) 123-4567',
      departamento: 'Alumnos',
      cargo: 'Estudiante',
      fechaIngreso: '2023-09-15',
      estado: 'activo',
      nivelEducativo: 'Primaria',
      grado: '3er grado',
      foto: 'https://via.placeholder.com/150x150/667eea/ffffff?text=JG'
    },
    {
      id: 'EMP002',
      nombre: 'María Elena',
      apellido: 'Rodríguez',
      email: 'maria.rodriguez@institucion.com',
      telefono: '+1 (555) 234-5678',
      departamento: 'Docentes',
      cargo: 'Profesora de Matemáticas',
      fechaIngreso: '2022-03-10',
      estado: 'activo',
      foto: 'https://via.placeholder.com/150x150/10b981/ffffff?text=MR'
    },
    {
      id: 'EMP003',
      nombre: 'Carlos Alberto',
      apellido: 'López',
      email: 'carlos.lopez@institucion.com',
      telefono: '+1 (555) 345-6789',
      departamento: 'Personal No Docente',
      cargo: 'Administrador de Sistemas',
      fechaIngreso: '2021-08-22',
      estado: 'activo',
      foto: 'https://via.placeholder.com/150x150/f59e0b/ffffff?text=CL'
    },
    {
      id: 'EMP004',
      nombre: 'Ana Sofía',
      apellido: 'Martínez',
      email: 'ana.martinez@institucion.com',
      telefono: '+1 (555) 456-7890',
      departamento: 'Alumnos',
      cargo: 'Estudiante',
      fechaIngreso: '2023-08-28',
      estado: 'activo',
      nivelEducativo: 'Secundaria',
      grado: '2do año',
      foto: 'https://via.placeholder.com/150x150/8b5cf6/ffffff?text=AM'
    },
    {
      id: 'EMP005',
      nombre: 'Roberto José',
      apellido: 'Hernández',
      email: 'roberto.hernandez@institucion.com',
      telefono: '+1 (555) 567-8901',
      departamento: 'Docentes',
      cargo: 'Profesor de Física',
      fechaIngreso: '2020-11-15',
      estado: 'activo',
      foto: 'https://via.placeholder.com/150x150/ef4444/ffffff?text=RH'
    },
    {
      id: 'EMP006',
      nombre: 'Laura Patricia',
      apellido: 'González',
      email: 'laura.gonzalez@institucion.com',
      telefono: '+1 (555) 678-9012',
      departamento: 'Personal No Docente',
      cargo: 'Secretaria Académica',
      fechaIngreso: '2022-01-10',
      estado: 'activo',
      foto: 'https://via.placeholder.com/150x150/06b6d4/ffffff?text=LG'
    },
    {
      id: 'EMP007',
      nombre: 'Miguel Ángel',
      apellido: 'Pérez',
      email: 'miguel.perez@institucion.com',
      telefono: '+1 (555) 789-0123',
      departamento: 'Alumnos',
      cargo: 'Estudiante',
      fechaIngreso: '2023-09-01',
      estado: 'activo',
      nivelEducativo: 'Primaria',
      grado: '5to grado',
      foto: 'https://via.placeholder.com/150x150/84cc16/ffffff?text=MP'
    },
    {
      id: 'EMP008',
      nombre: 'Carmen Rosa',
      apellido: 'Sánchez',
      email: 'carmen.sanchez@institucion.com',
      telefono: '+1 (555) 890-1234',
      departamento: 'Docentes',
      cargo: 'Profesora de Literatura',
      fechaIngreso: '2021-06-20',
      estado: 'activo',
      foto: 'https://via.placeholder.com/150x150/f97316/ffffff?text=CS'
    },
    {
      id: 'EMP009',
      nombre: 'Fernando Luis',
      apellido: 'Díaz',
      email: 'fernando.diaz@institucion.com',
      telefono: '+1 (555) 901-2345',
      departamento: 'Personal No Docente',
      cargo: 'Técnico de Laboratorio',
      fechaIngreso: '2022-09-05',
      estado: 'activo',
      foto: 'https://via.placeholder.com/150x150/ec4899/ffffff?text=FD'
    },
    {
      id: 'EMP010',
      nombre: 'Isabella María',
      apellido: 'Torres',
      email: 'isabella.torres@institucion.com',
      telefono: '+1 (555) 012-3456',
      departamento: 'Alumnos',
      cargo: 'Estudiante',
      fechaIngreso: '2023-08-15',
      estado: 'activo',
      nivelEducativo: 'Secundaria',
      grado: '4to año',
      foto: 'https://via.placeholder.com/150x150/14b8a6/ffffff?text=IT'
    },
    {
      id: 'EMP011',
      nombre: 'Diego Alejandro',
      apellido: 'Ramírez',
      email: 'diego.ramirez@institucion.com',
      telefono: '+1 (555) 123-7890',
      departamento: 'Alumnos',
      cargo: 'Estudiante',
      fechaIngreso: '2023-09-01',
      estado: 'activo',
      nivelEducativo: 'Primaria',
      grado: '1er grado',
      foto: 'https://via.placeholder.com/150x150/6366f1/ffffff?text=DR'
    },
    {
      id: 'EMP012',
      nombre: 'Valentina Sofia',
      apellido: 'Castro',
      email: 'valentina.castro@institucion.com',
      telefono: '+1 (555) 234-8901',
      departamento: 'Alumnos',
      cargo: 'Estudiante',
      fechaIngreso: '2023-08-15',
      estado: 'activo',
      nivelEducativo: 'Secundaria',
      grado: '1er año',
      foto: 'https://via.placeholder.com/150x150/a855f7/ffffff?text=VC'
    }
  ];

  useEffect(() => {
    // Cargar datos reales del backend
    const loadPersonas = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest('/personas/');
        if (response.ok) {
          const data = await response.json();
          // Transformar datos del backend al formato esperado por el frontend
          const personasTransformadas = data.results.map((persona: any) => {
            const nombreCompleto = persona.nombre || 'Sin Nombre';
            const nombreParts = nombreCompleto.split(' ');
            const primerNombre = nombreParts[0] || '';
            const apellido = nombreParts.slice(1).join(' ') || '-';

            // Safe access to nested properties
            const roles = persona.roles || [];
            let primaryRole = 'Sin asignar';
            let primaryCourse = '';

            if (roles.length > 0) {
              // Try to find the most relevant role (e.g., Alumno or Docente)
              const mainRole = roles.find((r: any) => r.tipo.nombre !== 'No Docente') || roles[0];
              primaryRole = mainRole.tipo.nombre;
              if (mainRole.curso) {
                primaryCourse = mainRole.curso.nombre;
              }
            }

            return {
              id: persona.idPersona?.toString() || '0',
              nombre: primerNombre,
              apellido: apellido,
              email: persona.email || `${nombreCompleto.toLowerCase().replace(/\s+/g, '.')}@institucion.com`,
              telefono: persona.telefono || '+1 (555) 000-0000',
              departamento: primaryRole,
              cargo: primaryRole, // Map cargo to primary role type
              fechaIngreso: persona.fechaRegistro || '2023-01-01',
              estado: (persona.activo !== false ? 'activo' : 'inactivo') as const,
              foto: persona.foto || `https://via.placeholder.com/150x150/667eea/ffffff?text=${primerNombre.charAt(0)}`,
              roles: roles,
              grado: primaryCourse, // Display primary course in table
              nivelEducativo: primaryCourse.includes('Año') ? 'Secundaria' : 'Primaria'
            };
          });
          setPersonas(personasTransformadas);
        } else {
          console.error('Error al cargar personas:', response.status);
          // Fallback a datos mock si falla la API
          setPersonas(mockPersonas);
        }
      } catch (error) {
        console.error('Error cargando personas:', error);
        // Fallback a datos mock si falla la API
        setPersonas(mockPersonas);
      } finally {
        setIsLoading(false);
      }
    };

    loadPersonas();
  }, []);

  // ELIMINADO: handleAddPerson ya que la creación es vía dispositivo
  /* 
  const handleAddPerson = () => {
    console.log('handleAddPerson called');
    setFormMode('add');
    setSelectedPerson(null);
    setIsFormOpen(true);
    console.log('isFormOpen set to true');
  };
  */

  const handleEditPerson = (person: Person) => {
    setFormMode('edit');
    setSelectedPerson(person);
    setIsFormOpen(true);
  };

  const handleViewPerson = (person: Person) => {
    setSelectedPerson(person);
    setIsDetailsOpen(true);
  };

  const handleDeletePerson = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta persona?')) {
      try {
        const response = await apiRequest(`/personas/${id}/`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setPersonas(prev => prev.filter(p => p.id !== id));
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error al eliminar:', errorData);
          alert('Error al eliminar la persona: ' + (errorData.detail || response.statusText));
        }
      } catch (error) {
        console.error('Error eliminando persona:', error);
        alert('Error de red al eliminar la persona');
      }
    }
  };

  const handleSavePerson = async (personData: Omit<Person, 'id'>) => {
    try {
      if (formMode === 'edit' && selectedPerson) {
        // Preparar payload para el backend (nombre completo y roles)
        const payload = {
          nombre: `${personData.nombre} ${personData.apellido}`.trim(),
          activo: personData.estado === 'activo',
          foto: personData.foto,
          roles: personData.roles // El backend ya sabe manejar esto ahora
        };

        const response = await apiRequest(`/personas/${selectedPerson.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const updatedPersonFromBE = await response.json();
          // Transformar de vuelta al formato UI
          const nombreParts = updatedPersonFromBE.nombre.split(' ');
          const primerNombre = nombreParts[0] || '';
          const apellido = nombreParts.slice(1).join(' ') || '-';
          const roles = updatedPersonFromBE.roles || [];
          let primaryRole = 'Sin asignar';
          let primaryCourse = '';
          if (roles.length > 0) {
            const mainRole = roles.find((r: any) => r.tipo.nombre !== 'No Docente') || roles[0];
            primaryRole = mainRole.tipo.nombre;
            if (mainRole.curso) primaryCourse = mainRole.curso.nombre;
          }

          const transformed: Person = {
            id: updatedPersonFromBE.idPersona.toString(),
            nombre: primerNombre,
            apellido: apellido,
            email: personData.email,
            telefono: personData.telefono,
            departamento: primaryRole,
            cargo: primaryRole,
            fechaIngreso: personData.fechaIngreso,
            estado: updatedPersonFromBE.activo ? 'activo' : 'inactivo',
            foto: updatedPersonFromBE.foto,
            roles: roles,
            grado: primaryCourse,
            nivelEducativo: primaryCourse.includes('Año') ? 'Secundaria' : 'Primaria'
          };

          setPersonas(prev => prev.map(p => p.id === transformed.id ? transformed : p));
          setIsFormOpen(false);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error al guardar:', errorData);
          alert('Error al guardar cambios: ' + (errorData.detail || JSON.stringify(errorData)));
        }
      }
    } catch (error) {
      console.error('Error guardando persona:', error);
      alert('Error de red al guardar la persona');
    }
  };

  const handleEditFromDetails = (person: Person) => {
    setFormMode('edit');
    setSelectedPerson(person);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando personas...</p>
      </div>
    );
  }

  return (
    <div className="personas-page">
      <PersonasTable
        personas={personas}
        onEdit={handleEditPerson}
        onDelete={handleDeletePerson}
        onView={handleViewPerson}
      />

      <PersonaForm
        person={selectedPerson || undefined}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSavePerson}
        mode={formMode}
      />

      {selectedPerson && isDetailsOpen && (
        <PersonaDetails
          person={selectedPerson}
          onClose={() => setIsDetailsOpen(false)}
          onEdit={handleEditFromDetails}
        />
      )}
    </div>
  );
};

export default Personas; 