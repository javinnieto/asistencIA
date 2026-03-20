import React, { useState, useEffect } from 'react';
import { apiRequest } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useModalBackButton } from '../hooks/useModalBackButton';
import TablePagination from '../components/TablePagination';
import './Usuarios.css';

interface Usuario {
    id: number;
    username: string;
    email: string;
    is_staff: boolean;
    is_superuser: boolean;
    is_active: boolean;
    date_joined: string;
    cursos_profesor?: number[];
}

interface ModalState {
    open: boolean;
    mode: 'crear' | 'editar';
    user: Partial<Usuario> & { password?: string };
}

const initModal = (): ModalState => ({
    open: false,
    mode: 'crear',
    user: { username: '', email: '', is_staff: false, is_superuser: false, is_active: true, password: '', cursos_profesor: [] },
});

const Usuarios: React.FC = () => {
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<ModalState>(initModal());
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<Usuario | null>(null);
    const [cursosDisponibles, setCursosDisponibles] = useState<any[]>([]);

    // Paginación server-side
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // Botón atrás: cierra el modal de editar/crear usuario
    useModalBackButton(modal.open, () => setModal(initModal()));
    // Botón atrás: cierra el modal de confirmar borrado de usuario
    useModalBackButton(confirmDelete !== null, () => setConfirmDelete(null));

    const fetchUsuarios = async (page = currentPage, perPage = itemsPerPage) => {
        try {
            setLoading(true);
            const response = await apiRequest(`/usuarios/?page=${page}&page_size=${perPage}`);
            const data = await response.json();
            setUsuarios(data.results || []);
            setTotalRecords(data.count ?? 0);
        } catch {
            showToast('Error al cargar usuarios', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsuarios(currentPage, itemsPerPage); }, [currentPage, itemsPerPage]);
    
    useEffect(() => {
        const loadCursos = async () => {
            try {
                // Fetch all courses (may need pagination bypass if too many, but typically ok)
                const res = await apiRequest('/cursos/?page_size=100');
                const data = await res.json();
                setCursosDisponibles(data.results || []);
            } catch (err) {
                console.error("Error al cargar cursos disp", err);
            }
        };
        loadCursos();
    }, []);

    const openCrear = () => setModal({ ...initModal(), open: true });
    const openEditar = (u: Usuario) => setModal({
        open: true,
        mode: 'editar',
        user: { ...u, password: '' },
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { password, ...rest } = modal.user;
            const body: any = { ...rest };
            if (password && password.trim()) body.password = password;

            if (modal.mode === 'crear') {
                if (!password || password.trim().length < 4) {
                    showToast('La contraseña debe tener al menos 4 caracteres', 'error');
                    setSaving(false);
                    return;
                }
                body.password = password;
                await apiRequest('/usuarios/', { method: 'POST', body: JSON.stringify(body) });
                showToast('Usuario creado correctamente', 'success');
            } else {
                await apiRequest(`/usuarios/${rest.id}/`, { method: 'PATCH', body: JSON.stringify(body) });
                showToast('Usuario actualizado', 'success');
            }
            setModal(initModal());
            fetchUsuarios();
        } catch (err: any) {
            showToast(err?.toString() || 'Error al guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await apiRequest(`/usuarios/${confirmDelete.id}/`, { method: 'DELETE' });
            showToast('Usuario eliminado', 'success');
            setConfirmDelete(null);
            fetchUsuarios();
        } catch (err: any) {
            showToast(err?.toString() || 'No se pudo eliminar', 'error');
        }
    };

    return (
        <div className="usr-container">
            {/* Header */}
            <div className="usr-header">
                <h2>
                    <i className="bi bi-person-lock" />
                    Gestión de Usuarios
                </h2>
                <button className="usr-btn-new" onClick={openCrear}>
                    <i className="bi bi-plus-lg" /> Nuevo Usuario
                </button>
            </div>

            {/* Tabla */}
            <div className="usr-table-wrap">
                {loading ? (
                    <div className="usr-empty">
                        <i className="bi bi-arrow-repeat" style={{ fontSize: '2rem', marginBottom: 12, display: 'block', animation: 'spin 1s linear infinite' }} />
                        Cargando usuarios…
                    </div>
                ) : usuarios.length === 0 ? (
                    <div className="usr-empty">
                        <i className="bi bi-people" style={{ fontSize: '2rem', marginBottom: 12, display: 'block', opacity: 0.4 }} />
                        No hay usuarios registrados.
                    </div>
                ) : (
                    <table className="usr-table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map(u => {
                                const isSelf = u.username === currentUser;
                                return (
                                    <tr key={u.id}>
                                        <td>
                                            <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{u.username}</span>
                                            {isSelf && <span className="usr-self-tag">tú</span>}
                                            {u.email && (
                                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{u.email}</div>
                                            )}
                                        </td>
                                        <td>
                                            {u.is_superuser ? (
                                                <span className="usr-badge admin"><i className="bi bi-shield-lock-fill" /> Administrador</span>
                                            ) : u.is_staff ? (
                                                <span className="usr-badge guardia"><i className="bi bi-person-badge-fill" /> Guardia</span>
                                            ) : (u.cursos_profesor && u.cursos_profesor.length > 0) ? (
                                                <span className="usr-badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                                                    <i className="bi bi-person-workspace" /> Profesor
                                                </span>
                                            ) : (
                                                <span className="usr-badge lectura"><i className="bi bi-eye-fill" /> Solo Lectura</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`usr-badge ${u.is_active ? 'activo' : 'inactivo'}`}>
                                                {u.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="usr-actions">
                                                <button
                                                    className="usr-btn-icon"
                                                    title="Editar"
                                                    onClick={() => openEditar(u)}
                                                >
                                                    <i className="bi bi-pencil" />
                                                </button>
                                                {!isSelf && (
                                                    <button
                                                        className="usr-btn-icon danger"
                                                        title="Eliminar"
                                                        onClick={() => setConfirmDelete(u)}
                                                    >
                                                        <i className="bi bi-trash" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {!loading && usuarios.length > 0 && (
                    <div className="usr-pagination-container">
                        <TablePagination
                            currentPage={currentPage}
                            totalPages={Math.max(1, Math.ceil(totalRecords / itemsPerPage))}
                            onPageChange={setCurrentPage}
                            itemsPerPage={itemsPerPage}
                            onItemsPerPageChange={(newCount) => {
                                setItemsPerPage(newCount);
                                setCurrentPage(1);
                            }}
                            totalItems={totalRecords}
                        />
                    </div>
                )}
            </div>

            {/* Modal crear/editar */}
            {modal.open && (
                <div className="usr-modal-overlay" onMouseDown={(e) => { if(e.target === e.currentTarget) setModal(initModal()); }}>
                    <div className="usr-modal" onClick={e => e.stopPropagation()}>
                        <form onSubmit={handleSave}>
                            <div className="usr-modal-header">
                                <h3>
                                    <i className={`bi ${modal.mode === 'crear' ? 'bi-person-plus' : 'bi-person-gear'}`} style={{ marginRight: 8, color: '#6366f1' }} />
                                    {modal.mode === 'crear' ? 'Nuevo Usuario' : 'Editar Usuario'}
                                </h3>
                                <button type="button" onClick={() => setModal(initModal())}><i className="bi bi-x-lg" /></button>
                            </div>

                            <div className="usr-form-group">
                                <label>Nombre de usuario</label>
                                <input
                                    type="text"
                                    value={modal.user.username || ''}
                                    onChange={e => setModal(m => ({ ...m, user: { ...m.user, username: e.target.value } }))}
                                    required
                                    autoFocus
                                    placeholder="ej: jsmith"
                                />
                            </div>

                            <div className="usr-form-group">
                                <label>Email (opcional)</label>
                                <input
                                    type="email"
                                    value={modal.user.email || ''}
                                    onChange={e => setModal(m => ({ ...m, user: { ...m.user, email: e.target.value } }))}
                                    placeholder="ej: j@isae.edu.ar"
                                />
                            </div>

                            <div className="usr-form-group">
                                <label>
                                    {modal.mode === 'crear' ? 'Contraseña' : 'Nueva contraseña'}
                                </label>
                                <input
                                    type="password"
                                    value={modal.user.password || ''}
                                    onChange={e => setModal(m => ({ ...m, user: { ...m.user, password: e.target.value } }))}
                                    placeholder={modal.mode === 'editar' ? 'Dejar vacío para no cambiar' : ''}
                                    required={modal.mode === 'crear'}
                                />
                                {modal.mode === 'editar' && (
                                    <div className="usr-hint" style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#64748b' }}>Si lo dejás vacío, la contraseña no cambia.</div>
                                )}
                            </div>

                            <div className="usr-form-group">
                                <label>Rol</label>
                                <select
                                    value={modal.user.is_superuser ? 'admin' : (modal.user.is_staff ? 'guardia' : ((modal.user.cursos_profesor && modal.user.cursos_profesor.length > 0) ? 'profesor' : 'lectura'))}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const admin = val === 'admin';
                                        const guardia = val === 'guardia';
                                        setModal(m => ({
                                            ...m,
                                            user: { 
                                                ...m.user, 
                                                is_superuser: admin, 
                                                is_staff: admin || guardia,
                                                cursos_profesor: (admin || guardia || val === 'lectura') ? [] : m.user.cursos_profesor 
                                            }
                                        }))
                                    }}
                                >
                                    <option value="lectura">Solo Lectura (Ver info solamente)</option>
                                    <option value="profesor">Profesor (Lectura + Editar cursos asignados)</option>
                                    <option value="guardia">Guardia (Carga de Asistencias y ABM Básico)</option>
                                    <option value="admin">Administrador (Acceso total)</option>
                                </select>
                            </div>

                            {!modal.user.is_superuser && !modal.user.is_staff && (
                                <div className="usr-form-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <label style={{ margin: 0 }}>Cursos Asignados</label>
                                        <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 600 }}>
                                            {modal.user.cursos_profesor?.length || 0} seleccionados
                                        </span>
                                    </div>
                                    <div className="usr-cursos-list">
                                        {cursosDisponibles.map(c => {
                                            const isSelected = modal.user.cursos_profesor?.includes(c.idCurso);
                                            return (
                                                <label key={c.idCurso} className={`usr-curso-item ${isSelected ? 'selected' : ''}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected || false}
                                                        onChange={(e) => {
                                                            const isChecked = e.target.checked;
                                                            setModal(m => {
                                                                const current = m.user.cursos_profesor || [];
                                                                return {
                                                                    ...m,
                                                                    user: {
                                                                        ...m.user,
                                                                        cursos_profesor: isChecked 
                                                                            ? [...current, c.idCurso]
                                                                            : current.filter(id => id !== c.idCurso)
                                                                    }
                                                                };
                                                            });
                                                        }}
                                                    />
                                                    <span className="usr-curso-name">{c.nombre}</span>
                                                    {(c.institucion?.siglas || c.institucion?.nombre) && (
                                                        <span className="usr-curso-inst">{c.institucion.siglas || c.institucion.nombre}</span>
                                                    )}
                                                </label>
                                            );
                                        })}
                                        {cursosDisponibles.length === 0 && (
                                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                                                <i className="bi bi-info-circle" style={{ display: 'block', marginBottom: '8px', fontSize: '1.2rem' }}></i>
                                                No hay cursos disponibles para asignar.
                                            </div>
                                        )}
                                    </div>
                                    <p className="usr-hint" style={{ marginTop: '0.6rem' }}>
                                        Marcá los cursos para otorgar permisos de edición sobre ellos.
                                    </p>
                                </div>
                            )}

                            <div className="usr-form-group">
                                <label>Estado</label>
                                <select
                                    value={modal.user.is_active ? 'activo' : 'inactivo'}
                                    onChange={e => setModal(m => ({ ...m, user: { ...m.user, is_active: e.target.value === 'activo' } }))}
                                >
                                    <option value="activo">Activo</option>
                                    <option value="inactivo">Inactivo (no puede iniciar sesión)</option>
                                </select>
                            </div>

                            <div className="usr-modal-actions">
                                <button type="button" className="usr-btn-cancel" onClick={() => setModal(initModal())}>
                                    Cancelar
                                </button>
                                <button type="submit" className="usr-btn-save" disabled={saving}>
                                    {saving ? <><i className="bi bi-arrow-repeat" /> Guardando…</> : <><i className="bi bi-check-lg" /> Guardar</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm delete */}
            {confirmDelete && (
                <div className="usr-modal-overlay" onMouseDown={(e) => { if(e.target === e.currentTarget) setConfirmDelete(null); }}>
                    <div className="usr-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
                        <div className="usr-modal-header">
                            <h3 style={{ color: '#f87171' }}>
                                <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 8 }} />
                                Eliminar usuario
                            </h3>
                            <button onClick={() => setConfirmDelete(null)}><i className="bi bi-x-lg" /></button>
                        </div>
                        <p style={{ color: '#94a3b8', margin: '0 0 24px' }}>
                            ¿Estás seguro que querés eliminar al usuario <strong style={{ color: '#f1f5f9' }}>{confirmDelete.username}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="usr-modal-actions">
                            <button className="usr-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                            <button
                                className="usr-btn-save"
                                style={{ background: '#ef4444' }}
                                onClick={handleDelete}
                            >
                                <i className="bi bi-trash" /> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Usuarios;
