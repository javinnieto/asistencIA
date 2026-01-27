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
    isLoading = false
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [mounted, setMounted] = useState(false);

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
                        disabled={isLoading}
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
