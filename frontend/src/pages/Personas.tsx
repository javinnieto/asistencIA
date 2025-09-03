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
  departamento: string;
  cargo: string;
  fechaIngreso: string;
  estado: 'activo' | 'inactivo';
  foto?: string;
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
          const personasTransformadas = data.results.map((persona: any) => ({
            id: persona.idPersona.toString(),
            nombre: persona.nombre.split(' ')[0] || persona.nombre,
            apellido: persona.nombre.split(' ').slice(1).join(' ') || '',
            email: `${persona.nombre.toLowerCase().replace(/\s+/g, '.')}@institucion.com`,
            telefono: '+1 (555) 000-0000',
            departamento: persona.tipo.nombre === 'Estudiante' ? 'Alumnos' : 
                         persona.tipo.nombre === 'Profesor' ? 'Docentes' : 'Personal No Docente',
            cargo: persona.tipo.nombre === 'Estudiante' ? 'Estudiante' :
                   persona.tipo.nombre === 'Profesor' ? 'Profesor' : persona.tipo.nombre,
            fechaIngreso: '2023-01-01',
            estado: 'activo' as const,
            nivelEducativo: persona.curso ? (persona.curso.nombre.includes('Año') ? 'Secundaria' : 'Primaria') : undefined,
            grado: persona.curso?.nombre || undefined,
            foto: `https://via.placeholder.com/150x150/667eea/ffffff?text=${persona.nombre.split(' ').map((n: string) => n[0]).join('')}`
          }));
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

  const handleAddPerson = () => {
    setFormMode('add');
    setSelectedPerson(null);
    setIsFormOpen(true);
  };

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
        // Simular eliminación
        setPersonas(prev => prev.filter(p => p.id !== id));
        // Aquí iría la llamada real a la API
      } catch (error) {
        console.error('Error eliminando persona:', error);
        alert('Error al eliminar la persona');
      }
    }
  };

  const handleSavePerson = async (personData: Omit<Person, 'id'>) => {
    try {
      if (formMode === 'add') {
        // Simular creación
        const newPerson: Person = {
          ...personData,
          id: `EMP${String(personas.length + 1).padStart(3, '0')}`
        };
        setPersonas(prev => [...prev, newPerson]);
      } else {
        // Simular actualización
        setPersonas(prev => 
          prev.map(p => 
            p.id === selectedPerson?.id 
              ? { ...personData, id: p.id }
              : p
          )
        );
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error guardando persona:', error);
      alert('Error al guardar la persona');
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
        onAdd={handleAddPerson}
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