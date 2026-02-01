import React, { useState, useEffect } from 'react';
import PersonasTable from '../components/PersonasTable';
import PersonaForm from '../components/PersonaForm';
import PersonaDetails from '../components/PersonaDetails';
import { apiRequest } from '../config/api';
import { useToast } from '../components/Toast';
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
  const { showToast } = useToast();
  const [personas, setPersonas] = useState<Person[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [isLoading, setIsLoading] = useState(true);



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
              estado: (persona.activo !== false ? 'activo' : 'inactivo'),
              foto: persona.foto,
              roles: roles,
              grado: primaryCourse, // Display primary course in table
              nivelEducativo: primaryCourse.includes('Año') ? 'Secundaria' : 'Primaria'
            };
          });
          setPersonas(personasTransformadas);
        } else {
          console.error('Error al cargar personas:', response.status);
          setPersonas([]);
        }
      } catch (error) {
        console.error('Error cargando personas:', error);
        setPersonas([]);
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
    console.log('[Personas] Requesting delete for PERSON ID:', id, typeof id);
    if (!id) {
      console.error('[Personas] Error: Attempted to delete with invalid ID');
      showToast('Error interno: ID de persona no válido', 'error');
      return;
    }

    // Auto-delete without confirmation as requested
    try {
      console.log(`[Personas] Sending DELETE request to /personas/${id}/`);
      const response = await apiRequest(`/personas/${id}/`, {
        method: 'DELETE'
      });

      console.log('[Personas] Delete response status:', response.status);

      if (response.ok) {
        setPersonas(prev => prev.filter(p => p.id !== id));
        showToast('Persona eliminada exitosamente', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error al eliminar:', errorData);
        showToast('Error al eliminar la persona: ' + (errorData.detail || response.statusText), 'error');
      }
    } catch (error) {
      console.error('Error eliminando persona:', error);
      showToast('Error de red al eliminar la persona', 'error');
    }
  };

  const handleSavePerson = async (personData: Omit<Person, 'id'>) => {
    try {
      if (formMode === 'edit' && selectedPerson) {
        // Preparar payload para el backend (nombre completo y roles)
        const payload = {
          nombre: `${personData.nombre} ${personData.apellido}`.trim(),
          email: personData.email,
          telefono: personData.telefono,
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

          // Mostrar mensaje de éxito
          showToast('Cambios guardados exitosamente', 'success');
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error al guardar:', errorData);

          // Mostrar error más descriptivo
          let errorMsg = 'Error al guardar los cambios';
          if (errorData.nombre) errorMsg += ` - Nombre: ${errorData.nombre[0]}`;
          if (errorData.idPersona) errorMsg += ` - ID: ${errorData.idPersona[0]}`;
          if (errorData.roles) errorMsg += ` - Roles inválidos`;
          if (errorData.detail) errorMsg += ` - ${errorData.detail}`;

          showToast(errorMsg, 'error');
        }
      }
    } catch (error) {
      console.error('Error guardando persona:', error);
      showToast('Error de red al guardar la persona. Verificá tu conexión.', 'error');
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