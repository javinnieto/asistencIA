import React, { useState, useEffect, useCallback } from 'react';
import PersonasTable from '../components/PersonasTable';
import PersonaForm from '../components/PersonaForm';
import PersonaDetails from '../components/PersonaDetails';
import ConflictoModal from '../components/ConflictoModal';
import { apiRequest, getConflictos } from '../config/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
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
  roles?: any[];
  requiere_salida?: boolean;
}



const Personas: React.FC = () => {
  const { showToast } = useToast();
  const { isAdmin, rol } = useAuth();
  const [personas, setPersonas] = useState<Person[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [isLoading, setIsLoading] = useState(true);

  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters state (server-side)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState('');



  // Conflicts State
  const [conflictos, setConflictos] = useState<any[]>([]);
  const [resolvingConflict, setResolvingConflict] = useState<any | null>(null);

  // Batch assign
  const [batchAssignIds, setBatchAssignIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Build query string for paginated listing
  const buildQueryString = useCallback((page: number, perPage: number, search: string, activo: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (activo) params.append('activo', activo);
    params.append('page', page.toString());
    params.append('page_size', perPage.toString());
    return params.toString();
  }, []);

  const transformPersona = (persona: any): Person => {
    const nombreCompleto = persona.nombre || 'Sin Nombre';
    const nombreParts = nombreCompleto.split(' ');
    const primerNombre = nombreParts[0] || '';
    const apellido = nombreParts.slice(1).join(' ') || '';

    let primaryRole = 'Sin asignar';
    if (persona.roles && persona.roles.length > 0) {
      primaryRole = persona.roles[0]?.tipo?.nombre || 'Sin asignar';
    }

    return {
      id: persona.idPersona?.toString() || '0',
      nombre: primerNombre,
      apellido: apellido,
      email: persona.email || '',
      telefono: persona.telefono || '',
      departamento: primaryRole,
      cargo: primaryRole,
      fechaIngreso: persona.fechaRegistro || '',
      estado: (persona.activo !== false ? 'activo' : 'inactivo'),
      foto: persona.foto,
      roles: persona.roles || [],
      requiere_salida: persona.requiere_salida || false
    };
  };

  const loadPersonas = useCallback(async (
    page = currentPage,
    perPage = itemsPerPage,
    search = searchTerm,
    activo = filterActivo,
    showLoader = true
  ) => {
    if (showLoader) setIsLoading(true);
    try {
      const qs = buildQueryString(page, perPage, search, activo);
      const [response, confRes] = await Promise.all([
        apiRequest(`/personas/?${qs}`),
        apiRequest(`/conflictos/?resuelto=false`)
      ]);

      if (confRes.ok) {
        const confData = await confRes.json();
        setConflictos(confData.results || confData || []);
      }

      if (response.ok) {
        const data = await response.json();
        const personasData = data.results || [];
        setPersonas(personasData.map(transformPersona));
        setTotalRecords(data.count ?? 0);
      } else {
        console.error('Error al cargar personas:', response.status);
        setPersonas([]);
      }
    } catch (error) {
      console.error('Error cargando personas:', error);
      setPersonas([]);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, filterActivo, buildQueryString]);

  // Reload when pagination/filter params change
  useEffect(() => {
    loadPersonas(currentPage, itemsPerPage, searchTerm, filterActivo);
  }, [currentPage, itemsPerPage, searchTerm, filterActivo]);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterActivoChange = (value: string) => {
    setFilterActivo(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handleItemsPerPageChange = (perPage: number) => {
    setItemsPerPage(perPage);
    setCurrentPage(1);
  };

  // Listen for conflict resolution events from Navbar
  useEffect(() => {
    const handleConflictosUpdated = () => {
      loadPersonas(currentPage, itemsPerPage, searchTerm, filterActivo, false);
    };
    window.addEventListener('conflictosUpdated', handleConflictosUpdated);
    return () => window.removeEventListener('conflictosUpdated', handleConflictosUpdated);
  }, [loadPersonas, currentPage, itemsPerPage, searchTerm, filterActivo]);

  const handleSyncDevice = async () => {
    try {
      showToast('Enviando solicitud de sincronización al dispositivo...', 'info');
      const response = await apiRequest('/personas/sync-device/', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        showToast(`Sincronización completada. ${data.message || ''}`, 'success');
        await loadPersonas(1, itemsPerPage, searchTerm, filterActivo);
        setCurrentPage(1);
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast('Error al solicitar la sincronización: ' + (errorData.error || response.statusText), 'error');
      }
    } catch (error) {
      showToast('Error de red al intentar sincronizar el dispositivo', 'error');
    }
  };

  const handleDeleteBatch = async (ids: string[]) => {
    try {
      const total = ids.length;
      const response = await apiRequest('/personas/bulk-delete/', {
        method: 'POST',
        body: JSON.stringify({ ids: ids.map(Number) })
      });
      if (response.ok) {
        const data = await response.json();
        const deleted = data.deleted ?? 0;
        const failed  = data.failed  ?? 0;
        if (failed === 0) {
          showToast(`Se eliminaron ${deleted} personas correctamente.`, 'success');
        } else {
          showToast(`Se eliminaron ${deleted} de ${total} personas. ${failed} fallaron.`, 'warning');
        }
      } else {
        const err = await response.json().catch(() => ({}));
        showToast('Error al eliminar el lote: ' + (err.error || response.statusText), 'error');
      }
      // Go back to page 1 to avoid empty page
      setCurrentPage(1);
      loadPersonas(1, itemsPerPage, searchTerm, filterActivo, true);
    } catch (e) {
      console.error(e);
      showToast('Error de red al eliminar el lote.', 'error');
    }
  };

  const handleAssignCourseBatch = (ids: string[]) => {
    setBatchAssignIds(ids);
    setIsAssignModalOpen(true);
  };

  const confirmAssignCourse = async (cursoId: string, tipoPersonaId: string, institucionId: string) => {
    try {
      const promises = batchAssignIds.map(async id => {
        const payload = {
          persona: parseInt(id),
          curso: parseInt(cursoId),
          tipo: parseInt(tipoPersonaId),
          institucion: parseInt(institucionId),
          activo: true
        };
        const res = await apiRequest('/persona_institucion/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || JSON.stringify(err) || 'Error desconocido');
        }
        return res.json();
      });
      await Promise.all(promises);
      showToast(`Se asignaron ${batchAssignIds.length} personas al curso correctamente`, 'success');
      setIsAssignModalOpen(false);
      setBatchAssignIds([]);
      loadPersonas(currentPage, itemsPerPage, searchTerm, filterActivo, false);
    } catch (e: any) {
      showToast('Error asignando personas: ' + e.message, 'error');
    }
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
    if (!id) {
      showToast('Error interno: ID de persona no válido', 'error');
      return;
    }
    try {
      const response = await apiRequest(`/personas/${id}/`, { method: 'DELETE' });
      if (response.ok) {
        showToast('Persona eliminada exitosamente', 'success');
        // Reload (go to page 1 if current page had only 1 item)
        const newPage = personas.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
        setCurrentPage(newPage);
        loadPersonas(newPage, itemsPerPage, searchTerm, filterActivo, true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast('Error al eliminar la persona: ' + (errorData.detail || response.statusText), 'error');
      }
    } catch (error) {
      showToast('Error de red al eliminar la persona', 'error');
    }
  };

  const handleSavePerson = async (personData: Omit<Person, 'id'>) => {
    try {
      if (formMode === 'edit' && selectedPerson) {
        const payload = {
          nombre: `${personData.nombre} ${personData.apellido}`.trim(),
          email: personData.email,
          telefono: personData.telefono,
          activo: personData.estado === 'activo',
          foto: personData.foto,
          roles: personData.roles,
          requiere_salida: personData.requiere_salida || false
        };
        const response = await apiRequest(`/personas/${selectedPerson.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          const updatedPersonFromBE = await response.json();
          const transformed = transformPersona(updatedPersonFromBE);
          setPersonas(prev => prev.map(p => p.id === transformed.id ? transformed : p));
          setIsFormOpen(false);
          showToast('Cambios guardados exitosamente', 'success');
        } else {
          const errorData = await response.json().catch(() => ({}));
          let errorMsg = 'Error al guardar los cambios';
          if (errorData.nombre) errorMsg += ` - Nombre: ${errorData.nombre[0]}`;
          if (errorData.idPersona) errorMsg += ` - ID: ${errorData.idPersona[0]}`;
          if (errorData.roles) errorMsg += ` - Roles inválidos`;
          if (errorData.detail) errorMsg += ` - ${errorData.detail}`;
          if (errorData.error) errorMsg = errorData.error;
          showToast(errorMsg, 'error');
        }
      }
    } catch (error) {
      showToast('Error de red al guardar la persona. Verificá tu conexión.', 'error');
    }
  };

  const handleEditFromDetails = (person: Person) => {
    setFormMode('edit');
    setSelectedPerson(person);
    setIsFormOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));

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
        onDeleteBatch={handleDeleteBatch}
        onView={handleViewPerson}
        onSyncDevice={handleSyncDevice}
        conflictos={conflictos}
        onResolveConflict={(person, conflictoId) => {
          const conf = conflictos.find(c => c.idConflicto === conflictoId);
          if (conf) setResolvingConflict(conf);
        }}
        // Server-side pagination props
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalRecords}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        // Server-side filter props
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        filterActivo={filterActivo}
        onFilterActivoChange={handleFilterActivoChange}
      />

      {resolvingConflict && (
        <ConflictoModal
          conflict={resolvingConflict}
          onClose={() => setResolvingConflict(null)}
          onResolved={() => {
            setResolvingConflict(null);
            window.dispatchEvent(new Event('conflictosUpdated'));
          }}
        />
      )}

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