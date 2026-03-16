import React, { useState } from 'react';
import { apiRequest } from '../config/api';
import { useModalBackButton } from '../hooks/useModalBackButton';
import './CambiarPasswordModal.css';

interface CambiarPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CambiarPasswordModal: React.FC<CambiarPasswordModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [passwordActual, setPasswordActual] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    
    // Visibility toggles
    const [showActual, setShowActual] = useState(false);
    const [showNueva, setShowNueva] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Botón atrás del navegador/sistema cierra el modal
    useModalBackButton(isOpen, onClose);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!passwordActual) {
            setError('Debe ingresar su contraseña actual.');
            return;
        }
        if (nuevaPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (nuevaPassword !== confirmarPassword) {
            setError('Las contraseñas nuevas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            const res = await apiRequest('/usuarios/cambiar_mi_password/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password_actual: passwordActual,
                    nueva_password: nuevaPassword,
                    confirmar_password: confirmarPassword
                })
            });

            const data = await res.json();
            
            if (res.ok) {
                // Success
                setPasswordActual('');
                setNuevaPassword('');
                setConfirmarPassword('');
                onSuccess();
                onClose();
            } else {
                setError(data.error || 'Error al actualizar la contraseña.');
            }
        } catch (err) {
            console.error(err);
            setError('Ocurrió un error de red al intentar cambiar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="cpw-modal-overlay">
            <div className="cpw-modal-content">
                <div className="cpw-modal-header">
                    <h5 className="cpw-modal-title">
                        <i className="bi bi-key-fill text-warning me-2"></i>
                        Cambiar Contraseña
                    </h5>
                    <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="cpw-modal-body">
                        {error && (
                            <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                <div>{error}</div>
                            </div>
                        )}

                        <div className="form-group mb-3 position-relative">
                            <label className="form-label text-light">Contraseña Actual</label>
                            <div className="input-group">
                                <span className="input-group-text bg-dark border-secondary text-secondary">
                                    <i className="bi bi-lock-fill"></i>
                                </span>
                                <input
                                    type={showActual ? "text" : "password"}
                                    className="form-control bg-dark text-white border-secondary"
                                    placeholder="Ingrese contraseña actual"
                                    value={passwordActual}
                                    onChange={(e) => setPasswordActual(e.target.value)}
                                    required
                                />
                                <button 
                                    type="button" 
                                    className="btn btn-outline-secondary" 
                                    onClick={() => setShowActual(!showActual)}
                                    tabIndex={-1}
                                    title={showActual ? "Ocultar" : "Mostrar"}
                                >
                                    <i className={`bi bi-eye${showActual ? '-slash' : ''}`}></i>
                                </button>
                            </div>
                        </div>

                        <div className="form-group mb-3 position-relative">
                            <label className="form-label text-light">Nueva Contraseña</label>
                            <div className="input-group">
                                <span className="input-group-text bg-dark border-secondary text-secondary">
                                    <i className="bi bi-key"></i>
                                </span>
                                <input
                                    type={showNueva ? "text" : "password"}
                                    className="form-control bg-dark text-white border-secondary"
                                    placeholder="Al menos 6 caracteres"
                                    value={nuevaPassword}
                                    onChange={(e) => setNuevaPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <button 
                                    type="button" 
                                    className="btn btn-outline-secondary" 
                                    onClick={() => setShowNueva(!showNueva)}
                                    tabIndex={-1}
                                    title={showNueva ? "Ocultar" : "Mostrar"}
                                >
                                    <i className={`bi bi-eye${showNueva ? '-slash' : ''}`}></i>
                                </button>
                            </div>
                        </div>

                        <div className="form-group mb-2 position-relative">
                            <label className="form-label text-light">Confirmar Nueva Contraseña</label>
                            <div className="input-group">
                                <span className="input-group-text bg-dark border-secondary text-secondary">
                                    <i className="bi bi-check-circle"></i>
                                </span>
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    className={`form-control bg-dark text-white border-secondary ${nuevaPassword && confirmarPassword && nuevaPassword !== confirmarPassword ? 'is-invalid' : ''}`}
                                    placeholder="Repetir nueva contraseña"
                                    value={confirmarPassword}
                                    onChange={(e) => setConfirmarPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <button 
                                    type="button" 
                                    className="btn btn-outline-secondary" 
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    tabIndex={-1}
                                    title={showConfirm ? "Ocultar" : "Mostrar"}
                                >
                                    <i className={`bi bi-eye${showConfirm ? '-slash' : ''}`}></i>
                                </button>
                            </div>
                            {nuevaPassword && confirmarPassword && nuevaPassword !== confirmarPassword && (
                                <div className="text-danger small mt-1">
                                    Las contraseñas no coinciden
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="cpw-modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={loading}>
                            {loading ? (
                                <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...</>
                            ) : (
                                <><i className="bi bi-save"></i> Guardar Cambios</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CambiarPasswordModal;
