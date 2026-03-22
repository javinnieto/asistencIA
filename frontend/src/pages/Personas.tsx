import React, { useState, useEffect, useCallback } from 'react';
import PersonasTable from '../components/PersonasTable';
import PersonaForm from '../components/PersonaForm';
import PersonaDetails from '../components/PersonaDetails';
import ConflictoModal from '../components/ConflictoModal';
import { apiRequest, getConflictos } from '../config/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import './Personas.css';
import './Asistencias.css'; // Reusing layout classes

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

  // Filters state (client-side for table)
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterCurso, setFilterCurso] = useState('');
  const [categorias, setCategorias] = useState<string[]>([]);
  const [cursosDisponibles, setCursosDisponibles] = useState<string[]>([]);

  // Conflicts State
  const [conflictos, setConflictos] = useState<any[]>([]);
  const [resolvingConflict, setResolvingConflict] = useState<any | null>(null);

  // Batch assign
  const [batchAssignIds, setBatchAssignIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Load category and courses filters dynamically
  useEffect(() => {
    const fetchFiltros = async () => {
      try {
        const [catRes, curRes] = await Promise.all([
          apiRequest('/tipos-persona/'),
          apiRequest('/cursos/')
        ]);
        if (catRes.ok) {
          const data = await catRes.json();
          const nombresCats = (data.results || data || []).map((t: any) => t.nombre);
          setCategorias(Array.from(new Set(nombresCats)).sort() as string[]);
        }
        if (curRes.ok) {
          const data = await curRes.json();
          const nombresCursos = (data.results || data || []).map((c: any) => c.nombre);
          setCursosDisponibles(Array.from(new Set(nombresCursos)).sort() as string[]);
        }
      } catch (e) {
        console.error('Error fetching filters', e);
      }
    };
    fetchFiltros();
  }, []);

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

  useEffect(() => {
    loadPersonas(currentPage, itemsPerPage, searchTerm, filterActivo);
  }, [currentPage, itemsPerPage, searchTerm, filterActivo]);

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
      setCurrentPage(1);
      loadPersonas(1, itemsPerPage, searchTerm, filterActivo, true);
    } catch (e) {
      console.error(e);
      showToast('Error de red al eliminar el lote.', 'error');
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
    if (!id) return;
    try {
      const response = await apiRequest(`/personas/${id}/`, { method: 'DELETE' });
      if (response.ok) {
        showToast('Persona eliminada exitosamente', 'success');
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
      } else {
        const payload = {
          nombre: `${personData.nombre} ${personData.apellido}`.trim(),
          email: personData.email,
          telefono: personData.telefono,
          activo: personData.estado === 'activo',
          foto: personData.foto,
          roles: personData.roles,
          requiere_salida: personData.requiere_salida || false
        };
        const response = await apiRequest(`/personas/`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          showToast('Persona agregada exitosamente', 'success');
          setIsFormOpen(false);
          loadPersonas(1, itemsPerPage, searchTerm, filterActivo, true);
          setCurrentPage(1);
        } else {
          const errorData = await response.json().catch(() => ({}));
          let errorMsg = 'Error al agregar persona';
          if (errorData.nombre) errorMsg += ` - Nombre: ${errorData.nombre[0]}`;
          if (errorData.idPersona) errorMsg += ` - ID: ${errorData.idPersona[0]}`;
          if (errorData.roles) errorMsg += ` - Roles inválidos`;
          if (errorData.detail) errorMsg += ` - ${errorData.detail}`;
          if (errorData.error) errorMsg = errorData.error;
          showToast(errorMsg, 'error');
        }
      }
    } catch (error) {
      showToast('Error de red al guardar la persona', 'error');
    }
  };

  const handleEditFromDetails = (person: Person) => {
    setFormMode('edit');
    setSelectedPerson(person);
    setIsFormOpen(true);
  };

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFilterActivo('');
    setFilterCategoria('');
    setFilterCurso('');
  };

  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));

  return (
    <div className="as-main-container personas-page">
      {/* Header & Controls identical to Asistencias */}
      <div className="as-header-controls" style={{ marginBottom: isLoading ? '16px' : '0' }}>
        <div className="as-title-group" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div className="personas-title-wrapper">
            <div className="as-title-bar-personas"></div>
            <h3 className="as-page-title m-0">Personas</h3>
            <span className="as-count-badge personas-count-badge" style={{ marginLeft: '8px' }}>{totalRecords} PERSONAS REGISTRADAS</span>
          </div>
          {(isAdmin || rol === 'guardia') && (
             <button
                onClick={handleSyncDevice}
                className="btn btn-primary d-flex align-items-center gap-2 as-btn-primary"
                title="Sincronizar Lector Espressif"
             >
                <i className="bi bi-cloud-download"></i>
                <span className="d-none d-md-inline">Sincronizar Dispositivo</span>
             </button>
          )}
        </div>

        <div className="as-filters-container personas-filters-container">
          {/* Row 1: Search */}
          <div className="as-filter-group search-group personas-search-group" style={{ flex: '2' }}>
            <div className="as-input-group w-100">
              <i className="bi bi-search as-input-icon"></i>
              <input
                type="text"
                className="as-input"
                placeholder="Buscar por nombre, ID, departamento..."
                value={searchTerm}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: Select Filters */}
          <div className="as-filter-group selects-group personas-selects-group" style={{ flex: '3' }}>
            <select
              className="as-select"
              value={filterActivo}
              onChange={e => handleFilterActivoChange(e.target.value)}
            >
              <option value="">Cualquier estado</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
            <select
              className="as-select"
              value={filterCategoria}
              onChange={e => setFilterCategoria(e.target.value)}
            >
              <option value="">Todas las Categorías</option>
              {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select
              className="as-select"
              value={filterCurso}
              onChange={e => setFilterCurso(e.target.value)}
            >
              <option value="">Todos los Cursos</option>
              {cursosDisponibles.map(curso => <option key={curso} value={curso}>{curso}</option>)}
            </select>

            {(searchTerm || filterActivo || filterCategoria || filterCurso) && (
              <button className="as-btn-reset" title="Limpiar filtros" onClick={limpiarFiltros}>
                <i className="bi bi-x-circle"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
           <div className="as-no-data" style={{ width: '100%', margin: '0' }}>
             <i className="bi bi-hourglass-split" style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem', opacity: 0.5 }}></i>
             Cargando personas...
           </div>
        </div>
      ) : (
        <div style={{ marginTop: '16px' }}>
          <PersonasTable
            personas={personas}
            onEdit={handleEditPerson}
            onDelete={handleDeletePerson}
            onDeleteBatch={handleDeleteBatch}
            onView={handleViewPerson}
            conflictos={conflictos}
            onResolveConflict={(person, conflictoId) => {
              const conf = conflictos.find(c => c.idConflicto === conflictoId);
              if (conf) setResolvingConflict(conf);
            }}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={totalRecords}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            filterActivo={filterActivo}
            onFilterActivoChange={handleFilterActivoChange}
            filterCategoria={filterCategoria}
            filterCurso={filterCurso}
          />
        </div>
      )}

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
