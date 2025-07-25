import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Notification, { NotificationType } from '../components/Notification';
import ExportButton from '../components/ExportButton';
import AsistenciasStats from '../components/AsistenciasStats';
import './Asistencias.css';

interface Asistencia {
  idAsistencia: number;
  persona: {
    idPersona: number;
    nombre: string;
    curso?: { idCurso: number; nombre: string } | null;
  };
  fecha_hora: string;
  temperatura: number;
  estado: { idEstadoAsistencia: number; nombre: string };
}

interface Persona {
  idPersona: number;
  nombre: string;
  tipo: 'alumno' | 'profesor' | 'personal';
  curso?: { idCurso: number; nombre: string } | null;
}

interface AlumnoSecundaria {
  id: number;
  nombre: string;
  apellido: string;
  presente: boolean;
  horaEntrada?: string;
  temperatura?: number;
  justificacion?: string;
}

interface AlumnoPrimaria {
  id: number;
  nombre: string;
  apellido: string;
  presente: boolean;
  horaEntrada?: string;
  temperatura?: number;
  justificacion?: string;
}

interface Profesor {
  id: number;
  nombre: string;
  apellido: string;
  materia: string;
  presente: boolean;
  horaEntrada?: string;
  temperatura?: number;
  justificacion?: string;
}

interface Personal {
  id: number;
  nombre: string;
  apellido: string;
  cargo: string;
  presente: boolean;
  horaEntrada?: string;
  temperatura?: number;
  justificacion?: string;
}

const Asistencias: React.FC = () => {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filtros, setFiltros] = useState({
    fecha: '',
    persona: '',
    estado: '',
    tipo: ''
  });
  const [nuevaAsistencia, setNuevaAsistencia] = useState({
    personaId: '',
    temperatura: '',
    estado: '1' // Presente por defecto
  });
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<{ temperatura: string; estado: string }>({ temperatura: '', estado: '1' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  
  // Nuevos estados para las pestañas
  const [activeTab, setActiveTab] = useState<'general' | 'secundaria' | 'primaria' | 'profesores' | 'personal'>('general');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [alumnosSecundaria, setAlumnosSecundaria] = useState<AlumnoSecundaria[]>([]);
  const [loadingSecundaria, setLoadingSecundaria] = useState(false);
  
  // Estados para Primaria
  const [selectedYearPrimaria, setSelectedYearPrimaria] = useState<number | null>(null);
  const [alumnosPrimaria, setAlumnosPrimaria] = useState<AlumnoPrimaria[]>([]);
  const [loadingPrimaria, setLoadingPrimaria] = useState(false);
  
  // Estados para Profesores
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loadingProfesores, setLoadingProfesores] = useState(false);
  
  // Estados para Personal
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);

  // Datos de ejemplo para personas
  const personasEjemplo: Persona[] = [
    { idPersona: 1, nombre: 'María González', tipo: 'alumno', curso: { idCurso: 1, nombre: '1er año' } },
    { idPersona: 2, nombre: 'Juan Pérez', tipo: 'profesor' },
    { idPersona: 3, nombre: 'Ana Rodríguez', tipo: 'alumno', curso: { idCurso: 2, nombre: '2do año' } },
    { idPersona: 4, nombre: 'Carlos López', tipo: 'alumno', curso: { idCurso: 1, nombre: '1er año' } },
    { idPersona: 5, nombre: 'Laura Martínez', tipo: 'personal' },
    { idPersona: 6, nombre: 'Diego Silva', tipo: 'alumno', curso: { idCurso: 3, nombre: '3er año' } },
    { idPersona: 7, nombre: 'Sofía Torres', tipo: 'alumno', curso: { idCurso: 2, nombre: '2do año' } },
    { idPersona: 8, nombre: 'Miguel Herrera', tipo: 'profesor' },
    { idPersona: 9, nombre: 'Valentina Castro', tipo: 'alumno', curso: { idCurso: 1, nombre: '1er año' } },
    { idPersona: 10, nombre: 'Andrés Morales', tipo: 'personal' }
  ];

  // Datos de ejemplo para asistencias
  const asistenciasEjemplo: Asistencia[] = [
    {
      idAsistencia: 1,
      persona: { idPersona: 1, nombre: 'María González', curso: { idCurso: 1, nombre: '1er año' } },
      fecha_hora: '2024-01-15T08:30:00',
      temperatura: 36.5,
      estado: { idEstadoAsistencia: 1, nombre: 'Presente' }
    },
    {
      idAsistencia: 2,
      persona: { idPersona: 2, nombre: 'Juan Pérez' },
      fecha_hora: '2024-01-15T08:15:00',
      temperatura: 36.8,
      estado: { idEstadoAsistencia: 1, nombre: 'Presente' }
    },
    {
      idAsistencia: 3,
      persona: { idPersona: 3, nombre: 'Ana Rodríguez', curso: { idCurso: 2, nombre: '2do año' } },
      fecha_hora: '2024-01-15T08:45:00',
      temperatura: 36.2,
      estado: { idEstadoAsistencia: 1, nombre: 'Presente' }
    },
    {
      idAsistencia: 4,
      persona: { idPersona: 4, nombre: 'Carlos López', curso: { idCurso: 1, nombre: '1er año' } },
      fecha_hora: '2024-01-15T00:00:00',
      temperatura: 0,
      estado: { idEstadoAsistencia: 2, nombre: 'Ausente' }
    },
    {
      idAsistencia: 5,
      persona: { idPersona: 5, nombre: 'Laura Martínez' },
      fecha_hora: '2024-01-15T07:45:00',
      temperatura: 36.6,
      estado: { idEstadoAsistencia: 1, nombre: 'Presente' }
    },
    {
      idAsistencia: 6,
      persona: { idPersona: 6, nombre: 'Diego Silva', curso: { idCurso: 3, nombre: '3er año' } },
      fecha_hora: '2024-01-15T08:00:00',
      temperatura: 36.9,
      estado: { idEstadoAsistencia: 1, nombre: 'Presente' }
    },
    {
      idAsistencia: 7,
      persona: { idPersona: 7, nombre: 'Sofía Torres', curso: { idCurso: 2, nombre: '2do año' } },
      fecha_hora: '2024-01-15T08:20:00',
      temperatura: 36.3,
      estado: { idEstadoAsistencia: 1, nombre: 'Presente' }
    },
    {
      idAsistencia: 8,
      persona: { idPersona: 8, nombre: 'Miguel Herrera' },
      fecha_hora: '2024-01-15T07:30:00',
      temperatura: 36.7,
      estado: { idEstadoAsistencia: 1, nombre: 'Presente' }
    },
    {
      idAsistencia: 9,
      persona: { idPersona: 9, nombre: 'Valentina Castro', curso: { idCurso: 1, nombre: '1er año' } },
      fecha_hora: '2024-01-15T00:00:00',
      temperatura: 0,
      estado: { idEstadoAsistencia: 2, nombre: 'Ausente' }
    },
    {
      idAsistencia: 10,
      persona: { idPersona: 10, nombre: 'Andrés Morales' },
      fecha_hora: '2024-01-15T08:10:00',
      temperatura: 36.4,
      estado: { idEstadoAsistencia: 1, nombre: 'Presente' }
    },
    {
      idAsistencia: 11,
      persona: { idPersona: 1, nombre: 'María González', curso: { idCurso: 1, nombre: '1er año' } },
      fecha_hora: '2024-01-16T08:25:00',
      temperatura: 36.6,
      estado: { idEstadoAsistencia: 1, nombre: 'Presente' }
    },
    {
      idAsistencia: 12,
      persona: { idPersona: 3, nombre: 'Ana Rodríguez', curso: { idCurso: 2, nombre: '2do año' } },
      fecha_hora: '2024-01-16T08:40:00',
      temperatura: 36.1,
      estado: { idEstadoAsistencia: 1, nombre: 'Presente' }
    }
  ];

  // Datos de ejemplo para años de secundaria
  const añosSecundaria = [
    { id: 1, nombre: '1er año', division: 'A' },
    { id: 2, nombre: '2do año', division: 'A' },
    { id: 3, nombre: '3er año', division: 'A' },
    { id: 4, nombre: '4to año', division: 'A' },
    { id: 5, nombre: '5to año', division: 'A' }
  ];

  // Datos de ejemplo para años de primaria
  const añosPrimaria = [
    { id: 1, nombre: '1er grado', division: 'A' },
    { id: 2, nombre: '2do grado', division: 'A' },
    { id: 3, nombre: '3er grado', division: 'A' },
    { id: 4, nombre: '4to grado', division: 'A' },
    { id: 5, nombre: '5to grado', division: 'A' },
    { id: 6, nombre: '6to grado', division: 'A' },
    { id: 7, nombre: '7mo grado', division: 'A' }
  ];

  // Datos de ejemplo para alumnos de secundaria
  const alumnosEjemplo: { [key: number]: AlumnoSecundaria[] } = {
    1: [
      { id: 1, nombre: 'María', apellido: 'González', presente: true, horaEntrada: '07:45', temperatura: 36.5 },
      { id: 2, nombre: 'Juan', apellido: 'Pérez', presente: false },
      { id: 3, nombre: 'Ana', apellido: 'Rodríguez', presente: true, horaEntrada: '08:00', temperatura: 36.2 },
      { id: 4, nombre: 'Carlos', apellido: 'López', presente: true, horaEntrada: '07:50', temperatura: 36.8 },
      { id: 5, nombre: 'Laura', apellido: 'Martínez', presente: false, justificacion: 'Enfermedad' },
      { id: 6, nombre: 'Diego', apellido: 'Silva', presente: true, horaEntrada: '08:15', temperatura: 36.3 },
      { id: 7, nombre: 'Sofía', apellido: 'Torres', presente: true, horaEntrada: '07:40', temperatura: 36.6 },
      { id: 8, nombre: 'Miguel', apellido: 'Herrera', presente: true, horaEntrada: '08:05', temperatura: 36.4 },
      { id: 9, nombre: 'Valentina', apellido: 'Castro', presente: false },
      { id: 10, nombre: 'Andrés', apellido: 'Morales', presente: true, horaEntrada: '07:55', temperatura: 36.7 }
    ],
    2: [
      { id: 11, nombre: 'Camila', apellido: 'Fernández', presente: true, horaEntrada: '07:50', temperatura: 36.5 },
      { id: 12, nombre: 'Lucas', apellido: 'García', presente: true, horaEntrada: '08:00', temperatura: 36.3 },
      { id: 13, nombre: 'Florencia', apellido: 'Díaz', presente: false, justificacion: 'Cita médica' },
      { id: 14, nombre: 'Matías', apellido: 'Ruiz', presente: true, horaEntrada: '07:45', temperatura: 36.6 },
      { id: 15, nombre: 'Agustina', apellido: 'Moreno', presente: true, horaEntrada: '08:10', temperatura: 36.4 }
    ],
    3: [
      { id: 16, nombre: 'Nicolás', apellido: 'Jiménez', presente: true, horaEntrada: '07:55', temperatura: 36.5 },
      { id: 17, nombre: 'Isabella', apellido: 'Vargas', presente: true, horaEntrada: '08:05', temperatura: 36.2 },
      { id: 18, nombre: 'Santiago', apellido: 'Rojas', presente: false },
      { id: 19, nombre: 'Victoria', apellido: 'Mendoza', presente: true, horaEntrada: '07:40', temperatura: 36.8 },
      { id: 20, nombre: 'Facundo', apellido: 'Acosta', presente: true, horaEntrada: '08:15', temperatura: 36.3 }
    ],
    4: [
      { id: 21, nombre: 'Martina', apellido: 'Benitez', presente: true, horaEntrada: '07:50', temperatura: 36.5 },
      { id: 22, nombre: 'Tomás', apellido: 'Córdoba', presente: true, horaEntrada: '08:00', temperatura: 36.4 },
      { id: 23, nombre: 'Jazmín', apellido: 'Figueroa', presente: false, justificacion: 'Viaje familiar' },
      { id: 24, nombre: 'Bruno', apellido: 'Luna', presente: true, horaEntrada: '07:45', temperatura: 36.6 },
      { id: 25, nombre: 'Luciana', apellido: 'Soto', presente: true, horaEntrada: '08:10', temperatura: 36.3 }
    ],
    5: [
      { id: 26, nombre: 'Agustín', apellido: 'Cruz', presente: true, horaEntrada: '07:55', temperatura: 36.5 },
      { id: 27, nombre: 'Mía', apellido: 'Flores', presente: true, horaEntrada: '08:05', temperatura: 36.2 },
      { id: 28, nombre: 'Thiago', apellido: 'Reyes', presente: true, horaEntrada: '07:40', temperatura: 36.7 },
      { id: 29, nombre: 'Emma', apellido: 'Morales', presente: false },
             { id: 30, nombre: 'Axel', apellido: 'Herrera', presente: true, horaEntrada: '08:15', temperatura: 36.4 }
     ]
   };

  // Datos de ejemplo para alumnos de primaria
  const alumnosPrimariaEjemplo: { [key: number]: AlumnoPrimaria[] } = {
    1: [
      { id: 101, nombre: 'Santiago', apellido: 'García', presente: true, horaEntrada: '07:30', temperatura: 36.5 },
      { id: 102, nombre: 'Valentina', apellido: 'López', presente: true, horaEntrada: '07:35', temperatura: 36.3 },
      { id: 103, nombre: 'Mateo', apellido: 'Rodríguez', presente: false, justificacion: 'Enfermedad' },
      { id: 104, nombre: 'Isabella', apellido: 'Martínez', presente: true, horaEntrada: '07:40', temperatura: 36.6 },
      { id: 105, nombre: 'Lucas', apellido: 'Fernández', presente: true, horaEntrada: '07:25', temperatura: 36.4 }
    ],
    2: [
      { id: 106, nombre: 'Emma', apellido: 'González', presente: true, horaEntrada: '07:30', temperatura: 36.5 },
      { id: 107, nombre: 'Nicolás', apellido: 'Pérez', presente: true, horaEntrada: '07:35', temperatura: 36.2 },
      { id: 108, nombre: 'Sofía', apellido: 'Silva', presente: false },
      { id: 109, nombre: 'Tomás', apellido: 'Torres', presente: true, horaEntrada: '07:40', temperatura: 36.7 },
      { id: 110, nombre: 'Camila', apellido: 'Herrera', presente: true, horaEntrada: '07:25', temperatura: 36.3 }
    ],
    3: [
      { id: 111, nombre: 'Agustín', apellido: 'Castro', presente: true, horaEntrada: '07:30', temperatura: 36.5 },
      { id: 112, nombre: 'Mía', apellido: 'Morales', presente: true, horaEntrada: '07:35', temperatura: 36.4 },
      { id: 113, nombre: 'Thiago', apellido: 'Ruiz', presente: false, justificacion: 'Cita médica' },
      { id: 114, nombre: 'Luna', apellido: 'Díaz', presente: true, horaEntrada: '07:40', temperatura: 36.6 },
      { id: 115, nombre: 'Axel', apellido: 'Moreno', presente: true, horaEntrada: '07:25', temperatura: 36.3 }
    ],
    4: [
      { id: 116, nombre: 'Bruno', apellido: 'Jiménez', presente: true, horaEntrada: '07:30', temperatura: 36.5 },
      { id: 117, nombre: 'Victoria', apellido: 'Vargas', presente: true, horaEntrada: '07:35', temperatura: 36.2 },
      { id: 118, nombre: 'Facundo', apellido: 'Rojas', presente: false },
      { id: 119, nombre: 'Martina', apellido: 'Mendoza', presente: true, horaEntrada: '07:40', temperatura: 36.7 },
      { id: 120, nombre: 'Santiago', apellido: 'Acosta', presente: true, horaEntrada: '07:25', temperatura: 36.4 }
    ],
    5: [
      { id: 121, nombre: 'Jazmín', apellido: 'Benitez', presente: true, horaEntrada: '07:30', temperatura: 36.5 },
      { id: 122, nombre: 'Matías', apellido: 'Córdoba', presente: true, horaEntrada: '07:35', temperatura: 36.3 },
      { id: 123, nombre: 'Luciana', apellido: 'Figueroa', presente: false, justificacion: 'Viaje familiar' },
      { id: 124, nombre: 'Nicolás', apellido: 'Luna', presente: true, horaEntrada: '07:40', temperatura: 36.6 },
      { id: 125, nombre: 'Agustina', apellido: 'Soto', presente: true, horaEntrada: '07:25', temperatura: 36.4 }
    ],
    6: [
      { id: 126, nombre: 'Florencia', apellido: 'Cruz', presente: true, horaEntrada: '07:30', temperatura: 36.5 },
      { id: 127, nombre: 'Diego', apellido: 'Flores', presente: true, horaEntrada: '07:35', temperatura: 36.2 },
      { id: 128, nombre: 'Valentina', apellido: 'Reyes', presente: false },
      { id: 129, nombre: 'Lucas', apellido: 'Morales', presente: true, horaEntrada: '07:40', temperatura: 36.7 },
      { id: 130, nombre: 'Isabella', apellido: 'Herrera', presente: true, horaEntrada: '07:25', temperatura: 36.3 }
    ],
    7: [
      { id: 131, nombre: 'Mateo', apellido: 'García', presente: true, horaEntrada: '07:30', temperatura: 36.5 },
      { id: 132, nombre: 'Sofía', apellido: 'López', presente: true, horaEntrada: '07:35', temperatura: 36.4 },
      { id: 133, nombre: 'Tomás', apellido: 'Rodríguez', presente: false, justificacion: 'Enfermedad' },
      { id: 134, nombre: 'Camila', apellido: 'Martínez', presente: true, horaEntrada: '07:40', temperatura: 36.6 },
      { id: 135, nombre: 'Agustín', apellido: 'Fernández', presente: true, horaEntrada: '07:25', temperatura: 36.3 }
    ]
  };

  // Datos de ejemplo para profesores
  const profesoresEjemplo: Profesor[] = [
    { id: 201, nombre: 'María', apellido: 'González', materia: 'Matemáticas', presente: true, horaEntrada: '07:15', temperatura: 36.5 },
    { id: 202, nombre: 'Juan', apellido: 'Pérez', materia: 'Lengua', presente: true, horaEntrada: '07:20', temperatura: 36.3 },
    { id: 203, nombre: 'Ana', apellido: 'Rodríguez', materia: 'Ciencias Naturales', presente: false, justificacion: 'Cita médica' },
    { id: 204, nombre: 'Carlos', apellido: 'López', materia: 'Historia', presente: true, horaEntrada: '07:25', temperatura: 36.7 },
    { id: 205, nombre: 'Laura', apellido: 'Martínez', materia: 'Geografía', presente: true, horaEntrada: '07:10', temperatura: 36.4 },
    { id: 206, nombre: 'Diego', apellido: 'Silva', materia: 'Educación Física', presente: true, horaEntrada: '07:30', temperatura: 36.6 },
    { id: 207, nombre: 'Sofía', apellido: 'Torres', materia: 'Arte', presente: false },
    { id: 208, nombre: 'Miguel', apellido: 'Herrera', materia: 'Música', presente: true, horaEntrada: '07:35', temperatura: 36.2 },
    { id: 209, nombre: 'Valentina', apellido: 'Castro', materia: 'Inglés', presente: true, horaEntrada: '07:20', temperatura: 36.5 },
    { id: 210, nombre: 'Andrés', apellido: 'Morales', materia: 'Tecnología', presente: true, horaEntrada: '07:15', temperatura: 36.3 }
  ];

  // Datos de ejemplo para personal
  const personalEjemplo: Personal[] = [
    { id: 301, nombre: 'Roberto', apellido: 'García', cargo: 'Director', presente: true, horaEntrada: '07:00', temperatura: 36.5 },
    { id: 302, nombre: 'Carmen', apellido: 'López', cargo: 'Vicedirectora', presente: true, horaEntrada: '07:05', temperatura: 36.3 },
    { id: 303, nombre: 'Pedro', apellido: 'Rodríguez', cargo: 'Secretario', presente: true, horaEntrada: '07:10', temperatura: 36.6 },
    { id: 304, nombre: 'Elena', apellido: 'Martínez', cargo: 'Preceptora', presente: true, horaEntrada: '07:15', temperatura: 36.4 },
    { id: 305, nombre: 'Ricardo', apellido: 'Fernández', cargo: 'Portero', presente: true, horaEntrada: '06:30', temperatura: 36.7 },
    { id: 306, nombre: 'Silvia', apellido: 'Silva', cargo: 'Bibliotecaria', presente: false, justificacion: 'Enfermedad' },
    { id: 307, nombre: 'Héctor', apellido: 'Torres', cargo: 'Mantenimiento', presente: true, horaEntrada: '07:20', temperatura: 36.2 },
    { id: 308, nombre: 'Nora', apellido: 'Herrera', cargo: 'Cocinera', presente: true, horaEntrada: '06:45', temperatura: 36.5 },
    { id: 309, nombre: 'Oscar', apellido: 'Castro', cargo: 'Seguridad', presente: true, horaEntrada: '06:30', temperatura: 36.3 },
    { id: 310, nombre: 'Rosa', apellido: 'Morales', cargo: 'Limpieza', presente: false }
  ];

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setPersonas(personasEjemplo);
      setAsistencias(asistenciasEjemplo);
      setLoading(false);
    }, 1000);
  }, []);

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const asistenciasFiltradas = asistencias.filter(asistencia => {
    const fechaMatch = !filtros.fecha || asistencia.fecha_hora.includes(filtros.fecha);
    const personaMatch = !filtros.persona || asistencia.persona.nombre.toLowerCase().includes(filtros.persona.toLowerCase());
    const estadoMatch = !filtros.estado || asistencia.estado.nombre === filtros.estado;
    const tipoMatch = !filtros.tipo || 
      (filtros.tipo === 'alumno' && asistencia.persona.curso) ||
      (filtros.tipo === 'profesor' && !asistencia.persona.curso && asistencia.persona.nombre.includes('Prof')) ||
      (filtros.tipo === 'personal' && !asistencia.persona.curso && !asistencia.persona.nombre.includes('Prof'));
    
    const searchMatch = !searchTerm || 
      asistencia.persona.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asistencia.persona.curso && asistencia.persona.curso.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      asistencia.estado.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asistencia.temperatura.toString().includes(searchTerm);
    
    return fechaMatch && personaMatch && estadoMatch && tipoMatch && searchMatch;
  });

  const getSortedData = (data: Asistencia[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortConfig.key) {
        case 'persona':
          aValue = a.persona.nombre.toLowerCase();
          bValue = b.persona.nombre.toLowerCase();
          break;
        case 'tipo':
          aValue = a.persona.curso ? 'alumno' : a.persona.nombre.includes('Prof') ? 'profesor' : 'personal';
          bValue = b.persona.curso ? 'alumno' : b.persona.nombre.includes('Prof') ? 'profesor' : 'personal';
          break;
        case 'fecha':
          aValue = new Date(a.fecha_hora).getTime();
          bValue = new Date(b.fecha_hora).getTime();
          break;
        case 'temperatura':
          aValue = a.estado.nombre === 'Ausente' ? -1 : a.temperatura;
          bValue = b.estado.nombre === 'Ausente' ? -1 : b.temperatura;
          break;
        case 'estado':
          aValue = a.estado.nombre.toLowerCase();
          bValue = b.estado.nombre.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Ordenamiento y paginación
  const asistenciasOrdenadas = getSortedData(asistenciasFiltradas);
  const totalPages = Math.ceil(asistenciasOrdenadas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAsistencias = asistenciasOrdenadas.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ message, type });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const persona = personas.find(p => p.idPersona.toString() === nuevaAsistencia.personaId);
    if (!persona) return;

    const nuevaAsistenciaObj: Asistencia = {
      idAsistencia: asistencias.length + 1,
      persona: {
        idPersona: persona.idPersona,
        nombre: persona.nombre,
        curso: persona.curso
      },
      fecha_hora: new Date().toISOString(),
      temperatura: parseFloat(nuevaAsistencia.temperatura),
      estado: {
        idEstadoAsistencia: parseInt(nuevaAsistencia.estado),
        nombre: nuevaAsistencia.estado === '1' ? 'Presente' : 'Ausente'
      }
    };

    setAsistencias(prev => [nuevaAsistenciaObj, ...prev]);
    setNuevaAsistencia({ personaId: '', temperatura: '', estado: '1' });
    setShowForm(false);
    showNotification('Asistencia registrada exitosamente', 'success');
  };

  const getEstadoBadge = (estado: string) => {
    return estado === 'Presente' ? 'bg-success' : 'bg-danger';
  };

  const getTipoBadge = (persona: any) => {
    if (persona.curso) return 'bg-primary';
    if (persona.nombre.includes('Prof')) return 'bg-warning';
    return 'bg-info';
  };

  const handleEdit = (asistencia: Asistencia) => {
    setEditingId(asistencia.idAsistencia);
    setEditingData({
      temperatura: asistencia.estado.nombre === 'Ausente' ? '0' : asistencia.temperatura.toString(),
      estado: asistencia.estado.idEstadoAsistencia.toString()
    });
  };

  const handleSaveEdit = (id: number) => {
    const asistenciaIndex = asistencias.findIndex(a => a.idAsistencia === id);
    if (asistenciaIndex === -1) return;

    const isPresente = editingData.estado === '1';
    const updatedAsistencias = [...asistencias];
    updatedAsistencias[asistenciaIndex] = {
      ...updatedAsistencias[asistenciaIndex],
      temperatura: isPresente ? parseFloat(editingData.temperatura) : 0,
      fecha_hora: isPresente ? updatedAsistencias[asistenciaIndex].fecha_hora : new Date(updatedAsistencias[asistenciaIndex].fecha_hora.split('T')[0] + 'T00:00:00').toISOString(),
      estado: {
        idEstadoAsistencia: parseInt(editingData.estado),
        nombre: isPresente ? 'Presente' : 'Ausente'
      }
    };

    setAsistencias(updatedAsistencias);
    setEditingId(null);
    setEditingData({ temperatura: '', estado: '1' });
    showNotification('Asistencia actualizada exitosamente', 'success');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({ temperatura: '', estado: '1' });
  };

  const handleDelete = (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta asistencia?')) {
      setAsistencias(prev => prev.filter(a => a.idAsistencia !== id));
      showNotification('Asistencia eliminada exitosamente', 'success');
    }
  };

  const handleExport = (type: string) => {
    if (type === 'error') {
      showNotification('Error al exportar el archivo', 'error');
    } else {
      showNotification(`Archivo exportado exitosamente en formato ${type.toUpperCase()}`, 'success');
    }
  };

  // Funciones para la pestaña Secundaria
  const handleYearSelect = (yearId: number) => {
    setSelectedYear(yearId);
    setLoadingSecundaria(true);
    
    // Simular carga de datos
    setTimeout(() => {
      setAlumnosSecundaria(alumnosEjemplo[yearId] || []);
      setLoadingSecundaria(false);
    }, 500);
  };

  // Funciones para la pestaña Primaria
  const handleYearSelectPrimaria = (yearId: number) => {
    setSelectedYearPrimaria(yearId);
    setLoadingPrimaria(true);
    
    // Simular carga de datos
    setTimeout(() => {
      setAlumnosPrimaria(alumnosPrimariaEjemplo[yearId] || []);
      setLoadingPrimaria(false);
    }, 500);
  };

  // Funciones para la pestaña Profesores
  const handleLoadProfesores = () => {
    setLoadingProfesores(true);
    
    // Simular carga de datos
    setTimeout(() => {
      setProfesores(profesoresEjemplo);
      setLoadingProfesores(false);
    }, 500);
  };

  // Funciones para la pestaña Personal
  const handleLoadPersonal = () => {
    setLoadingPersonal(true);
    
    // Simular carga de datos
    setTimeout(() => {
      setPersonal(personalEjemplo);
      setLoadingPersonal(false);
    }, 500);
  };

  const getEPAStats = (alumnos: AlumnoSecundaria[] | AlumnoPrimaria[]) => {
    const total = alumnos.length;
    const presentes = alumnos.filter(a => a.presente).length;
    const ausentes = total - presentes;
    const porcentajePresentes = total > 0 ? Math.round((presentes / total) * 100) : 0;
    
    return { total, presentes, ausentes, porcentajePresentes };
  };

  const getStaffStats = <T extends { presente: boolean }>(staff: T[]) => {
    const total = staff.length;
    const presentes = staff.filter(s => s.presente).length;
    const ausentes = total - presentes;
    const porcentajePresentes = total > 0 ? Math.round((presentes / total) * 100) : 0;
    
    return { total, presentes, ausentes, porcentajePresentes };
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-3" style={{ maxWidth: '1200px' }} role="main" aria-label="Gestión de Asistencias">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {/* Header */}
      <div className="row mb-4">
        <div className="col-md-6">
          <h1 className="h2 mb-0 text-primary fw-bold">
            <i className="bi bi-calendar-check me-2" aria-hidden="true"></i>Gestión de Asistencias
          </h1>
        </div>
        <div className="col-md-6 text-end">
          <div className="d-flex gap-2 flex-wrap">
            <button 
              className={`btn ${showStats ? 'btn-success' : 'btn-outline-success'} shadow-sm fw-bold`}
              onClick={() => setShowStats(!showStats)}
              style={{ minWidth: '180px' }}
              aria-expanded={showStats}
              aria-controls="estadisticas-panel"
            >
              <i className="bi bi-graph-up me-2 fs-5" aria-hidden="true"></i>
              {showStats ? 'Ocultar' : 'Mostrar'} Estadísticas
            </button>
            <button 
              className="btn btn-primary shadow-sm"
              onClick={() => setShowForm(!showForm)}
              aria-expanded={showForm}
              aria-controls="formulario-asistencia"
            >
              <i className="bi bi-plus-circle me-2" aria-hidden="true"></i>
              {showForm ? 'Cancelar' : 'Nueva Asistencia'}
            </button>
          </div>
        </div>
      </div>

      {/* Pestañas de navegación */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow border-0 rounded-3">
            <div className="card-header bg-light rounded-top-3 p-0">
              <ul className="nav nav-tabs nav-fill border-0" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'general' ? 'active fw-bold' : ''} border-0 py-3`}
                    onClick={() => setActiveTab('general')}
                    role="tab"
                    aria-selected={activeTab === 'general'}
                    aria-controls="tab-general"
                  >
                    <i className="bi bi-list-ul me-2" aria-hidden="true"></i>
                    Vista General
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'secundaria' ? 'active fw-bold' : ''} border-0 py-3`}
                    onClick={() => setActiveTab('secundaria')}
                    role="tab"
                    aria-selected={activeTab === 'secundaria'}
                    aria-controls="tab-secundaria"
                  >
                    <i className="bi bi-mortarboard me-2" aria-hidden="true"></i>
                    Secundaria
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'primaria' ? 'active fw-bold' : ''} border-0 py-3`}
                    onClick={() => setActiveTab('primaria')}
                    role="tab"
                    aria-selected={activeTab === 'primaria'}
                    aria-controls="tab-primaria"
                  >
                    <i className="bi bi-book me-2" aria-hidden="true"></i>
                    Primaria
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'profesores' ? 'active fw-bold' : ''} border-0 py-3`}
                    onClick={() => setActiveTab('profesores')}
                    role="tab"
                    aria-selected={activeTab === 'profesores'}
                    aria-controls="tab-profesores"
                  >
                    <i className="bi bi-person-workspace me-2" aria-hidden="true"></i>
                    Profesores
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'personal' ? 'active fw-bold' : ''} border-0 py-3`}
                    onClick={() => setActiveTab('personal')}
                    role="tab"
                    aria-selected={activeTab === 'personal'}
                    aria-controls="tab-personal"
                  >
                    <i className="bi bi-person-badge me-2" aria-hidden="true"></i>
                    Personal
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido de las pestañas */}
      <div className="tab-content">
        {/* Pestaña Vista General */}
        <div 
          className={`tab-pane fade ${activeTab === 'general' ? 'show active' : ''}`} 
          id="tab-general" 
          role="tabpanel" 
          aria-labelledby="tab-general"
        >
          {/* Formulario de nueva asistencia */}
          {showForm && (
            <div className="row mb-4" id="formulario-asistencia" role="region" aria-label="Formulario de nueva asistencia">
              <div className="col-12">
                <div className="card shadow border-0 rounded-3">
                  <div className="card-header bg-primary text-white rounded-top-3">
                    <h2 className="h5 mb-0">
                      <i className="bi bi-person-plus me-2" aria-hidden="true"></i>Registrar Nueva Asistencia
                    </h2>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleSubmit}>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Persona</label>
                          <select
                            className="form-select"
                            value={nuevaAsistencia.personaId}
                            onChange={(e) => setNuevaAsistencia(prev => ({ ...prev, personaId: e.target.value }))}
                            required
                          >
                            <option value="">Seleccionar persona...</option>
                            {personas.map(persona => (
                              <option key={persona.idPersona} value={persona.idPersona}>
                                {persona.nombre} ({persona.tipo})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Temperatura (°C)</label>
                          <input
                            type="number"
                            className="form-control"
                            step="0.1"
                            min="35"
                            max="42"
                            value={nuevaAsistencia.temperatura}
                            onChange={(e) => setNuevaAsistencia(prev => ({ ...prev, temperatura: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Estado</label>
                          <select
                            className="form-select"
                            value={nuevaAsistencia.estado}
                            onChange={(e) => setNuevaAsistencia(prev => ({ ...prev, estado: e.target.value }))}
                            required
                          >
                            <option value="1">Presente</option>
                            <option value="2">Ausente</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-3">
                        <button type="submit" className="btn btn-success me-2">
                          <i className="bi bi-check-circle me-1"></i>Guardar
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={() => setShowForm(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Estadísticas */}
          {showStats && (
            <div className="row mb-4" id="estadisticas-panel" role="region" aria-label="Panel de estadísticas">
              <div className="col-12">
                <AsistenciasStats asistencias={asistenciasFiltradas} />
              </div>
            </div>
          )}

      {/* Búsqueda global y filtros */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow border-0 rounded-3">
            <div className="card-header bg-light rounded-top-3">
              <h3 className="h6 mb-0">
                <i className="bi bi-search me-2" aria-hidden="true"></i>Búsqueda y Filtros
              </h3>
            </div>
            <div className="card-body">
              {/* Búsqueda global */}
              <div className="row mb-3">
                <div className="col-12">
                                  <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search" aria-hidden="true"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar en todas las asistencias (nombre, curso, estado, temperatura)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Buscar asistencias"
                  />
                  {searchTerm && (
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={() => setSearchTerm('')}
                      title="Limpiar búsqueda"
                      aria-label="Limpiar búsqueda"
                    >
                      <i className="bi bi-x" aria-hidden="true"></i>
                    </button>
                  )}
                </div>
                </div>
              </div>
              
              {/* Filtros específicos */}
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Fecha</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filtros.fecha}
                    onChange={(e) => handleFiltroChange('fecha', e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Persona</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar por nombre..."
                    value={filtros.persona}
                    onChange={(e) => handleFiltroChange('persona', e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Estado</label>
                  <select
                    className="form-select"
                    value={filtros.estado}
                    onChange={(e) => handleFiltroChange('estado', e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="Presente">Presente</option>
                    <option value="Ausente">Ausente</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Tipo</label>
                  <select
                    className="form-select"
                    value={filtros.tipo}
                    onChange={(e) => handleFiltroChange('tipo', e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="alumno">Alumnos</option>
                    <option value="profesor">Profesores</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de asistencias */}
      <div className="row">
        <div className="col-12">
          <div className="card shadow border-0 rounded-3">
            <div className="card-header bg-light rounded-top-3 d-flex justify-content-between align-items-center">
              <h3 className="h6 mb-0">
                <i className="bi bi-list-ul me-2" aria-hidden="true"></i>Asistencias ({asistenciasFiltradas.length})
              </h3>
              <div className="d-flex align-items-center gap-2">
                <div className="d-flex align-items-center">
                  <label className="form-label mb-0 me-2 small">Mostrar:</label>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: '70px' }}
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <ExportButton 
                  data={asistenciasFiltradas}
                  filename={`asistencias_${new Date().toISOString().split('T')[0]}`}
                  onExport={handleExport}
                />
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0" role="table" aria-label="Lista de asistencias">
                  <thead className="table-light">
                    <tr>
                      <th>
                        <button 
                          className="btn btn-link p-0 text-decoration-none text-dark fw-bold"
                          onClick={() => handleSort('persona')}
                        >
                          Persona
                          {sortConfig?.key === 'persona' && (
                            <i className={`bi ms-1 ${sortConfig.direction === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'}`}></i>
                          )}
                        </button>
                      </th>
                      <th>
                        <button 
                          className="btn btn-link p-0 text-decoration-none text-dark fw-bold"
                          onClick={() => handleSort('tipo')}
                        >
                          Tipo
                          {sortConfig?.key === 'tipo' && (
                            <i className={`bi ms-1 ${sortConfig.direction === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'}`}></i>
                          )}
                        </button>
                      </th>
                      <th>
                        <button 
                          className="btn btn-link p-0 text-decoration-none text-dark fw-bold"
                          onClick={() => handleSort('fecha')}
                        >
                          Fecha y Hora
                          {sortConfig?.key === 'fecha' && (
                            <i className={`bi ms-1 ${sortConfig.direction === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'}`}></i>
                          )}
                        </button>
                      </th>
                      <th>
                        <button 
                          className="btn btn-link p-0 text-decoration-none text-dark fw-bold"
                          onClick={() => handleSort('temperatura')}
                        >
                          Temperatura
                          {sortConfig?.key === 'temperatura' && (
                            <i className={`bi ms-1 ${sortConfig.direction === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'}`}></i>
                          )}
                        </button>
                      </th>
                      <th>
                        <button 
                          className="btn btn-link p-0 text-decoration-none text-dark fw-bold"
                          onClick={() => handleSort('estado')}
                        >
                          Estado
                          {sortConfig?.key === 'estado' && (
                            <i className={`bi ms-1 ${sortConfig.direction === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'}`}></i>
                          )}
                        </button>
                      </th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAsistencias.map(asistencia => (
                      <tr key={asistencia.idAsistencia}>
                        <td>
                          <div>
                            <div className="fw-bold">{asistencia.persona.nombre}</div>
                            {asistencia.persona.curso && (
                              <small className="text-muted">{asistencia.persona.curso.nombre}</small>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getTipoBadge(asistencia.persona)}`}>
                            {asistencia.persona.curso ? 'Alumno' : 
                             asistencia.persona.nombre.includes('Prof') ? 'Profesor' : 'Personal'}
                          </span>
                        </td>
                        <td>
                          {asistencia.estado.nombre === 'Ausente' ? (
                            <span className="text-muted">-</span>
                          ) : (
                            new Date(asistencia.fecha_hora).toLocaleString('es-ES', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          )}
                        </td>
                        <td>
                          {editingId === asistencia.idAsistencia ? (
                            asistencia.estado.nombre === 'Ausente' ? (
                              <span className="text-muted small">No aplica</span>
                            ) : (
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                step="0.1"
                                min="35"
                                max="42"
                                value={editingData.temperatura}
                                onChange={(e) => setEditingData(prev => ({ ...prev, temperatura: e.target.value }))}
                                style={{ width: '80px' }}
                              />
                            )
                          ) : (
                            asistencia.estado.nombre === 'Ausente' ? (
                              <span className="text-muted">-</span>
                            ) : (
                              <span className={`fw-bold ${asistencia.temperatura > 37 ? 'text-danger' : 'text-success'}`}>
                                {asistencia.temperatura}°C
                              </span>
                            )
                          )}
                        </td>
                        <td>
                          {editingId === asistencia.idAsistencia ? (
                            <select
                              className="form-select form-select-sm"
                              value={editingData.estado}
                              onChange={(e) => setEditingData(prev => ({ ...prev, estado: e.target.value }))}
                              style={{ width: '100px' }}
                            >
                              <option value="1">Presente</option>
                              <option value="2">Ausente</option>
                            </select>
                          ) : (
                            <span className={`badge ${getEstadoBadge(asistencia.estado.nombre)}`}>
                              {asistencia.estado.nombre}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            {editingId === asistencia.idAsistencia ? (
                              <>
                                <button 
                                  className="btn btn-outline-success"
                                  onClick={() => handleSaveEdit(asistencia.idAsistencia)}
                                  title="Guardar"
                                >
                                  <i className="bi bi-check"></i>
                                </button>
                                <button 
                                  className="btn btn-outline-secondary"
                                  onClick={handleCancelEdit}
                                  title="Cancelar"
                                >
                                  <i className="bi bi-x"></i>
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  className="btn btn-outline-primary"
                                  onClick={() => handleEdit(asistencia)}
                                  title="Editar"
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button 
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDelete(asistencia.idAsistencia)}
                                  title="Eliminar"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {asistenciasFiltradas.length === 0 && (
                <div className="text-center py-4" role="status" aria-live="polite">
                  <i className="bi bi-inbox display-4 text-muted" aria-hidden="true"></i>
                  <p className="text-muted mt-2">No se encontraron asistencias con los filtros aplicados</p>
                </div>
              )}
              
              {/* Paginación */}
              {totalPages > 1 && (
                <div className="card-footer bg-light border-0">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="small text-muted">
                      Mostrando {startIndex + 1} a {Math.min(endIndex, asistenciasFiltradas.length)} de {asistenciasFiltradas.length} asistencias
                    </div>
                    <nav aria-label="Navegación de páginas">
                      <ul className="pagination pagination-sm mb-0">
                        {/* Botón Anterior */}
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <i className="bi bi-chevron-left"></i>
                          </button>
                        </li>
                        
                        {/* Números de página */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                          // Mostrar solo algunas páginas para no saturar la interfaz
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => handlePageChange(page)}
                                >
                                  {page}
                                </button>
                              </li>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <li key={page} className="page-item disabled">
                                <span className="page-link">...</span>
                              </li>
                            );
                          }
                          return null;
                        })}
                        
                        {/* Botón Siguiente */}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            <i className="bi bi-chevron-right"></i>
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
        </div>

        {/* Pestaña Secundaria */}
        <div 
          className={`tab-pane fade ${activeTab === 'secundaria' ? 'show active' : ''}`} 
          id="tab-secundaria" 
          role="tabpanel" 
          aria-labelledby="tab-secundaria"
        >
          <div className="row mb-4">
            <div className="col-12">
              <div className="card shadow border-0 rounded-3">
                <div className="card-header bg-primary text-white rounded-top-3">
                  <h2 className="h5 mb-0">
                    <i className="bi bi-mortarboard me-2" aria-hidden="true"></i>EPA - Secundaria
                  </h2>
                </div>
                <div className="card-body">
                  {/* Selección de año */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h3 className="h6 mb-3">Selecciona el año:</h3>
                      <div className="d-flex gap-2 flex-wrap">
                        {añosSecundaria.map(año => (
                          <button
                            key={año.id}
                            className={`btn ${selectedYear === año.id ? 'btn-primary' : 'btn-outline-primary'} shadow-sm`}
                            onClick={() => handleYearSelect(año.id)}
                            style={{ minWidth: '120px' }}
                          >
                            <i className="bi bi-calendar-check me-2" aria-hidden="true"></i>
                            {año.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* EPA del día seleccionado */}
                  {selectedYear && (
                    <div className="row">
                      <div className="col-12">
                        <div className="card border-primary">
                          <div className="card-header bg-light border-primary">
                            <h4 className="h6 mb-0">
                              <i className="bi bi-graph-up me-2 text-primary" aria-hidden="true"></i>
                              EPA del {getCurrentDate()} - {añosSecundaria.find(a => a.id === selectedYear)?.nombre}
                            </h4>
                          </div>
                          <div className="card-body">
                            {loadingSecundaria ? (
                              <div className="text-center py-4">
                                <div className="spinner-border text-primary" role="status">
                                  <span className="visually-hidden">Cargando...</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Estadísticas del EPA */}
                                <div className="row mb-4">
                                  {(() => {
                                    const stats = getEPAStats(alumnosSecundaria);
                                    return (
                                      <>
                                        <div className="col-md-3">
                                          <div className="card bg-primary text-white text-center">
                                            <div className="card-body py-3">
                                              <i className="bi bi-people-fill fs-2 mb-2" aria-hidden="true"></i>
                                              <h5 className="mb-1">{stats.total}</h5>
                                              <small>Total Alumnos</small>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="col-md-3">
                                          <div className="card bg-success text-white text-center">
                                            <div className="card-body py-3">
                                              <i className="bi bi-person-check-fill fs-2 mb-2" aria-hidden="true"></i>
                                              <h5 className="mb-1">{stats.presentes}</h5>
                                              <small>Presentes</small>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="col-md-3">
                                          <div className="card bg-danger text-white text-center">
                                            <div className="card-body py-3">
                                              <i className="bi bi-person-x-fill fs-2 mb-2" aria-hidden="true"></i>
                                              <h5 className="mb-1">{stats.ausentes}</h5>
                                              <small>Ausentes</small>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="col-md-3">
                                          <div className="card bg-info text-white text-center">
                                            <div className="card-body py-3">
                                              <i className="bi bi-percent fs-2 mb-2" aria-hidden="true"></i>
                                              <h5 className="mb-1">{stats.porcentajePresentes}%</h5>
                                              <small>Asistencia</small>
                                            </div>
                                          </div>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>

                                {/* Lista de alumnos */}
                                <div className="table-responsive">
                                  <table className="table table-hover">
                                    <thead className="table-light">
                                      <tr>
                                        <th>#</th>
                                        <th>Alumno</th>
                                        <th>Estado</th>
                                        <th>Hora Entrada</th>
                                        <th>Temperatura</th>
                                        <th>Justificación</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {alumnosSecundaria.map((alumno, index) => (
                                        <tr key={alumno.id}>
                                          <td className="fw-bold">{index + 1}</td>
                                          <td>
                                            <div className="fw-bold">
                                              {alumno.apellido}, {alumno.nombre}
                                            </div>
                                          </td>
                                          <td>
                                            <span className={`badge ${alumno.presente ? 'bg-success' : 'bg-danger'}`}>
                                              {alumno.presente ? 'Presente' : 'Ausente'}
                                            </span>
                                          </td>
                                          <td>
                                            {alumno.presente ? (
                                              <span className="text-success fw-bold">
                                                {alumno.horaEntrada}
                                              </span>
                                            ) : (
                                              <span className="text-muted">-</span>
                                            )}
                                          </td>
                                          <td>
                                            {alumno.presente ? (
                                              <span className={`fw-bold ${alumno.temperatura && alumno.temperatura > 37 ? 'text-danger' : 'text-success'}`}>
                                                {alumno.temperatura}°C
                                              </span>
                                            ) : (
                                              <span className="text-muted">-</span>
                                            )}
                                          </td>
                                          <td>
                                            {alumno.justificacion ? (
                                              <span className="badge bg-warning text-dark">
                                                {alumno.justificacion}
                                              </span>
                                            ) : (
                                              <span className="text-muted">-</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mensaje cuando no hay año seleccionado */}
                  {!selectedYear && (
                    <div className="text-center py-5">
                      <i className="bi bi-calendar-x display-4 text-muted" aria-hidden="true"></i>
                      <h4 className="text-muted mt-3">Selecciona un año para ver el EPA</h4>
                      <p className="text-muted">Elige uno de los años de secundaria para visualizar las estadísticas de presencia y ausencia del día.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pestaña Primaria */}
        <div 
          className={`tab-pane fade ${activeTab === 'primaria' ? 'show active' : ''}`} 
          id="tab-primaria" 
          role="tabpanel" 
          aria-labelledby="tab-primaria"
        >
          <div className="row mb-4">
            <div className="col-12">
              <div className="card shadow border-0 rounded-3">
                <div className="card-header bg-success text-white rounded-top-3">
                  <h2 className="h5 mb-0">
                    <i className="bi bi-book me-2" aria-hidden="true"></i>EPA - Primaria
                  </h2>
                </div>
                <div className="card-body">
                  {/* Selección de año */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h3 className="h6 mb-3">Selecciona el grado:</h3>
                      <div className="d-flex gap-2 flex-wrap">
                        {añosPrimaria.map(año => (
                          <button
                            key={año.id}
                            className={`btn ${selectedYearPrimaria === año.id ? 'btn-success' : 'btn-outline-success'} shadow-sm`}
                            onClick={() => handleYearSelectPrimaria(año.id)}
                            style={{ minWidth: '120px' }}
                          >
                            <i className="bi bi-calendar-check me-2" aria-hidden="true"></i>
                            {año.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* EPA del día seleccionado */}
                  {selectedYearPrimaria && (
                    <div className="row">
                      <div className="col-12">
                        <div className="card border-success">
                          <div className="card-header bg-light border-success">
                            <h4 className="h6 mb-0">
                              <i className="bi bi-graph-up me-2 text-success" aria-hidden="true"></i>
                              EPA del {getCurrentDate()} - {añosPrimaria.find(a => a.id === selectedYearPrimaria)?.nombre}
                            </h4>
                          </div>
                          <div className="card-body">
                            {loadingPrimaria ? (
                              <div className="text-center py-4">
                                <div className="spinner-border text-success" role="status">
                                  <span className="visually-hidden">Cargando...</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Estadísticas del EPA */}
                                <div className="row mb-4">
                                  {(() => {
                                    const stats = getEPAStats(alumnosPrimaria);
                                    return (
                                      <>
                                        <div className="col-md-3">
                                          <div className="card bg-success text-white text-center">
                                            <div className="card-body py-3">
                                              <i className="bi bi-people-fill fs-2 mb-2" aria-hidden="true"></i>
                                              <h5 className="mb-1">{stats.total}</h5>
                                              <small>Total Alumnos</small>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="col-md-3">
                                          <div className="card bg-primary text-white text-center">
                                            <div className="card-body py-3">
                                              <i className="bi bi-person-check-fill fs-2 mb-2" aria-hidden="true"></i>
                                              <h5 className="mb-1">{stats.presentes}</h5>
                                              <small>Presentes</small>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="col-md-3">
                                          <div className="card bg-danger text-white text-center">
                                            <div className="card-body py-3">
                                              <i className="bi bi-person-x-fill fs-2 mb-2" aria-hidden="true"></i>
                                              <h5 className="mb-1">{stats.ausentes}</h5>
                                              <small>Ausentes</small>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="col-md-3">
                                          <div className="card bg-info text-white text-center">
                                            <div className="card-body py-3">
                                              <i className="bi bi-percent fs-2 mb-2" aria-hidden="true"></i>
                                              <h5 className="mb-1">{stats.porcentajePresentes}%</h5>
                                              <small>Asistencia</small>
                                            </div>
                                          </div>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>

                                {/* Lista de alumnos */}
                                <div className="table-responsive">
                                  <table className="table table-hover">
                                    <thead className="table-light">
                                      <tr>
                                        <th>#</th>
                                        <th>Alumno</th>
                                        <th>Estado</th>
                                        <th>Hora Entrada</th>
                                        <th>Temperatura</th>
                                        <th>Justificación</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {alumnosPrimaria.map((alumno, index) => (
                                        <tr key={alumno.id}>
                                          <td className="fw-bold">{index + 1}</td>
                                          <td>
                                            <div className="fw-bold">
                                              {alumno.apellido}, {alumno.nombre}
                                            </div>
                                          </td>
                                          <td>
                                            <span className={`badge ${alumno.presente ? 'bg-success' : 'bg-danger'}`}>
                                              {alumno.presente ? 'Presente' : 'Ausente'}
                                            </span>
                                          </td>
                                          <td>
                                            {alumno.presente ? (
                                              <span className="text-success fw-bold">
                                                {alumno.horaEntrada}
                                              </span>
                                            ) : (
                                              <span className="text-muted">-</span>
                                            )}
                                          </td>
                                          <td>
                                            {alumno.presente ? (
                                              <span className={`fw-bold ${alumno.temperatura && alumno.temperatura > 37 ? 'text-danger' : 'text-success'}`}>
                                                {alumno.temperatura}°C
                                              </span>
                                            ) : (
                                              <span className="text-muted">-</span>
                                            )}
                                          </td>
                                          <td>
                                            {alumno.justificacion ? (
                                              <span className="badge bg-warning text-dark">
                                                {alumno.justificacion}
                                              </span>
                                            ) : (
                                              <span className="text-muted">-</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mensaje cuando no hay año seleccionado */}
                  {!selectedYearPrimaria && (
                    <div className="text-center py-5">
                      <i className="bi bi-calendar-x display-4 text-muted" aria-hidden="true"></i>
                      <h4 className="text-muted mt-3">Selecciona un grado para ver el EPA</h4>
                      <p className="text-muted">Elige uno de los grados de primaria para visualizar las estadísticas de presencia y ausencia del día.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pestaña Profesores */}
        <div 
          className={`tab-pane fade ${activeTab === 'profesores' ? 'show active' : ''}`} 
          id="tab-profesores" 
          role="tabpanel" 
          aria-labelledby="tab-profesores"
        >
          <div className="row mb-4">
            <div className="col-12">
              <div className="card shadow border-0 rounded-3">
                <div className="card-header bg-warning text-dark rounded-top-3">
                  <h2 className="h5 mb-0">
                    <i className="bi bi-person-workspace me-2" aria-hidden="true"></i>Asistencia de Profesores
                  </h2>
                </div>
                <div className="card-body">
                  {/* Botón para cargar datos */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <button
                        className="btn btn-warning shadow-sm"
                        onClick={handleLoadProfesores}
                        disabled={loadingProfesores}
                      >
                        <i className="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>
                        {loadingProfesores ? 'Cargando...' : 'Cargar Datos de Profesores'}
                      </button>
                    </div>
                  </div>

                  {/* Estadísticas y lista de profesores */}
                  {profesores.length > 0 && (
                    <div className="row">
                      <div className="col-12">
                        <div className="card border-warning">
                          <div className="card-header bg-light border-warning">
                            <h4 className="h6 mb-0">
                              <i className="bi bi-graph-up me-2 text-warning" aria-hidden="true"></i>
                              Asistencia del {getCurrentDate()}
                            </h4>
                          </div>
                          <div className="card-body">
                            {/* Estadísticas */}
                            <div className="row mb-4">
                              {(() => {
                                const stats = getStaffStats(profesores);
                                return (
                                  <>
                                    <div className="col-md-3">
                                      <div className="card bg-warning text-dark text-center">
                                        <div className="card-body py-3">
                                          <i className="bi bi-people-fill fs-2 mb-2" aria-hidden="true"></i>
                                          <h5 className="mb-1">{stats.total}</h5>
                                          <small>Total Profesores</small>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="col-md-3">
                                      <div className="card bg-success text-white text-center">
                                        <div className="card-body py-3">
                                          <i className="bi bi-person-check-fill fs-2 mb-2" aria-hidden="true"></i>
                                          <h5 className="mb-1">{stats.presentes}</h5>
                                          <small>Presentes</small>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="col-md-3">
                                      <div className="card bg-danger text-white text-center">
                                        <div className="card-body py-3">
                                          <i className="bi bi-person-x-fill fs-2 mb-2" aria-hidden="true"></i>
                                          <h5 className="mb-1">{stats.ausentes}</h5>
                                          <small>Ausentes</small>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="col-md-3">
                                      <div className="card bg-info text-white text-center">
                                        <div className="card-body py-3">
                                          <i className="bi bi-percent fs-2 mb-2" aria-hidden="true"></i>
                                          <h5 className="mb-1">{stats.porcentajePresentes}%</h5>
                                          <small>Asistencia</small>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>

                            {/* Lista de profesores */}
                            <div className="table-responsive">
                              <table className="table table-hover">
                                <thead className="table-light">
                                  <tr>
                                    <th>#</th>
                                    <th>Profesor</th>
                                    <th>Materia</th>
                                    <th>Estado</th>
                                    <th>Hora Entrada</th>
                                    <th>Temperatura</th>
                                    <th>Justificación</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {profesores.map((profesor, index) => (
                                    <tr key={profesor.id}>
                                      <td className="fw-bold">{index + 1}</td>
                                      <td>
                                        <div className="fw-bold">
                                          {profesor.apellido}, {profesor.nombre}
                                        </div>
                                      </td>
                                      <td>
                                        <span className="badge bg-secondary">
                                          {profesor.materia}
                                        </span>
                                      </td>
                                      <td>
                                        <span className={`badge ${profesor.presente ? 'bg-success' : 'bg-danger'}`}>
                                          {profesor.presente ? 'Presente' : 'Ausente'}
                                        </span>
                                      </td>
                                      <td>
                                        {profesor.presente ? (
                                          <span className="text-success fw-bold">
                                            {profesor.horaEntrada}
                                          </span>
                                        ) : (
                                          <span className="text-muted">-</span>
                                        )}
                                      </td>
                                      <td>
                                        {profesor.presente ? (
                                          <span className={`fw-bold ${profesor.temperatura && profesor.temperatura > 37 ? 'text-danger' : 'text-success'}`}>
                                            {profesor.temperatura}°C
                                          </span>
                                        ) : (
                                          <span className="text-muted">-</span>
                                        )}
                                      </td>
                                      <td>
                                        {profesor.justificacion ? (
                                          <span className="badge bg-warning text-dark">
                                            {profesor.justificacion}
                                          </span>
                                        ) : (
                                          <span className="text-muted">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mensaje cuando no hay datos */}
                  {profesores.length === 0 && !loadingProfesores && (
                    <div className="text-center py-5">
                      <i className="bi bi-person-workspace display-4 text-muted" aria-hidden="true"></i>
                      <h4 className="text-muted mt-3">Carga los datos de profesores</h4>
                      <p className="text-muted">Haz clic en el botón para cargar la información de asistencia de los profesores.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pestaña Personal */}
        <div 
          className={`tab-pane fade ${activeTab === 'personal' ? 'show active' : ''}`} 
          id="tab-personal" 
          role="tabpanel" 
          aria-labelledby="tab-personal"
        >
          <div className="row mb-4">
            <div className="col-12">
              <div className="card shadow border-0 rounded-3">
                <div className="card-header bg-info text-white rounded-top-3">
                  <h2 className="h5 mb-0">
                    <i className="bi bi-person-badge me-2" aria-hidden="true"></i>Asistencia de Personal
                  </h2>
                </div>
                <div className="card-body">
                  {/* Botón para cargar datos */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <button
                        className="btn btn-info shadow-sm"
                        onClick={handleLoadPersonal}
                        disabled={loadingPersonal}
                      >
                        <i className="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>
                        {loadingPersonal ? 'Cargando...' : 'Cargar Datos de Personal'}
                      </button>
                    </div>
                  </div>

                  {/* Estadísticas y lista de personal */}
                  {personal.length > 0 && (
                    <div className="row">
                      <div className="col-12">
                        <div className="card border-info">
                          <div className="card-header bg-light border-info">
                            <h4 className="h6 mb-0">
                              <i className="bi bi-graph-up me-2 text-info" aria-hidden="true"></i>
                              Asistencia del {getCurrentDate()}
                            </h4>
                          </div>
                          <div className="card-body">
                            {/* Estadísticas */}
                            <div className="row mb-4">
                              {(() => {
                                const stats = getStaffStats(personal);
                                return (
                                  <>
                                    <div className="col-md-3">
                                      <div className="card bg-info text-white text-center">
                                        <div className="card-body py-3">
                                          <i className="bi bi-people-fill fs-2 mb-2" aria-hidden="true"></i>
                                          <h5 className="mb-1">{stats.total}</h5>
                                          <small>Total Personal</small>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="col-md-3">
                                      <div className="card bg-success text-white text-center">
                                        <div className="card-body py-3">
                                          <i className="bi bi-person-check-fill fs-2 mb-2" aria-hidden="true"></i>
                                          <h5 className="mb-1">{stats.presentes}</h5>
                                          <small>Presentes</small>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="col-md-3">
                                      <div className="card bg-danger text-white text-center">
                                        <div className="card-body py-3">
                                          <i className="bi bi-person-x-fill fs-2 mb-2" aria-hidden="true"></i>
                                          <h5 className="mb-1">{stats.ausentes}</h5>
                                          <small>Ausentes</small>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="col-md-3">
                                      <div className="card bg-primary text-white text-center">
                                        <div className="card-body py-3">
                                          <i className="bi bi-percent fs-2 mb-2" aria-hidden="true"></i>
                                          <h5 className="mb-1">{stats.porcentajePresentes}%</h5>
                                          <small>Asistencia</small>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>

                            {/* Lista de personal */}
                            <div className="table-responsive">
                              <table className="table table-hover">
                                <thead className="table-light">
                                  <tr>
                                    <th>#</th>
                                    <th>Personal</th>
                                    <th>Cargo</th>
                                    <th>Estado</th>
                                    <th>Hora Entrada</th>
                                    <th>Temperatura</th>
                                    <th>Justificación</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {personal.map((persona, index) => (
                                    <tr key={persona.id}>
                                      <td className="fw-bold">{index + 1}</td>
                                      <td>
                                        <div className="fw-bold">
                                          {persona.apellido}, {persona.nombre}
                                        </div>
                                      </td>
                                      <td>
                                        <span className="badge bg-secondary">
                                          {persona.cargo}
                                        </span>
                                      </td>
                                      <td>
                                        <span className={`badge ${persona.presente ? 'bg-success' : 'bg-danger'}`}>
                                          {persona.presente ? 'Presente' : 'Ausente'}
                                        </span>
                                      </td>
                                      <td>
                                        {persona.presente ? (
                                          <span className="text-success fw-bold">
                                            {persona.horaEntrada}
                                          </span>
                                        ) : (
                                          <span className="text-muted">-</span>
                                        )}
                                      </td>
                                      <td>
                                        {persona.presente ? (
                                          <span className={`fw-bold ${persona.temperatura && persona.temperatura > 37 ? 'text-danger' : 'text-success'}`}>
                                            {persona.temperatura}°C
                                          </span>
                                        ) : (
                                          <span className="text-muted">-</span>
                                        )}
                                      </td>
                                      <td>
                                        {persona.justificacion ? (
                                          <span className="badge bg-warning text-dark">
                                            {persona.justificacion}
                                          </span>
                                        ) : (
                                          <span className="text-muted">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mensaje cuando no hay datos */}
                  {personal.length === 0 && !loadingPersonal && (
                    <div className="text-center py-5">
                      <i className="bi bi-person-badge display-4 text-muted" aria-hidden="true"></i>
                      <h4 className="text-muted mt-3">Carga los datos de personal</h4>
                      <p className="text-muted">Haz clic en el botón para cargar la información de asistencia del personal.</p>
                    </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Asistencias; 