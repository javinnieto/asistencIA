import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import './ConfirmModal.css';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
    requireDoubleConfirmText?: string; // Nuevo: texto exacto que el usuario debe tipear para confirmar
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'danger',
    isLoading = false,
    requireDoubleConfirmText
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [confirmationInput, setConfirmationInput] = useState(''); // Estado para el texto ingresado

    // Resetear el input al abrir/cerrar
    useEffect(() => {
        if (isOpen) {
            setConfirmationInput('');
        }
    }, [isOpen]);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!mounted) return null;
    if (!isVisible && !isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return <i className="bi bi-exclamation-triangle-fill text-red-500 text-3xl"></i>;
            case 'warning': return <i className="bi bi-exclamation-circle-fill text-yellow-500 text-3xl"></i>;
            case 'info': return <i className="bi bi-info-circle-fill text-blue-500 text-3xl"></i>;
        }
    };

    const confirmBtnClass = type === 'danger' ? 'btn-confirm-danger' :
        type === 'warning' ? 'btn-confirm-warning' : 'btn-confirm-info';

    const modalContent = (
        <div className={`confirm-modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} style={{ pointerEvents: 'auto' }}>
            <div className={`confirm-modal-content ${isOpen ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
                <div className="confirm-modal-icon-wrapper">
                    {getIcon()}
                </div>

                <h3 className="confirm-modal-title">{title}</h3>
                <p className="confirm-modal-message">{message}</p>

                {requireDoubleConfirmText && (
                    <div className="confirm-modal-validation">
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', marginTop: '16px' }}>
                            Por favor escriba <strong>{requireDoubleConfirmText}</strong> para confirmar:
                        </p>
                        <input
                            type="text"
                            value={confirmationInput}
                            onChange={(e) => setConfirmationInput(e.target.value)}
                            onPaste={(e) => e.preventDefault()} // Prevenir pegar para forzar a tipear
                            className="form-control text-center"
                            placeholder={requireDoubleConfirmText}
                            style={{
                                background: 'rgba(15, 23, 42, 0.5)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px',
                                fontWeight: 'bold'
                            }}
                        />
                    </div>
                )}

                <div className="confirm-modal-actions">
                    <button
                        className="btn-cancel"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`btn-confirm ${confirmBtnClass}`}
                        onClick={() => {
                            if (!isLoading) onConfirm();
                        }}
                        disabled={isLoading || (requireDoubleConfirmText ? confirmationInput !== requireDoubleConfirmText : false)}
                    >
                        {isLoading ? <span className="spinner-mini"></span> : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default ConfirmModal;
